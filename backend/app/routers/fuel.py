from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import current_user
from app.models import FuelRate
from app.schemas import FuelRateIn, FuelRateOut, FuelCalcIn, FuelCalcOut
from app.integrations.fuel_scraper import fetch_diesel_rate

router = APIRouter(prefix="/fuel", tags=["Fuel"])


# ---------- Helper ----------

async def get_today_rate(db: AsyncSession) -> float:
    """Aaj ka diesel rate return karo. Na mile to 404."""
    today = date.today()
    result = await db.execute(select(FuelRate).where(FuelRate.rate_date == today))
    rate = result.scalar_one_or_none()
    if not rate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Aaj ({today}) ka diesel rate set nahi hai. Pehle /fuel/rate par POST karo.",
        )
    return rate.rate_pkr


# ---------- Endpoints ----------

@router.post("/rate", response_model=FuelRateOut, status_code=201)
async def set_rate(
    payload: FuelRateIn,
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    """Naya diesel rate set karo (ya aaj ka update karo)."""
    target_date = payload.rate_date or date.today()

    # Already exists?
    result = await db.execute(select(FuelRate).where(FuelRate.rate_date == target_date))
    existing = result.scalar_one_or_none()

    if existing:
        # Update
        existing.rate_pkr = payload.rate_pkr
        existing.source = "manual"
        await db.commit()
        await db.refresh(existing)
        return existing

    # Create
    new_rate = FuelRate(
        rate_date=target_date,
        rate_pkr=payload.rate_pkr,
        source="manual",
    )
    db.add(new_rate)
    await db.commit()
    await db.refresh(new_rate)
    return new_rate


@router.get("/rate", response_model=FuelRateOut)
async def get_current_rate(
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    """Aaj ka diesel rate dekho."""
    today = date.today()
    result = await db.execute(select(FuelRate).where(FuelRate.rate_date == today))
    rate = result.scalar_one_or_none()
    if not rate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aaj ka rate set nahi hai",
        )
    return rate


@router.get("/rates", response_model=list[FuelRateOut])
async def list_rates(
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    """Saare purane rates dekho (latest pehle)."""
    result = await db.execute(select(FuelRate).order_by(FuelRate.rate_date.desc()))
    return result.scalars().all()


@router.post("/calculate", response_model=FuelCalcOut)
async def calculate_fuel(
    payload: FuelCalcIn,
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    """Fuel expense calculate karo bina trip banane ke."""
    rate = payload.rate_pkr
    if rate is None or rate <= 0:
        rate = await get_today_rate(db)

    litres = payload.distance_km / payload.mileage_kmpl
    fuel = round(litres * rate, 2)

    return FuelCalcOut(
        distance_km=payload.distance_km,
        mileage_kmpl=payload.mileage_kmpl,
        rate_pkr=rate,
        litres_needed=round(litres, 2),
        fuel_expense=fuel,
    )


from app.integrations.fuel_scraper import fetch_diesel_rate


@router.post("/rate/auto-fetch")
async def auto_fetch_rate(
    force: bool = False,
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    """
    OGRA se diesel rate fetch karo.
    - force=False (default): aaj ka rate already hai to 400 error
    - force=True: existing rate override karo
    """
    today = date.today()
    existing_result = await db.execute(
        select(FuelRate).where(FuelRate.rate_date == today)
    )
    existing = existing_result.scalar_one_or_none()

    if existing and not force:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Aaj ({today}) ka rate already set hai (PKR {existing.rate_pkr}). "
            f"Override karne ke liye force=true use karo.",
        )

    rate, err = await fetch_diesel_rate()
    if rate is None:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            f"OGRA se rate nahi mila: {err}. Manually set karo via POST /api/fuel/rate",
        )

    if existing:
        existing.rate_pkr = rate
        existing.source = "auto"
        await db.commit()
        await db.refresh(existing)
        return existing

    new_rate = FuelRate(rate_date=today, rate_pkr=rate, source="auto")
    db.add(new_rate)
    await db.commit()
    await db.refresh(new_rate)
    return new_rate

@router.get("/rate/debug-scrape")
async def debug_scrape(user=Depends(current_user)):
    """PSO se kya aa raha hai wo dikhao."""
    from app.integrations.fuel_scraper import debug_fetch
    return await debug_fetch()