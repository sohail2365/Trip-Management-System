from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import current_user
from app.models import VehicleMaintenance, Vehicle
from app.schemas import MaintenanceIn, MaintenanceOut

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])


@router.post("", response_model=MaintenanceOut, status_code=201)
async def create_maintenance(
    payload: MaintenanceIn,
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    if not await db.get(Vehicle, payload.vehicle_id):
        raise HTTPException(404, "Vehicle nahi mila")
    m = VehicleMaintenance(**payload.model_dump())
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return m


@router.get("", response_model=list[MaintenanceOut])
async def list_maintenance(
    vehicle_id: int | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    query = select(VehicleMaintenance)
    if vehicle_id:
        query = query.where(VehicleMaintenance.vehicle_id == vehicle_id)
    if from_date:
        query = query.where(VehicleMaintenance.maintenance_date >= from_date)
    if to_date:
        query = query.where(VehicleMaintenance.maintenance_date <= to_date)
    query = query.order_by(VehicleMaintenance.maintenance_date.desc(), VehicleMaintenance.id.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.put("/{mid}", response_model=MaintenanceOut)
async def update_maintenance(
    mid: int,
    payload: MaintenanceIn,
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    m = await db.get(VehicleMaintenance, mid)
    if not m:
        raise HTTPException(404, "Record nahi mila")
    for k, v in payload.model_dump().items():
        setattr(m, k, v)
    await db.commit()
    await db.refresh(m)
    return m


@router.delete("/{mid}", status_code=204)
async def delete_maintenance(
    mid: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    m = await db.get(VehicleMaintenance, mid)
    if not m:
        raise HTTPException(404, "Record nahi mila")
    await db.delete(m)
    await db.commit()