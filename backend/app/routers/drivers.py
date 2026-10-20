from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import current_user
from app.models import Driver
from app.schemas import DriverIn, DriverOut

router = APIRouter(prefix="/drivers", tags=["Drivers"])


@router.post("", response_model=DriverOut, status_code=201)
async def create_driver(payload: DriverIn, db: AsyncSession = Depends(get_db), user=Depends(current_user)):
    d = Driver(**payload.model_dump())
    db.add(d)
    await db.commit()
    await db.refresh(d)
    return d


@router.get("", response_model=list[DriverOut])
async def list_drivers(db: AsyncSession = Depends(get_db), user=Depends(current_user)):
    result = await db.execute(select(Driver).order_by(Driver.id))
    return result.scalars().all()


@router.get("/{did}", response_model=DriverOut)
async def get_driver(did: int, db: AsyncSession = Depends(get_db), user=Depends(current_user)):
    d = await db.get(Driver, did)
    if not d:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Driver nahi mila")
    return d


@router.put("/{did}", response_model=DriverOut)
async def update_driver(did: int, payload: DriverIn, db: AsyncSession = Depends(get_db), user=Depends(current_user)):
    d = await db.get(Driver, did)
    if not d:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Driver nahi mila")
    for k, val in payload.model_dump().items():
        setattr(d, k, val)
    await db.commit()
    await db.refresh(d)
    return d


@router.delete("/{did}", status_code=204)
async def delete_driver(did: int, db: AsyncSession = Depends(get_db), user=Depends(current_user)):
    d = await db.get(Driver, did)
    if not d:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Driver nahi mila")
    await db.delete(d)
    await db.commit()