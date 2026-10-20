import asyncio
from sqlalchemy import text
from app.database import engine


async def check():
    async with engine.connect() as conn:
        for table in ["trips", "conductors", "trip_waypoints", "vehicles"]:
            r = await conn.execute(
                text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name = :t ORDER BY ordinal_position"
                ),
                {"t": table},
            )
            cols = [row[0] for row in r]
            print(f"{table}: {cols}")


if __name__ == "__main__":
    asyncio.run(check())