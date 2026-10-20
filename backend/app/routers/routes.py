from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.deps import current_user
from app.integrations.routing import calculate_route

router = APIRouter(prefix="/routes", tags=["Routes"])


class RouteCalcIn(BaseModel):
    source: str = Field(min_length=2, max_length=150)
    destination: str = Field(min_length=2, max_length=150)
    waypoints: list[str] = []
    country: str = "Pakistan"


class CoordOut(BaseModel):
    lat: float
    lng: float


class WaypointCoordOut(CoordOut):
    name: str


class RouteCalcOut(BaseModel):
    source: str
    destination: str
    waypoints: list[str]
    source_coords: CoordOut
    destination_coords: CoordOut
    waypoint_coords: list[WaypointCoordOut]
    distance_km: float
    eta_hours: float
    polyline: str | None = None


@router.post("/calculate", response_model=RouteCalcOut)
async def calculate(payload: RouteCalcIn, user=Depends(current_user)):
    """
    Source → Destination (with optional waypoints) ka distance aur ETA nikalo.
    Free APIs use karta hai — koi key nahi chahiye.
    """
    try:
        result = await calculate_route(
            source=payload.source,
            destination=payload.destination,
            waypoints=payload.waypoints,
            country=payload.country,
        )
        return result
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    except Exception as e:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            f"Route calculate nahi hua: {e}",
        )