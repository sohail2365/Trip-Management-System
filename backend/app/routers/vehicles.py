from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date
from sqlalchemy import func

from app.database import get_db
from app.deps import current_user
from app.models import Vehicle, TripVehicle, Trip, Client, VehicleMaintenance
from app.schemas import VehicleIn, VehicleOut

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


@router.post("", response_model=VehicleOut, status_code=201)
async def create_vehicle(payload: VehicleIn, db: AsyncSession = Depends(get_db), user=Depends(current_user)):
    existing = await db.execute(select(Vehicle).where(Vehicle.reg_no == payload.reg_no))
    if existing.scalar_one_or_none():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Ye registration already exists")
    v = Vehicle(**payload.model_dump())
    db.add(v); await db.commit(); await db.refresh(v)
    return v


@router.get("", response_model=list[VehicleOut])
async def list_vehicles(db: AsyncSession = Depends(get_db), user=Depends(current_user)):
    result = await db.execute(select(Vehicle).order_by(Vehicle.id))
    return result.scalars().all()


@router.get("/{vid}", response_model=VehicleOut)
async def get_vehicle(vid: int, db: AsyncSession = Depends(get_db), user=Depends(current_user)):
    v = await db.get(Vehicle, vid)
    if not v:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vehicle nahi mila")
    return v


@router.put("/{vid}", response_model=VehicleOut)
async def update_vehicle(vid: int, payload: VehicleIn, db: AsyncSession = Depends(get_db), user=Depends(current_user)):
    v = await db.get(Vehicle, vid)
    if not v:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vehicle nahi mila")
    for k, val in payload.model_dump().items():
        setattr(v, k, val)
    await db.commit(); await db.refresh(v)
    return v


@router.delete("/{vid}", status_code=204)
async def delete_vehicle(vid: int, db: AsyncSession = Depends(get_db), user=Depends(current_user)):
    v = await db.get(Vehicle, vid)
    if not v:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vehicle nahi mila")
    await db.delete(v); await db.commit()

@router.get("/{vehicle_id}/detail")
async def vehicle_detail(
    vehicle_id: int,
    from_date: date | None = None,
    to_date: date | None = None,
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    """
    Vehicle ki poori history:
    - Total trips, distance, revenue share (proportional)
    - Own expenses (fuel, toll, salary, allowance, extra)
    - Maintenance
    - Net profit
    - Per-trip breakdown
    """
    vehicle = await db.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(404, "Vehicle nahi mila")

    # ─── Fetch all trips this vehicle participated in ───
    tv_query = (
        select(TripVehicle, Trip)
        .join(Trip, TripVehicle.trip_id == Trip.id)
        .where(TripVehicle.vehicle_id == vehicle_id)
    )
    if from_date:
        tv_query = tv_query.where(Trip.travel_date >= from_date)
    if to_date:
        tv_query = tv_query.where(Trip.travel_date <= to_date)
    tv_query = tv_query.order_by(Trip.travel_date.desc())

    result = await db.execute(tv_query)
    rows = result.all()

    # ─── Vehicle counts per trip (for revenue share) ───
    trip_ids = [trip.id for _, trip in rows]
    trip_vehicle_counts = {}
    if trip_ids:
        counts_result = await db.execute(
            select(TripVehicle.trip_id, func.count(TripVehicle.id))
            .where(TripVehicle.trip_id.in_(trip_ids))
            .group_by(TripVehicle.trip_id)
        )
        trip_vehicle_counts = {tid: cnt for tid, cnt in counts_result.all()}

    # ─── Client names (single query) ───
    client_ids = list({trip.client_id for _, trip in rows})
    clients_map = {}
    if client_ids:
        clients_result = await db.execute(
            select(Client).where(Client.id.in_(client_ids))
        )
        clients_map = {c.id: c for c in clients_result.scalars().all()}

    # ─── Maintenance ───
    maint_query = select(VehicleMaintenance).where(
        VehicleMaintenance.vehicle_id == vehicle_id
    )
    if from_date:
        maint_query = maint_query.where(
            VehicleMaintenance.maintenance_date >= from_date
        )
    if to_date:
        maint_query = maint_query.where(
            VehicleMaintenance.maintenance_date <= to_date
        )
    maint_query = maint_query.order_by(VehicleMaintenance.maintenance_date.desc())

    maint_result = await db.execute(maint_query)
    maintenance = maint_result.scalars().all()

    # ─── Totals ───
    total_fuel = sum(float(tv.fuel_expense) for tv, _ in rows)
    total_toll = sum(float(tv.toll) for tv, _ in rows)
    total_driver = sum(float(tv.salary) for tv, _ in rows)
    total_conductor = sum(float(tv.conductor_salary) for tv, _ in rows)
    total_allowance = sum(float(tv.allowance) for tv, _ in rows)
    total_extra = sum(float(tv.extra) for tv, _ in rows)
    total_trip_expense = (
        total_fuel + total_toll + total_driver
        + total_conductor + total_allowance + total_extra
    )
    total_maintenance = sum(float(m.amount) for m in maintenance)

    # Revenue share — proportional
    revenue_share = 0.0
    for tv, trip in rows:
        cnt = trip_vehicle_counts.get(trip.id, 1) or 1
        revenue_share += float(trip.client_rent) / cnt
    revenue_share = round(revenue_share, 2)

    net_profit = round(revenue_share - total_trip_expense - total_maintenance, 2)

    # ─── Per-trip breakdown ───
    trips_out = []
    for tv, trip in rows:
        cnt = trip_vehicle_counts.get(trip.id, 1) or 1
        client = clients_map.get(trip.client_id)
        own_expense = round(
            float(tv.fuel_expense) + float(tv.salary)
            + float(tv.conductor_salary) + float(tv.toll)
            + float(tv.allowance) + float(tv.extra),
            2,
        )
        trips_out.append({
            "trip_id": trip.id,
            "travel_date": str(trip.travel_date),
            "travel_day": trip.travel_day,
            "source": trip.source,
            "destination": trip.destination,
            "client_name": client.name if client else None,
            "distance_km": trip.distance_km,
            "is_round_trip": trip.is_round_trip,
            "trip_status": trip.status,
            "trip_client_rent": float(trip.client_rent),
            "vehicle_count": cnt,
            "revenue_share": round(float(trip.client_rent) / cnt, 2),
            "fuel": float(tv.fuel_expense),
            "salary": float(tv.salary),
            "conductor_salary": float(tv.conductor_salary),
            "toll": float(tv.toll),
            "allowance": float(tv.allowance),
            "extra": float(tv.extra),
            "own_expense": own_expense,
            "own_profit": round(float(trip.client_rent) / cnt - own_expense, 2),
        })

    # ─── Maintenance breakdown ───
    maintenance_out = [
        {
            "id": m.id,
            "date": str(m.maintenance_date),
            "type": m.maintenance_type,
            "description": m.description,
            "amount": float(m.amount),
            "odometer_km": m.odometer_km,
            "vendor": m.vendor,
        }
        for m in maintenance
    ]

    return {
        "vehicle": {
            "id": vehicle.id,
            "reg_no": vehicle.reg_no,
            "diary_number": vehicle.diary_number,
            "model": vehicle.model,
            "mileage_kmpl": vehicle.mileage_kmpl,
        },
        "totals": {
            "total_trips": len(rows),
            "total_distance_km": round(
                sum(t.distance_km for _, t in rows), 1
            ),
            "revenue_share": revenue_share,
            "total_fuel": round(total_fuel, 2),
            "total_toll": round(total_toll, 2),
            "total_driver_salary": round(total_driver, 2),
            "total_conductor_salary": round(total_conductor, 2),
            "total_allowance": round(total_allowance, 2),
            "total_extra": round(total_extra, 2),
            "total_maintenance": round(total_maintenance, 2),
            "total_expense": round(total_trip_expense + total_maintenance, 2),
            "net_profit": net_profit,
        },
        "trips": trips_out,
        "maintenance": maintenance_out,
    }    