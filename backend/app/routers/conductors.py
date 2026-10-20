from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import current_user
from app.models import Conductor
from app.schemas import ConductorIn, ConductorOut

router = APIRouter(prefix="/conductors", tags=["Conductors"])


@router.post("", response_model=ConductorOut, status_code=201)
async def create_conductor(payload: ConductorIn, db: AsyncSession = Depends(get_db), user=Depends(current_user)):
    c = Conductor(**payload.model_dump())
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return c


@router.get("", response_model=list[ConductorOut])
async def list_conductors(db: AsyncSession = Depends(get_db), user=Depends(current_user)):
    result = await db.execute(select(Conductor).order_by(Conductor.id))
    return result.scalars().all()


@router.get("/{cid}", response_model=ConductorOut)
async def get_conductor(cid: int, db: AsyncSession = Depends(get_db), user=Depends(current_user)):
    c = await db.get(Conductor, cid)
    if not c:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conductor nahi mila")
    return c


@router.put("/{cid}", response_model=ConductorOut)
async def update_conductor(cid: int, payload: ConductorIn, db: AsyncSession = Depends(get_db), user=Depends(current_user)):
    c = await db.get(Conductor, cid)
    if not c:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conductor nahi mila")
    for k, v in payload.model_dump().items():
        setattr(c, k, v)
    await db.commit()
    await db.refresh(c)
    return c


@router.delete("/{cid}", status_code=204)
async def delete_conductor(cid: int, db: AsyncSession = Depends(get_db), user=Depends(current_user)):
    c = await db.get(Conductor, cid)
    if not c:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conductor nahi mila")
    await db.delete(c)
    await db.commit()