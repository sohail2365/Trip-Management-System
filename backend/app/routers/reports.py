from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import current_user
from app.models import Trip, Vehicle, VehicleMaintenance
from app.schemas import VehicleReport, VehicleReportPeriod

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/vehicle/{vehicle_id}", response_model=VehicleReport)
async def vehicle_report(
    vehicle_id: int,
    from_date: date = Query(...),
    to_date: date = Query(...),
    group_by: str = Query("month", regex="^(week|month|year)$"),
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    vehicle = await db.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(404, "Vehicle nahi mila")

    # ──── Fetch all trips in range ────
    trips_result = await db.execute(
        select(Trip)
        .where(Trip.vehicle_id == vehicle_id)
        .where(Trip.travel_date >= from_date)
        .where(Trip.travel_date <= to_date)
        .order_by(Trip.travel_date)
    )
    trips = trips_result.scalars().all()

    # ──── Fetch maintenance in range ────
    maint_result = await db.execute(
        select(VehicleMaintenance)
        .where(VehicleMaintenance.vehicle_id == vehicle_id)
        .where(VehicleMaintenance.maintenance_date >= from_date)
        .where(VehicleMaintenance.maintenance_date <= to_date)
    )
    maintenance = maint_result.scalars().all()

    # ──── Grand totals ────
    total_earnings = sum(float(t.client_rent) for t in trips)
    total_fuel = sum(float(t.fuel_expense) for t in trips)
    total_other = sum(
        float(t.toll) + float(t.salary) + float(t.allowance) + float(t.extra)
        for t in trips
    )
    total_maintenance = sum(float(m.amount) for m in maintenance)
    total_expense = total_fuel + total_other + total_maintenance
    total_profit = total_earnings - total_expense
    total_distance = sum(t.distance_km for t in trips)
    margin = (total_profit / total_earnings * 100) if total_earnings else 0

    # ──── Period grouping ────
    def period_key(d: date):
        if group_by == "week":
            year, week, _ = d.isocalendar()
            return (year, week, f"Week {week} {year}")
        elif group_by == "year":
            return (d.year, 0, str(d.year))
        else:  # month
            return (d.year, d.month, d.strftime("%B %Y"))

    # Combine trips + maintenance into periods
    periods_map = {}

    for t in trips:
        key = period_key(t.travel_date)
        if key not in periods_map:
            periods_map[key] = {
                "label": key[2],
                "start_date": t.travel_date,
                "end_date": t.travel_date,
                "trips": 0,
                "distance_km": 0.0,
                "earnings": 0.0,
                "fuel_expense": 0.0,
                "other_expenses": 0.0,
                "maintenance": 0.0,
            }
        p = periods_map[key]
        p["trips"] += 1
        p["distance_km"] += t.distance_km
        p["earnings"] += float(t.client_rent)
        p["fuel_expense"] += float(t.fuel_expense)
        p["other_expenses"] += (
            float(t.toll) + float(t.salary) + float(t.allowance) + float(t.extra)
        )
        if t.travel_date < p["start_date"]:
            p["start_date"] = t.travel_date
        if t.travel_date > p["end_date"]:
            p["end_date"] = t.travel_date

    for m in maintenance:
        key = period_key(m.maintenance_date)
        if key not in periods_map:
            periods_map[key] = {
                "label": key[2],
                "start_date": m.maintenance_date,
                "end_date": m.maintenance_date,
                "trips": 0,
                "distance_km": 0.0,
                "earnings": 0.0,
                "fuel_expense": 0.0,
                "other_expenses": 0.0,
                "maintenance": 0.0,
            }
        p = periods_map[key]
        p["maintenance"] += float(m.amount)
        if m.maintenance_date < p["start_date"]:
            p["start_date"] = m.maintenance_date
        if m.maintenance_date > p["end_date"]:
            p["end_date"] = m.maintenance_date

    # Finalize periods
    periods = []
    for p in sorted(periods_map.values(), key=lambda x: x["start_date"]):
        p["distance_km"] = round(p["distance_km"], 1)
        p["earnings"] = round(p["earnings"], 2)
        p["fuel_expense"] = round(p["fuel_expense"], 2)
        p["other_expenses"] = round(p["other_expenses"], 2)
        p["maintenance"] = round(p["maintenance"], 2)
        p["total_expense"] = round(p["fuel_expense"] + p["other_expenses"] + p["maintenance"], 2)
        p["net_profit"] = round(p["earnings"] - p["total_expense"], 2)
        periods.append(VehicleReportPeriod(**p))

    return VehicleReport(
        vehicle_id=vehicle.id,
        reg_no=vehicle.reg_no,
        diary_number=vehicle.diary_number,
        model=vehicle.model,
        total_trips=len(trips),
        total_distance_km=round(total_distance, 1),
        total_earnings=round(total_earnings, 2),
        total_fuel=round(total_fuel, 2),
        total_other_expenses=round(total_other, 2),
        total_maintenance=round(total_maintenance, 2),
        total_expense=round(total_expense, 2),
        total_profit=round(total_profit, 2),
        profit_margin_percent=round(margin, 2),
        periods=periods,
    )


@router.get("/fleet-summary")
async def fleet_summary(
    from_date: date = Query(...),
    to_date: date = Query(...),
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    """Saari vehicles ka summary ek saath."""
    vehicles_result = await db.execute(select(Vehicle).order_by(Vehicle.id))
    vehicles = vehicles_result.scalars().all()

    out = []
    for v in vehicles:
        trips_result = await db.execute(
            select(
                func.count(Trip.id).label("trips"),
                func.coalesce(func.sum(Trip.client_rent), 0).label("earnings"),
                func.coalesce(func.sum(Trip.fuel_expense), 0).label("fuel"),
                func.coalesce(func.sum(Trip.net_profit), 0).label("profit"),
                func.coalesce(func.sum(Trip.distance_km), 0).label("distance"),
            )
            .where(Trip.vehicle_id == v.id)
            .where(Trip.travel_date >= from_date)
            .where(Trip.travel_date <= to_date)
        )
        row = trips_result.one()

        maint_result = await db.execute(
            select(func.coalesce(func.sum(VehicleMaintenance.amount), 0))
            .where(VehicleMaintenance.vehicle_id == v.id)
            .where(VehicleMaintenance.maintenance_date >= from_date)
            .where(VehicleMaintenance.maintenance_date <= to_date)
        )
        maint = float(maint_result.scalar_one())

        out.append({
            "vehicle_id": v.id,
            "reg_no": v.reg_no,
            "diary_number": v.diary_number,
            "model": v.model,
            "trips": row.trips,
            "distance_km": float(row.distance),
            "earnings": float(row.earnings),
            "fuel": float(row.fuel),
            "maintenance": maint,
            "profit": float(row.profit) - maint,  # profit after maintenance
        })

    return out