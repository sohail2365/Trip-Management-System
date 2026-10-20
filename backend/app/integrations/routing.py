"""
Route & Distance integration.

Uses:
- Nominatim (OpenStreetMap) for geocoding — city name → coordinates
- OSRM (Open Source Routing Machine) for distance & ETA

Both are FREE and require NO API key.
"""
import asyncio
import httpx
from typing import Optional
from datetime import datetime, timedelta

# Simple in-memory cache (learning purpose)
_geocode_cache: dict[str, tuple[float, float]] = {}
_route_cache: dict[str, dict] = {}

# Nominatim requires a User-Agent header
NOMINATIM_BASE = "https://nominatim.openstreetmap.org"
OSRM_BASE = "http://router.project-osrm.org"

NOMINATIM_HEADERS = {
    "User-Agent": "TMS-Backend/1.0 (transport management system)",
    "Accept-Language": "en",
}


async def geocode(city_name: str, country: str = "Pakistan") -> Optional[tuple[float, float]]:
    """
    City name → (lat, lng).
    Returns None if not found.
    """
    key = f"{city_name.lower().strip()}|{country.lower()}"
    if key in _geocode_cache:
        return _geocode_cache[key]

    query = f"{city_name}, {country}" if country else city_name
    params = {
        "q": query,
        "format": "json",
        "limit": 1,
    }

    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(
            f"{NOMINATIM_BASE}/search",
            params=params,
            headers=NOMINATIM_HEADERS,
        )
        r.raise_for_status()
        data = r.json()

    if not data:
        return None

    lat = float(data[0]["lat"])
    lng = float(data[0]["lon"])
    _geocode_cache[key] = (lat, lng)
    return (lat, lng)


async def get_route(
    source_coords: tuple[float, float],
    dest_coords: tuple[float, float],
    waypoints: list[tuple[float, float]] | None = None,
) -> dict:
    """
    Coordinates → distance + ETA.
    Coords are (lat, lng).
    Returns { distance_km, eta_hours, polyline }
    """
    waypoints = waypoints or []

    # Cache key
    cache_key = f"{source_coords}|{dest_coords}|{waypoints}"
    if cache_key in _route_cache:
        return _route_cache[cache_key]

    # OSRM expects lng,lat order
    coords = [source_coords, *waypoints, dest_coords]
    coord_str = ";".join(f"{lng},{lat}" for lat, lng in coords)

    url = f"{OSRM_BASE}/route/v1/driving/{coord_str}"
    params = {
        "overview": "full",
        "geometries": "polyline",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(url, params=params)
        r.raise_for_status()
        data = r.json()

    if data.get("code") != "Ok" or not data.get("routes"):
        raise ValueError("OSRM ne route nahi diya")

    route = data["routes"][0]
    result = {
        "distance_km": round(route["distance"] / 1000, 2),
        "eta_hours": round(route["duration"] / 3600, 2),
        "polyline": route.get("geometry"),
    }
    _route_cache[cache_key] = result
    return result


async def calculate_route(
    source: str,
    destination: str,
    waypoints: list[str] | None = None,
    country: str = "Pakistan",
) -> dict:
    """
    High-level: source city name → distance + ETA.
    Handles geocoding + routing.
    """
    waypoints = waypoints or []

    # Geocode all in parallel
    tasks = [geocode(source, country), geocode(destination, country)]
    tasks += [geocode(w, country) for w in waypoints]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Check results
    failed = []
    coords = []
    names = [source, *waypoints, destination]

    for i, res in enumerate(results):
        if isinstance(res, Exception) or res is None:
            failed.append(names[i])
        else:
            coords.append(res)

    if failed:
        raise ValueError(f"Ye jagah nahi mili: {', '.join(failed)}")

    source_coords = coords[0]
    dest_coords = coords[-1]
    waypoint_coords = coords[1:-1]

    route = await get_route(source_coords, dest_coords, waypoint_coords)

    return {
        "source": source,
        "destination": destination,
        "waypoints": waypoints,
        "source_coords": {"lat": source_coords[0], "lng": source_coords[1]},
        "destination_coords": {"lat": dest_coords[0], "lng": dest_coords[1]},
        "waypoint_coords": [
            {"name": waypoints[i], "lat": c[0], "lng": c[1]}
            for i, c in enumerate(waypoint_coords)
        ],
        "distance_km": route["distance_km"],
        "eta_hours": route["eta_hours"],
        "polyline": route["polyline"],
    }