"""
Diesel rate auto-fetch.

Primary source: PSO (Pakistan State Oil) — psopk.com
Fallback: OGRA (may not work due to JS rendering)

Returns None on failure — caller should fallback to manual.
"""
import re
import httpx
from bs4 import BeautifulSoup

# Reasonable diesel price range in Pakistan (PKR per litre)
MIN_RATE = 150.0
MAX_RATE = 600.0

PSO_URL = "https://psopk.com/en/fuels/fuel-prices"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def _extract_rate_from_text(text: str) -> float | None:
    """Text mein se pehla number nikalo jo diesel rate range mein aaye."""
    pattern = r"(\d{2,4}(?:\.\d{1,2})?)"
    for match in re.finditer(pattern, text):
        try:
            val = float(match.group(1))
            if MIN_RATE <= val <= MAX_RATE:
                return val
        except ValueError:
            continue
    return None


def _parse_pso_html(html: str) -> float | None:
    """
    PSO page parse karke Hi-Cetane Diesel rate nikalo.

    Structure (approx):
    - Product name with "Hi-Cetane" or "Diesel"
    - Rate displayed as "Rs.XXX.XX/Ltr" or similar
    """
    soup = BeautifulSoup(html, "html.parser")

    diesel_pattern = re.compile(
        r"(hi[-\s]?cetane|hsd|diesel)", re.IGNORECASE
    )
    rate_pattern = re.compile(r"Rs\.?\s*([\d,]+(?:\.\d{1,2})?)", re.IGNORECASE)

    candidates = []

    # Strategy 1: Find the string "Hi-Cetane Diesel" and grab nearby rate
    for text_node in soup.find_all(string=diesel_pattern):
        node = text_node
        # Traverse up to 3 parents to find container with both name + rate
        for _ in range(4):
            if node.parent:
                node = node.parent
            container_text = node.get_text(" ", strip=True)
            if rate_pattern.search(container_text):
                # Extract rate from this container
                matches = rate_pattern.findall(container_text)
                for m in matches:
                    try:
                        val = float(m.replace(",", ""))
                        if MIN_RATE <= val <= MAX_RATE:
                            candidates.append(val)
                            break
                    except ValueError:
                        continue
                if candidates:
                    break

    # Strategy 2: Look in table rows
    for table in soup.find_all("table"):
        for row in table.find_all("tr"):
            cells = row.find_all(["td", "th"])
            row_text = row.get_text(" ", strip=True)
            if diesel_pattern.search(row_text):
                # Try all cells for rate
                for cell in cells:
                    matches = rate_pattern.findall(cell.get_text(" ", strip=True))
                    for m in matches:
                        try:
                            val = float(m.replace(",", ""))
                            if MIN_RATE <= val <= MAX_RATE:
                                candidates.append(val)
                        except ValueError:
                            continue

    # Strategy 3: Search whole page for "diesel" section
    if not candidates:
        body = soup.get_text(" ", strip=True)
        # Find "diesel" mention, take next 500 chars, find rate
        for m in diesel_pattern.finditer(body):
            start = m.start()
            chunk = body[start : start + 500]
            rate = _extract_rate_from_text(chunk)
            if rate is not None:
                candidates.append(rate)

    if not candidates:
        return None

    # Return most common (mode) or first
    from statistics import mode
    try:
        return float(mode(candidates))
    except Exception:
        return candidates[0]


async def fetch_diesel_rate() -> tuple[float | None, str | None]:
    """
    Returns (rate, error_message).
    Success: (395.85, None)
    Failure: (None, "reason")
    """
    try:
        async with httpx.AsyncClient(
            timeout=25, follow_redirects=True, headers=HEADERS
        ) as client:
            r = await client.get(PSO_URL)
            r.raise_for_status()

            rate = _parse_pso_html(r.text)
            if rate is not None:
                return rate, None

            # Debug info
            return None, (
                f"PSO page load hua ({len(r.text)} bytes) lekin diesel rate nahi mila. "
                f"Site structure change ho sakti hai."
            )
    except httpx.TimeoutException:
        return None, "PSO site timeout"
    except httpx.HTTPStatusError as e:
        return None, f"PSO HTTP {e.response.status_code}"
    except Exception as e:
        return None, f"{type(e).__name__}: {e}"


async def debug_fetch() -> dict:
    """
    Debug — PSO page se kya extract ho raha hai wo dikhao.
    """
    info = {"url": PSO_URL}

    try:
        async with httpx.AsyncClient(
            timeout=25, follow_redirects=True, headers=HEADERS
        ) as client:
            r = await client.get(PSO_URL)
            html = r.text
            soup = BeautifulSoup(html, "html.parser")

            # Find diesel mentions
            diesel_pattern = re.compile(r"(hi[-\s]?cetane|hsd|diesel)", re.IGNORECASE)
            diesel_nodes = soup.find_all(string=diesel_pattern)

            samples = []
            for n in diesel_nodes[:8]:
                parent = n.parent
                samples.append({
                    "text": str(n)[:150],
                    "parent_tag": parent.name if parent else None,
                    "parent_text": parent.get_text(" ", strip=True)[:300] if parent else "",
                })

            # Extract actual rate
            rate = _parse_pso_html(html)

            info.update({
                "status": r.status_code,
                "html_size": len(html),
                "diesel_mentions": len(diesel_nodes),
                "diesel_nodes": samples,
                "extracted_rate": rate,
                "body_preview": soup.get_text(" ", strip=True)[:2000],
            })
    except Exception as e:
        info["error"] = f"{type(e).__name__}: {e}"

    return info


# Legacy OGRA functions (kept for reference, not used by default)
OGRA_URLS = [
    "https://ogra.org.pk/notified-petroleum-prices",
    "https://ogra.org.pk/price-publications",
]


async def fetch_ogra_rate() -> tuple[float | None, str | None]:
    """OGRA fallback (likely won't work due to JS)."""
    try:
        async with httpx.AsyncClient(
            timeout=20, follow_redirects=True, headers=HEADERS
        ) as client:
            for url in OGRA_URLS:
                try:
                    r = await client.get(url)
                    rate = _parse_pso_html(r.text)  # same parser
                    if rate is not None:
                        return rate, None
                except Exception:
                    continue
        return None, "OGRA se rate nahi mila"
    except Exception as e:
        return None, f"{type(e).__name__}: {e}"