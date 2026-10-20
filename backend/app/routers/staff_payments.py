from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import current_user
from app.models import StaffPayment, Driver, Conductor, Trip
from app.schemas import StaffPaymentIn, StaffPaymentOut, StaffPaymentUpdate, StaffSummary

router = APIRouter(prefix="/staff-payments", tags=["Staff Payments"])


# ═══════════════════════════════════════════════════════
# CRUD (manual payments only)
# ═══════════════════════════════════════════════════════

@router.post("", response_model=StaffPaymentOut, status_code=201)
async def create_payment(
    payload: StaffPaymentIn,
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    if payload.staff_type == "driver":
        if not await db.get(Driver, payload.staff_id):
            raise HTTPException(404, "Driver nahi mila")
    elif payload.staff_type == "conductor":
        if not await db.get(Conductor, payload.staff_id):
            raise HTTPException(404, "Conductor nahi mila")

    p = StaffPayment(
        **payload.model_dump(),
        source="manual",
        trip_id=None,
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p


@router.get("", response_model=list[StaffPaymentOut])
async def list_payments(
    staff_type: str | None = None,
    staff_id: int | None = None,
    source: str | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    query = select(StaffPayment)
    if staff_type:
        query = query.where(StaffPayment.staff_type == staff_type)
    if staff_id:
        query = query.where(StaffPayment.staff_id == staff_id)
    if source:
        query = query.where(StaffPayment.source == source)
    if from_date:
        query = query.where(StaffPayment.payment_date >= from_date)
    if to_date:
        query = query.where(StaffPayment.payment_date <= to_date)
    query = query.order_by(
        StaffPayment.payment_date.desc(), StaffPayment.id.desc()
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.put("/{payment_id}", response_model=StaffPaymentOut)
async def update_payment(
    payment_id: int,
    payload: StaffPaymentUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    p = await db.get(StaffPayment, payment_id)
    if not p:
        raise HTTPException(404, "Payment nahi mili")
    if p.source == "trip":
        raise HTTPException(
            400,
            "Trip-linked payment edit nahi ho sakti. Trip ko edit karo.",
        )
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(p, k, v)
    await db.commit()
    await db.refresh(p)
    return p


@router.delete("/{payment_id}", status_code=204)
async def delete_payment(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    p = await db.get(StaffPayment, payment_id)
    if not p:
        raise HTTPException(404, "Payment nahi mili")
    if p.source == "trip":
        raise HTTPException(
            400,
            "Trip-linked payment delete nahi ho sakti. Trip ko delete karo.",
        )
    await db.delete(p)
    await db.commit()


# ═══════════════════════════════════════════════════════
# SUMMARY — Unified ledger
# ═══════════════════════════════════════════════════════

@router.get("/summary/{staff_type}/{staff_id}", response_model=StaffSummary)
async def staff_summary(
    staff_type: str,
    staff_id: int,
    from_date: str | None = None,
    to_date: str | None = None,
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    if staff_type not in ("driver", "conductor"):
        raise HTTPException(400, "staff_type 'driver' ya 'conductor' hona chahiye")

    # Staff info
    if staff_type == "driver":
        staff = await db.get(Driver, staff_id)
    else:
        staff = await db.get(Conductor, staff_id)

    if not staff:
        raise HTTPException(404, f"{staff_type.title()} nahi mila")

    # All payments
    pay_query = select(StaffPayment).where(
        StaffPayment.staff_type == staff_type,
        StaffPayment.staff_id == staff_id,
    )
    if from_date:
        pay_query = pay_query.where(StaffPayment.payment_date >= from_date)
    if to_date:
        pay_query = pay_query.where(StaffPayment.payment_date <= to_date)
    pay_query = pay_query.order_by(
        StaffPayment.payment_date.desc(), StaffPayment.id.desc()
    )
    pay_result = await db.execute(pay_query)
    payments = pay_result.scalars().all()

    # Totals
    trip_earnings = sum(
        float(p.amount) for p in payments if p.source == "trip"
    )
    manual_payments = sum(
        float(p.amount) for p in payments if p.source == "manual"
    )
    total_earned = trip_earnings + manual_payments

    # Total trips
    trips_result = await db.execute(
        select(func.count(func.distinct(StaffPayment.trip_id)))
        .where(
            StaffPayment.staff_type == staff_type,
            StaffPayment.staff_id == staff_id,
            StaffPayment.source == "trip",
        )
    )
    total_trips = trips_result.scalar() or 0

    return StaffSummary(
        staff_type=staff_type,
        staff_id=staff_id,
        name=staff.name,
        phone=staff.phone,
        total_trips=total_trips,
        trip_earnings=round(trip_earnings, 2),
        manual_payments=round(manual_payments, 2),
        total_earned=round(total_earned, 2),
        payments=[
            {
                "id": p.id,
                "payment_date": str(p.payment_date),
                "amount": float(p.amount),
                "payment_method": p.payment_method,
                "notes": p.notes,
                "source": p.source,
                "trip_id": p.trip_id,
            }
            for p in payments
        ],
    )