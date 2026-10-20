"""
Database migration script.
Chalao: python -m scripts.migrate
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.database import engine


MIGRATIONS = [
    # Vehicle: diary_number
    "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS diary_number VARCHAR(30) UNIQUE",
    "CREATE INDEX IF NOT EXISTS ix_vehicles_diary_number ON vehicles(diary_number)",

    # Trip: tour fields
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS tour_days INTEGER",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS tour_nights INTEGER",

    # Maintenance table
    """
    CREATE TABLE IF NOT EXISTS vehicle_maintenance (
        id SERIAL PRIMARY KEY,
        vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        maintenance_date DATE NOT NULL,
        maintenance_type VARCHAR(30) NOT NULL,
        description VARCHAR(500),
        amount NUMERIC(12, 2) NOT NULL,
        odometer_km INTEGER,
        vendor VARCHAR(100)
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_vehicle_maintenance_vehicle_id ON vehicle_maintenance(vehicle_id)",
    "CREATE INDEX IF NOT EXISTS ix_vehicle_maintenance_date ON vehicle_maintenance(maintenance_date)",

    # Receipt: travel_time, travel_day
    "ALTER TABLE receipts ADD COLUMN IF NOT EXISTS travel_time VARCHAR(20)",
    "ALTER TABLE receipts ADD COLUMN IF NOT EXISTS travel_day VARCHAR(15)",

    # Conductors table
    """
    CREATE TABLE IF NOT EXISTS conductors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        monthly_salary NUMERIC(12, 2) NOT NULL DEFAULT 0
    )
    """,

    # Trip Waypoints table
    """
    CREATE TABLE IF NOT EXISTS trip_waypoints (
        id SERIAL PRIMARY KEY,
        trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        stop_name VARCHAR(150) NOT NULL,
        order_no INTEGER NOT NULL,
        arrival_time VARCHAR(20)
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_trip_waypoints_trip_id ON trip_waypoints(trip_id)",

    # Trip: conductor_id + travel_time + travel_day + notes
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS conductor_id INTEGER REFERENCES conductors(id)",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS travel_time VARCHAR(20)",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS travel_day VARCHAR(15)",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS notes TEXT",

    # Trip: conductor_salary
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS conductor_salary NUMERIC(12, 2) DEFAULT 0",

    # Settings: shift extra charges
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS day_shift_extra NUMERIC(12, 2) DEFAULT 0",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS night_shift_extra NUMERIC(12, 2) DEFAULT 0",

    # Trip: shift_extra
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS shift_extra NUMERIC(12, 2) DEFAULT 0",

        # Staff payments table
    """
    CREATE TABLE IF NOT EXISTS staff_payments (
        id SERIAL PRIMARY KEY,
        staff_type VARCHAR(20) NOT NULL,
        staff_id INTEGER NOT NULL,
        payment_date DATE NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        payment_method VARCHAR(20) DEFAULT 'cash',
        notes VARCHAR(500)
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_staff_payments_staff ON staff_payments(staff_type, staff_id)",
    "CREATE INDEX IF NOT EXISTS ix_staff_payments_date ON staff_payments(payment_date)",

        # Receipt: tour_days, tour_nights
    "ALTER TABLE receipts ADD COLUMN IF NOT EXISTS tour_days INTEGER",
    "ALTER TABLE receipts ADD COLUMN IF NOT EXISTS tour_nights INTEGER",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS is_round_trip BOOLEAN DEFAULT FALSE",

        # ═══════════════════════════════════════════════════════
    # CONVOY: Multiple vehicles per trip
    # ═══════════════════════════════════════════════════════

    # New table
    """
    CREATE TABLE IF NOT EXISTS trip_vehicles (
        id SERIAL PRIMARY KEY,
        trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
        driver_id INTEGER NOT NULL REFERENCES drivers(id),
        conductor_id INTEGER REFERENCES conductors(id),
        mileage_kmpl NUMERIC(8, 2) NOT NULL DEFAULT 4,
        diesel_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
        fuel_expense NUMERIC(12, 2) NOT NULL DEFAULT 0,
        salary NUMERIC(12, 2) NOT NULL DEFAULT 0,
        conductor_salary NUMERIC(12, 2) NOT NULL DEFAULT 0,
        order_no INTEGER NOT NULL DEFAULT 1
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_trip_vehicles_trip_id ON trip_vehicles(trip_id)",
    "CREATE INDEX IF NOT EXISTS ix_trip_vehicles_vehicle_id ON trip_vehicles(vehicle_id)",

    # Move existing trip vehicle data → trip_vehicles
    """
    INSERT INTO trip_vehicles (
        trip_id, vehicle_id, driver_id, conductor_id,
        mileage_kmpl, diesel_rate, fuel_expense, salary, conductor_salary, order_no
    )
    SELECT
        id, vehicle_id, driver_id, conductor_id,
        COALESCE(mileage_kmpl, 4),
        COALESCE(diesel_rate, 0),
        COALESCE(fuel_expense, 0),
        COALESCE(salary, 0),
        COALESCE(conductor_salary, 0),
        1
    FROM trips
    WHERE vehicle_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM trip_vehicles tv WHERE tv.trip_id = trips.id)
    """,

    # Make old Trip columns nullable (deprecated but safe to keep)
    "ALTER TABLE trips ALTER COLUMN vehicle_id DROP NOT NULL",
    "ALTER TABLE trips ALTER COLUMN driver_id DROP NOT NULL",
    "ALTER TABLE trips ALTER COLUMN mileage_kmpl DROP NOT NULL",
    "ALTER TABLE trips ALTER COLUMN diesel_rate DROP NOT NULL",
    "ALTER TABLE trips ALTER COLUMN fuel_expense DROP NOT NULL",
    "ALTER TABLE trips ALTER COLUMN salary DROP NOT NULL",
    "ALTER TABLE trips ALTER COLUMN conductor_id DROP NOT NULL",
    "ALTER TABLE trips ALTER COLUMN conductor_salary DROP NOT NULL",

        # Per-vehicle expenses (toll, allowance, extra)
    "ALTER TABLE trip_vehicles ADD COLUMN IF NOT EXISTS toll NUMERIC(12, 2) DEFAULT 0",
    "ALTER TABLE trip_vehicles ADD COLUMN IF NOT EXISTS allowance NUMERIC(12, 2) DEFAULT 0",
    "ALTER TABLE trip_vehicles ADD COLUMN IF NOT EXISTS extra NUMERIC(12, 2) DEFAULT 0",

        # Make deprecated trip columns nullable (convoy refactor)
    "ALTER TABLE trips ALTER COLUMN toll DROP NOT NULL",
    "ALTER TABLE trips ALTER COLUMN allowance DROP NOT NULL",
    "ALTER TABLE trips ALTER COLUMN extra DROP NOT NULL",
    "ALTER TABLE trips ALTER COLUMN salary DROP NOT NULL",
    "ALTER TABLE trips ALTER COLUMN conductor_salary DROP NOT NULL",
    "ALTER TABLE trips ALTER COLUMN fuel_expense DROP NOT NULL",
    "ALTER TABLE trips ALTER COLUMN mileage_kmpl DROP NOT NULL",
    "ALTER TABLE trips ALTER COLUMN diesel_rate DROP NOT NULL",
    "ALTER TABLE trips ALTER COLUMN vehicle_id DROP NOT NULL",
    "ALTER TABLE trips ALTER COLUMN driver_id DROP NOT NULL",
    "ALTER TABLE trips ALTER COLUMN conductor_id DROP NOT NULL",

        # Receipt: expand column lengths for convoy
    "ALTER TABLE receipts ALTER COLUMN bus_number TYPE VARCHAR(200)",
    "ALTER TABLE receipts ALTER COLUMN driver_name TYPE VARCHAR(500)",
    "ALTER TABLE receipts ALTER COLUMN driver_phone TYPE VARCHAR(500)",
    "ALTER TABLE receipts ALTER COLUMN driver_phone_alt TYPE VARCHAR(200)",
    "ALTER TABLE receipts ALTER COLUMN conductor_name TYPE VARCHAR(500)",
    "ALTER TABLE receipts ALTER COLUMN conductor_phone TYPE VARCHAR(500)",
    "ALTER TABLE receipts ALTER COLUMN conductor_phone_alt TYPE VARCHAR(200)",

        # Staff payments: trip linking + source
    "ALTER TABLE staff_payments ADD COLUMN IF NOT EXISTS trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE",
    "ALTER TABLE staff_payments ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual'",
    "CREATE INDEX IF NOT EXISTS ix_staff_payments_trip_id ON staff_payments(trip_id)",
]


async def main():
    print("🚀 Migration shuru...")
    async with engine.begin() as conn:
        for i, sql in enumerate(MIGRATIONS, 1):
            short = sql.strip().split("\n")[0][:60]
            print(f"  [{i}/{len(MIGRATIONS)}] {short}...")
            await conn.execute(text(sql))
    print("✅ Sab migrations chal gayin!")


if __name__ == "__main__":
    asyncio.run(main())