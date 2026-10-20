from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import current_user
from app.models import Client
from app.schemas import ClientIn, ClientOut

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.post("", response_model=ClientOut, status_code=201)
async def create_client(
    payload: ClientIn,
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),  # sirf logged-in
):
    client = Client(**payload.model_dump())
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client


@router.get("", response_model=list[ClientOut])
async def list_clients(
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    result = await db.execute(select(Client).order_by(Client.id))
    return result.scalars().all()


@router.get("/{client_id}", response_model=ClientOut)
async def get_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    client = await db.get(Client, client_id)
    if not client:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Client nahi mila")
    return client


@router.put("/{client_id}", response_model=ClientOut)
async def update_client(
    client_id: int,
    payload: ClientIn,
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    client = await db.get(Client, client_id)
    if not client:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Client nahi mila")

    for key, value in payload.model_dump().items():
        setattr(client, key, value)

    await db.commit()
    await db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=204)
async def delete_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user),
):
    client = await db.get(Client, client_id)
    if not client:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Client nahi mila")

    await db.delete(client)
    await db.commit()