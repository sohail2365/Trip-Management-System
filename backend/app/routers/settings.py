from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import current_user
from app.models import AppSettings
from app.schemas import SettingsIn, SettingsOut

router = APIRouter(prefix="/settings", tags=["Settings"])


async def get_or_create_settings(db: AsyncSession) -> AppSettings:
    """Settings row lo, na ho to empty banao."""
    result = await db.execute(select(AppSettings).limit(1))
    settings = result.scalar_one_or_none()
    if not settings:
        settings = AppSettings()
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings


@router.get("", response_model=SettingsOut)
async def get_settings(
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    return await get_or_create_settings(db)


@router.put("", response_model=SettingsOut)
async def update_settings(
    payload: SettingsIn,
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    settings = await get_or_create_settings(db)
    for key, value in payload.model_dump().items():
        setattr(settings, key, value)
    await db.commit()
    await db.refresh(settings)
    return settings