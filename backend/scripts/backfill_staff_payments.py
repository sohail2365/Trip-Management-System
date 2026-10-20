"""
Backfill: existing trips ke driver/conductor salaries ko staff_payments mein daalo.
Chalao (ek baar): python -m scripts.backfill_staff_payments
"""
import asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import SessionLocal
from app.models import Trip, StaffPayment


async def main():
    async with SessionLocal() as db:
        result = await db.execute(
            select(Trip).options(selectinload(Trip.vehicles))
        )
        trips = result.scalars().all()

        created = 0
        for trip in trips:
            for tv in trip.vehicles:
                # Driver
                if float(tv.salary) > 0:
                    existing = await db.execute(
                        select(StaffPayment).where(
                            StaffPayment.trip_id == trip.id,
                            StaffPayment.staff_type == "driver",
                            StaffPayment.staff_id == tv.driver_id,
                        )
                    )
                    if not existing.scalar_one_or_none():
                        db.add(StaffPayment(
                            staff_type="driver",
                            staff_id=tv.driver_id,
                            payment_date=trip.travel_date,
                            amount=float(tv.salary),
                            payment_method="trip",
                            notes=f"Trip #{trip.id}: {trip.source} → {trip.destination}",
                            trip_id=trip.id,
                            source="trip",
                        ))
                        created += 1

                # Conductor
                if tv.conductor_id and float(tv.conductor_salary) > 0:
                    existing = await db.execute(
                        select(StaffPayment).where(
                            StaffPayment.trip_id == trip.id,
                            StaffPayment.staff_type == "conductor",
                            StaffPayment.staff_id == tv.conductor_id,
                        )
                    )
                    if not existing.scalar_one_or_none():
                        db.add(StaffPayment(
                            staff_type="conductor",
                            staff_id=tv.conductor_id,
                            payment_date=trip.travel_date,
                            amount=float(tv.conductor_salary),
                            payment_method="trip",
                            notes=f"Trip #{trip.id}: {trip.source} → {trip.destination}",
                            trip_id=trip.id,
                            source="trip",
                        ))
                        created += 1

        await db.commit()
        print(f"✅ Backfill complete: {created} staff payments created")


if __name__ == "__main__":
    asyncio.run(main())