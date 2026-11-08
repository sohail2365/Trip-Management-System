from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.deps import current_user
from app.models import (
    Trip, TripVehicle, Client, Vehicle, Driver, Conductor, FuelRate, TripWaypoint, StaffPayment, Receipt
)
from app.schemas import TripIn, TripOut, TripSummary, TripUpdate

router = APIRouter(prefix="/trips", tags=["Trips"])

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

# Fuel markup — har litre par ye extra count hota hai (evaporation, misc loss)
FUEL_MARKUP_PER_LITRE = 2.0


def compute_day(date_obj: date) -> str:
    return DAY_NAMES[date_obj.weekday()]


async def get_effective_rate(db: AsyncSession) -> float:
    """Aaj ka OGRA rate + markup."""
    today = date.today()
    result = await db.execute(select(FuelRate).where(FuelRate.rate_date == today))
    rate = result.scalar_one_or_none()
    if not rate:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Aaj ({today}) ka diesel rate set nahi hai. Pehle /api/fuel/rate par POST karo.",
        )
    return round(rate.rate_pkr + FUEL_MARKUP_PER_LITRE, 2)


def calc_trip_profit(trip: Trip) -> float:
    """Trip ke saare vehicles ka total nikaal ke net profit."""
    total = 0.0
    for v in trip.vehicles:
        total += (
            float(v.fuel_expense)
            + float(v.salary)
            + float(v.conductor_salary)
            + float(v.toll)
            + float(v.allowance)
            + float(v.extra)
        )
    total += float(trip.shift_extra)

    return round(float(trip.client_rent) - total, 2)


async def _fetch_trip_full(db: AsyncSession, trip_id: int) -> Trip | None:
    result = await db.execute(
        select(Trip)
        .options(
            selectinload(Trip.waypoints),
            selectinload(Trip.vehicles),
        )
        .where(Trip.id == trip_id)
    )
    return result.scalar_one_or_none()

async def _sync_staff_payments(db: AsyncSession, trip: Trip):
    """
    Trip ke saare vehicles ke driver/conductor salaries ke liye
    staff_payments entries banao. Purane (is trip ke) delete karo pehle.
    """
    # Delete existing trip-linked payments
    await db.execute(
        delete(StaffPayment).where(StaffPayment.trip_id == trip.id)
    )
    await db.flush()

    # Create new
    for tv in trip.vehicles:
        # Driver
        if float(tv.salary) > 0:
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

        # Conductor
        if tv.conductor_id and float(tv.conductor_salary) > 0:
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

    await db.flush()


# ═══════════════════════════════════════════════════════
# CREATE
# ═══════════════════════════════════════════════════════

@router.post("", response_model=TripOut, status_code=201)
async def create_trip(
    payload: TripIn,
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    if not await db.get(Client, payload.client_id):
        raise HTTPException(404, "Client nahi mila")

    if not payload.vehicles:
        raise HTTPException(400, "Kam az kam ek vehicle zaroori hai")

    for i, v in enumerate(payload.vehicles):
        if not await db.get(Vehicle, v.vehicle_id):
            raise HTTPException(404, f"Vehicle #{i+1} nahi mila")
        if not await db.get(Driver, v.driver_id):
            raise HTTPException(404, f"Driver #{i+1} nahi mila")
        if v.conductor_id and not await db.get(Conductor, v.conductor_id):
            raise HTTPException(404, f"Conductor #{i+1} nahi mila")

    rate = await get_effective_rate(db)
    day = payload.travel_day or compute_day(payload.travel_date)

    trip_data = payload.model_dump(exclude={"waypoints", "vehicles"})
    trip_data["travel_day"] = day

    trip = Trip(**trip_data)
    db.add(trip)
    await db.flush()

    for idx, wp in enumerate(payload.waypoints or [], start=1):
        db.add(TripWaypoint(
            trip_id=trip.id,
            stop_name=wp.stop_name,
            order_no=idx,
            arrival_time=wp.arrival_time,
        ))

    for idx, v in enumerate(payload.vehicles, start=1):
        litres = payload.distance_km / v.mileage_kmpl
        fuel = round(litres * rate, 2)
        db.add(TripVehicle(
            trip_id=trip.id,
            vehicle_id=v.vehicle_id,
            driver_id=v.driver_id,
            conductor_id=v.conductor_id,
            mileage_kmpl=v.mileage_kmpl,
            diesel_rate=rate,
            fuel_expense=fuel,
            salary=v.salary,
            conductor_salary=v.conductor_salary,
            toll=v.toll,
            allowance=v.allowance,
            extra=v.extra,
            order_no=idx,
        ))

    await db.flush()

    trip = await _fetch_trip_full(db, trip.id)
    trip.net_profit = calc_trip_profit(trip)

    await _sync_staff_payments(db, trip)

    await db.commit()

    trip = await _fetch_trip_full(db, trip.id)
    return trip

# ═══════════════════════════════════════════════════════
# LIST
# ═══════════════════════════════════════════════════════

@router.get("", response_model=list[TripOut])
async def list_trips(
    status_filter: str | None = None,
    client_id: int | None = None,
    vehicle_id: int | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    query = select(Trip).options(
        selectinload(Trip.waypoints),
        selectinload(Trip.vehicles),
    )
    if status_filter:
        query = query.where(Trip.status == status_filter)
    if client_id:
        query = query.where(Trip.client_id == client_id)
    if vehicle_id:
        query = query.join(TripVehicle).where(TripVehicle.vehicle_id == vehicle_id)
    if from_date:
        query = query.where(Trip.travel_date >= from_date)
    if to_date:
        query = query.where(Trip.travel_date <= to_date)
    query = query.order_by(Trip.travel_date.desc()).distinct()
    result = await db.execute(query)
    return result.scalars().all()


# ═══════════════════════════════════════════════════════
# GET ONE / SUMMARY / DETAIL
# ═══════════════════════════════════════════════════════

@router.get("/{trip_id}", response_model=TripOut)
async def get_trip(trip_id: int, db: AsyncSession = Depends(get_db), user=Depends(current_user)):
    trip = await _fetch_trip_full(db, trip_id)
    if not trip:
        raise HTTPException(404, "Trip nahi mili")
    return trip


@router.get("/{trip_id}/summary", response_model=TripSummary)
async def trip_summary(trip_id: int, db: AsyncSession = Depends(get_db), user=Depends(current_user)):
    trip = await _fetch_trip_full(db, trip_id)
    if not trip:
        raise HTTPException(404, "Trip nahi mili")

    total_fuel = sum(float(v.fuel_expense) for v in trip.vehicles)
    total_driver = sum(float(v.salary) for v in trip.vehicles)
    total_conductor = sum(float(v.conductor_salary) for v in trip.vehicles)
    total_toll = sum(float(v.toll) for v in trip.vehicles)
    total_allowance = sum(float(v.allowance) for v in trip.vehicles)
    total_extra = sum(float(v.extra) for v in trip.vehicles)

    total_expense = round(
        total_fuel + total_driver + total_conductor + total_toll
        + total_allowance + total_extra + float(trip.shift_extra),
        2,
    )
    margin = (
        round((float(trip.net_profit) / float(trip.client_rent)) * 100, 2)
        if trip.client_rent else 0
    )

    return TripSummary(
        trip_id=trip.id,
        source=trip.source,
        destination=trip.destination,
        distance_km=trip.distance_km,
        total_fuel=round(total_fuel, 2),
        total_driver_salary=round(total_driver, 2),
        total_conductor_salary=round(total_conductor, 2),
        total_toll=round(total_toll, 2),
        total_allowance=round(total_allowance, 2),
        total_extra=round(total_extra, 2),
        shift_extra=float(trip.shift_extra),
        total_expense=total_expense,
        client_rent=float(trip.client_rent),
        net_profit=float(trip.net_profit),
        profit_margin_percent=margin,
        vehicle_count=len(trip.vehicles),
    )


@router.get("/{trip_id}/detail")
async def trip_detail(trip_id: int, db: AsyncSession = Depends(get_db), user=Depends(current_user)):
    trip = await _fetch_trip_full(db, trip_id)
    if not trip:
        raise HTTPException(404, "Trip nahi mili")

    client = await db.get(Client, trip.client_id)

    vehicles_out = []
    for tv in trip.vehicles:
        v = await db.get(Vehicle, tv.vehicle_id)
        d = await db.get(Driver, tv.driver_id)
        c = await db.get(Conductor, tv.conductor_id) if tv.conductor_id else None
        vehicles_out.append({
            "id": tv.id,
            "order_no": tv.order_no,
            "vehicle": {"id": v.id, "reg_no": v.reg_no, "diary_number": v.diary_number, "model": v.model} if v else None,
            "driver": {"id": d.id, "name": d.name, "phone": d.phone} if d else None,
            "conductor": {"id": c.id, "name": c.name, "phone": c.phone} if c else None,
            "mileage_kmpl": float(tv.mileage_kmpl),
            "diesel_rate": float(tv.diesel_rate),
            "fuel_expense": float(tv.fuel_expense),
            "litres_used": round(trip.distance_km / float(tv.mileage_kmpl), 2) if tv.mileage_kmpl else 0,
            "salary": float(tv.salary),
            "conductor_salary": float(tv.conductor_salary),
            "toll": float(tv.toll),
            "allowance": float(tv.allowance),
            "extra": float(tv.extra),
        })

    total_fuel = sum(v["fuel_expense"] for v in vehicles_out)
    total_driver = sum(v["salary"] for v in vehicles_out)
    total_conductor = sum(v["conductor_salary"] for v in vehicles_out)
    total_toll = sum(v["toll"] for v in vehicles_out)
    total_allowance = sum(v["allowance"] for v in vehicles_out)
    total_extra = sum(v["extra"] for v in vehicles_out)

    total_expense = round(
        total_fuel + total_driver + total_conductor + total_toll
        + total_allowance + total_extra + float(trip.shift_extra),
        2,
    )
    margin = (
        round((float(trip.net_profit) / float(trip.client_rent)) * 100, 2)
        if trip.client_rent else 0
    )

    return {
        "id": trip.id,
        "status": trip.status,
        "shift": trip.shift,
        "booking_date": trip.booking_date,
        "travel_date": trip.travel_date,
        "travel_time": trip.travel_time,
        "travel_day": trip.travel_day,
        "tour_days": trip.tour_days,
        "tour_nights": trip.tour_nights,
        "source": trip.source,
        "destination": trip.destination,
        "distance_km": trip.distance_km,
        "is_round_trip": trip.is_round_trip,
        "notes": trip.notes,
        "client": {"id": client.id, "name": client.name, "phone": client.phone} if client else None,

        "vehicles": vehicles_out,
        "vehicle_count": len(vehicles_out),

        "shift_extra": float(trip.shift_extra),

        "total_fuel": round(total_fuel, 2),
        "total_driver_salary": round(total_driver, 2),
        "total_conductor_salary": round(total_conductor, 2),
        "total_toll": round(total_toll, 2),
        "total_allowance": round(total_allowance, 2),
        "total_extra": round(total_extra, 2),

        "total_expense": total_expense,
        "client_rent": float(trip.client_rent),
        "net_profit": float(trip.net_profit),
        "profit_margin_percent": margin,

        "waypoints": [
            {"id": wp.id, "stop_name": wp.stop_name, "order_no": wp.order_no, "arrival_time": wp.arrival_time}
            for wp in trip.waypoints
        ],
    }


# ═══════════════════════════════════════════════════════
# UPDATE
# ═══════════════════════════════════════════════════════

@router.put("/{trip_id}", response_model=TripOut)
async def update_trip(
    trip_id: int,
    payload: TripUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    trip = await _fetch_trip_full(db, trip_id)
    if not trip:
        raise HTTPException(404, "Trip nahi mili")

    data = payload.model_dump(exclude_unset=True)
    waypoints_data = data.pop("waypoints", None)
    vehicles_data = data.pop("vehicles", None)

    if "client_id" in data and not await db.get(Client, data["client_id"]):
        raise HTTPException(404, "Client nahi mila")

    for key, value in data.items():
        setattr(trip, key, value)

    if "travel_date" in data and "travel_day" not in data:
        trip.travel_day = compute_day(trip.travel_date)

    if waypoints_data is not None:
        for wp in list(trip.waypoints):
            await db.delete(wp)
        await db.flush()
        for idx, wp in enumerate(waypoints_data, start=1):
            db.add(TripWaypoint(
                trip_id=trip.id,
                stop_name=wp["stop_name"],
                order_no=idx,
                arrival_time=wp.get("arrival_time"),
            ))

    if vehicles_data is not None:
        if not vehicles_data:
            raise HTTPException(400, "Kam az kam ek vehicle zaroori hai")

        for i, v in enumerate(vehicles_data):
            if not await db.get(Vehicle, v["vehicle_id"]):
                raise HTTPException(404, f"Vehicle #{i+1} nahi mila")
            if not await db.get(Driver, v["driver_id"]):
                raise HTTPException(404, f"Driver #{i+1} nahi mila")
            if v.get("conductor_id") and not await db.get(Conductor, v["conductor_id"]):
                raise HTTPException(404, f"Conductor #{i+1} nahi mila")

        existing_rate = None
        if trip.vehicles:
            existing_rate = float(trip.vehicles[0].diesel_rate)
        if existing_rate is None:
            existing_rate = await get_effective_rate(db)

        for tv in list(trip.vehicles):
            await db.delete(tv)
        await db.flush()

        for idx, v in enumerate(vehicles_data, start=1):
            litres = trip.distance_km / v["mileage_kmpl"]
            fuel = round(litres * existing_rate, 2)
            db.add(TripVehicle(
                trip_id=trip.id,
                vehicle_id=v["vehicle_id"],
                driver_id=v["driver_id"],
                conductor_id=v.get("conductor_id"),
                mileage_kmpl=v["mileage_kmpl"],
                diesel_rate=existing_rate,
                fuel_expense=fuel,
                salary=v.get("salary", 0),
                conductor_salary=v.get("conductor_salary", 0),
                toll=v.get("toll", 0),
                allowance=v.get("allowance", 0),
                extra=v.get("extra", 0),
                order_no=idx,
            ))
        await db.flush()

    if "distance_km" in data and vehicles_data is None:
        for tv in trip.vehicles:
            litres = float(trip.distance_km) / float(tv.mileage_kmpl)
            tv.fuel_expense = round(litres * float(tv.diesel_rate), 2)
        await db.flush()
        
    trip = await _fetch_trip_full(db, trip.id)
    trip.net_profit = calc_trip_profit(trip)

    await _sync_staff_payments(db, trip)

    await db.commit()


# ═══════════════════════════════════════════════════════
# DELETE / STATUS
# ═══════════════════════════════════════════════════════

@router.delete("/{trip_id}", status_code=204)
async def delete_trip(trip_id: int, db: AsyncSession = Depends(get_db), user=Depends(current_user)):
    trip = await db.get(Trip, trip_id)
    if not trip:
        raise HTTPException(404, "Trip nahi mili")

    await db.execute(
        update(Receipt).where(Receipt.trip_id == trip_id).values(trip_id=None)
    )
    await db.delete(trip)
    await db.commit()


@router.patch("/{trip_id}/status")
async def update_status(
    trip_id: int,
    new_status: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    allowed = {"scheduled", "ongoing", "completed", "cancelled"}
    if new_status not in allowed:
        raise HTTPException(400, f"Status '{new_status}' valid nahi. Allowed: {allowed}")
    trip = await db.get(Trip, trip_id)
    if not trip:
        raise HTTPException(404, "Trip nahi mili")
    trip.status = new_status
    await db.commit()
    await db.refresh(trip)
    return {"trip_id": trip.id, "status": trip.status}