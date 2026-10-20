from datetime import date, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import current_user
from app.models import Trip, Client, Vehicle, Driver

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
async def overall_summary(
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    """Poore business ka overall summary."""
    result = await db.execute(
        select(
            func.count(Trip.id).label("total_trips"),
            func.coalesce(func.sum(Trip.client_rent), 0).label("total_revenue"),
            func.coalesce(func.sum(Trip.fuel_expense), 0).label("total_fuel"),
            func.coalesce(func.sum(Trip.toll), 0).label("total_toll"),
            func.coalesce(func.sum(Trip.salary), 0).label("total_salary"),
            func.coalesce(func.sum(Trip.allowance), 0).label("total_allowance"),
            func.coalesce(func.sum(Trip.extra), 0).label("total_extra"),
            func.coalesce(func.sum(Trip.net_profit), 0).label("total_profit"),
        )
    )
    row = result.one()
    data = dict(row._mapping)

    total_expense = round(
        float(data["total_fuel"]) + float(data["total_toll"])
        + float(data["total_salary"]) + float(data["total_allowance"])
        + float(data["total_extra"]),
        2,
    )
    data["total_expense"] = total_expense
    data["profit_margin_percent"] = (
        round(float(data["total_profit"]) / float(data["total_revenue"]) * 100, 2)
        if data["total_revenue"] else 0
    )

    return data

@router.get("/status-counts")
async def status_counts(
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    """Kitni trips har status mein hain."""
    result = await db.execute(
        select(Trip.status, func.count(Trip.id).label("count"))
        .group_by(Trip.status)
    )
    return {row.status: row.count for row in result.all()}


@router.get("/period")
async def period_summary(
    from_date: date,
    to_date: date,
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    """Specific date range ka summary."""
    result = await db.execute(
        select(
            func.count(Trip.id).label("trips"),
            func.coalesce(func.sum(Trip.client_rent), 0).label("revenue"),
            func.coalesce(func.sum(Trip.net_profit), 0).label("profit"),
        )
        .where(Trip.travel_date >= from_date)
        .where(Trip.travel_date <= to_date)
    )
    row = result.one()
    return dict(row._mapping)

@router.get("/by-vehicle")
async def by_vehicle(
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    """Har vehicle ka profit summary."""
    result = await db.execute(
        select(
            Vehicle.id,
            Vehicle.reg_no,
            Vehicle.model,
            func.count(Trip.id).label("total_trips"),
            func.coalesce(func.sum(Trip.net_profit), 0).label("total_profit"),
        )
        .join(Trip, Trip.vehicle_id == Vehicle.id)
        .group_by(Vehicle.id, Vehicle.reg_no, Vehicle.model)
        .order_by(func.sum(Trip.net_profit).desc())
    )
    return [
        {
            "vehicle_id": r.id,
            "reg_no": r.reg_no,
            "model": r.model,
            "total_trips": r.total_trips,
            "total_profit": float(r.total_profit),
        }
        for r in result.all()
    ]

@router.get("/by-client")
async def by_client(
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    """Har client ka business summary."""
    result = await db.execute(
        select(
            Client.id,
            Client.name,
            func.count(Trip.id).label("total_trips"),
            func.coalesce(func.sum(Trip.client_rent), 0).label("total_revenue"),
            func.coalesce(func.sum(Trip.net_profit), 0).label("total_profit"),
        )
        .join(Trip, Trip.client_id == Client.id)
        .group_by(Client.id, Client.name)
        .order_by(func.sum(Trip.client_rent).desc())
    )
    return [
        {
            "client_id": r.id,
            "name": r.name,
            "total_trips": r.total_trips,
            "total_revenue": float(r.total_revenue),
            "total_profit": float(r.total_profit),
        }
        for r in result.all()
    ]

@router.get("/by-driver")
async def by_driver(
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    result = await db.execute(
        select(
            Driver.id,
            Driver.name,
            func.count(Trip.id).label("total_trips"),
            func.coalesce(func.sum(Trip.net_profit), 0).label("total_profit"),
        )
        .join(Trip, Trip.driver_id == Driver.id)
        .group_by(Driver.id, Driver.name)
        .order_by(func.sum(Trip.net_profit).desc())
    )
    return [
        {
            "driver_id": r.id,
            "name": r.name,
            "total_trips": r.total_trips,
            "total_profit": float(r.total_profit),
        }
        for r in result.all()
    ]

@router.get("/recent-trips")
async def recent_trips(
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    """Latest N trips (default 10)."""
    result = await db.execute(
        select(Trip).order_by(Trip.travel_date.desc()).limit(limit)
    )
    trips = result.scalars().all()
    return [
        {
            "id": t.id,
            "travel_date": str(t.travel_date),
            "source": t.source,
            "destination": t.destination,
            "client_rent": float(t.client_rent),
            "net_profit": float(t.net_profit),
            "status": t.status,
        }
        for t in trips
    ]


