from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import current_user
from app.models import Receipt, Client, Trip
from app.schemas import ReceiptIn, ReceiptOut

router = APIRouter(prefix="/receipts", tags=["Receipts"])


@router.post("", response_model=ReceiptOut, status_code=201)
async def create_receipt(
    payload: ReceiptIn,
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    # Verify client exists (agar diya)
    if payload.client_id and not await db.get(Client, payload.client_id):
        raise HTTPException(404, "Client nahi mila")
    if payload.trip_id and not await db.get(Trip, payload.trip_id):
        raise HTTPException(404, "Trip nahi mili")

    data = payload.model_dump()
    total = float(data["total_amount"])
    advance = float(data["advance_amount"])

    if advance > total:
        raise HTTPException(400, "Advance amount total se zyada nahi ho sakti")

    data["due_amount"] = round(total - advance, 2)

    receipt = Receipt(**data, receipt_number="")
    db.add(receipt)
    await db.flush()
    receipt.receipt_number = f"R-{receipt.id:05d}"
    await db.commit()
    await db.refresh(receipt)
    return receipt


@router.get("", response_model=list[ReceiptOut])
async def list_receipts(
    client_id: int | None = None,
    status_filter: str | None = None,
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    query = select(Receipt)
    if client_id:
        query = query.where(Receipt.client_id == client_id)
    if status_filter:
        query = query.where(Receipt.status == status_filter)
    query = query.order_by(Receipt.receipt_date.desc(), Receipt.id.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{receipt_id}", response_model=ReceiptOut)
async def get_receipt(
    receipt_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    receipt = await db.get(Receipt, receipt_id)
    if not receipt:
        raise HTTPException(404, "Receipt nahi mili")
    return receipt


@router.put("/{receipt_id}", response_model=ReceiptOut)
async def update_receipt(
    receipt_id: int,
    payload: ReceiptIn,
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    receipt = await db.get(Receipt, receipt_id)
    if not receipt:
        raise HTTPException(404, "Receipt nahi mili")

    data = payload.model_dump()
    total = float(data["total_amount"])
    advance = float(data["advance_amount"])

    if advance > total:
        raise HTTPException(400, "Advance amount total se zyada nahi ho sakti")

    data["due_amount"] = round(total - advance, 2)

    for key, value in data.items():
        setattr(receipt, key, value)

    await db.commit()
    await db.refresh(receipt)
    return receipt


@router.delete("/{receipt_id}", status_code=204)
async def delete_receipt(
    receipt_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    receipt = await db.get(Receipt, receipt_id)
    if not receipt:
        raise HTTPException(404, "Receipt nahi mili")
    await db.delete(receipt)
    await db.commit()