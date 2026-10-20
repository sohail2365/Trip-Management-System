"""
Background scheduler for daily tasks.

Currently: diesel rate auto-fetch.
Runs every 6 hours. If today's rate already exists, skips.
"""
import asyncio
from datetime import date

from sqlalchemy import select

from app.database import SessionLocal
from app.models import FuelRate
from app.integrations.fuel_scraper import fetch_diesel_rate

# How often to check (in seconds)
CHECK_INTERVAL = 6 * 60 * 60  # 6 hours
INITIAL_DELAY = 10  # Start 10 sec after startup


async def _auto_fetch_fuel_rate():
    """Aaj ka rate nahi hai to OGRA se fetch karo."""
    today = date.today()

    async with SessionLocal() as db:
        result = await db.execute(
            select(FuelRate).where(FuelRate.rate_date == today)
        )
        existing = result.scalar_one_or_none()

        if existing:
            print(f"ℹ️  Diesel rate for {today} already exists: {existing.rate_pkr} ({existing.source})")
            return

        print(f"⛽ No diesel rate for {today}, attempting auto-fetch...")
        rate, err = await fetch_diesel_rate()

        if rate is None:
            print(f"⚠️  Auto-fetch failed: {err}")
            print(f"   Admin can set manually via POST /api/fuel/rate")
            return

        db.add(FuelRate(rate_date=today, rate_pkr=rate, source="auto"))
        await db.commit()
        print(f"✅ Auto-fetched diesel rate for {today}: PKR {rate}")


async def fuel_rate_loop():
    """Runs forever. Checks every CHECK_INTERVAL seconds."""
    await asyncio.sleep(INITIAL_DELAY)

    while True:
        try:
            await _auto_fetch_fuel_rate()
        except Exception as e:
            print(f"❌ Fuel rate scheduler error: {type(e).__name__}: {e}")

        await asyncio.sleep(CHECK_INTERVAL)


def start_background_tasks() -> asyncio.Task:
    """Called from lifespan. Returns the task (so we can cancel on shutdown)."""
    return asyncio.create_task(fuel_rate_loop())