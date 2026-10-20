from datetime import date
from typing import Annotated
from pydantic import BaseModel, EmailStr, Field, ConfigDict, BeforeValidator


# ═══════════════════════════════════════════════════════
# TITLE CASE TYPE
# ═══════════════════════════════════════════════════════

def _to_title_case(v):
    """Har word ka pehla capital. Chhote all-caps abbreviations (SA, MR) preserve."""
    if not isinstance(v, str):
        return v

    def convert(word: str) -> str:
        # 3 letters ya kam aur poora uppercase → preserve (e.g. SA, MR, AK)
        if len(word) <= 3 and word.isupper() and word.isalpha():
            return word
        return word.capitalize()

    return " ".join(convert(w) for w in v.split())


TitleStr = Annotated[str, BeforeValidator(_to_title_case)]


def _nullable_title(v):
    if v is None:
        return None
    return _to_title_case(v)


NullableTitleStr = Annotated[str | None, BeforeValidator(_nullable_title)]


# ═══════════ USER / AUTH ═══════════

class UserRegister(BaseModel):
    name: TitleStr = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)
    role: str = "admin"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    role: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ═══════════ CLIENT ═══════════

class ClientIn(BaseModel):
    name: TitleStr = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=7, max_length=20)
    cnic: str | None = Field(default=None, max_length=20)


class ClientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    phone: str
    cnic: str | None


# ═══════════ FUEL ═══════════

class FuelRateIn(BaseModel):
    rate_pkr: float = Field(gt=0)
    rate_date: date | None = None


class FuelRateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    rate_date: date
    rate_pkr: float
    source: str


class FuelCalcIn(BaseModel):
    distance_km: float = Field(gt=0)
    mileage_kmpl: float = Field(gt=0)
    rate_pkr: float | None = None


class FuelCalcOut(BaseModel):
    distance_km: float
    mileage_kmpl: float
    rate_pkr: float
    litres_needed: float
    fuel_expense: float


# ═══════════ VEHICLE ═══════════

class VehicleIn(BaseModel):
    reg_no: str = Field(min_length=3, max_length=30)
    diary_number: str | None = Field(default=None, max_length=30)
    model: TitleStr = Field(min_length=1, max_length=80)
    mileage_kmpl: float = Field(gt=0, default=4.0)


class VehicleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    reg_no: str
    diary_number: str | None
    model: str
    mileage_kmpl: float


# ═══════════ DRIVER ═══════════

class DriverIn(BaseModel):
    name: TitleStr = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=7, max_length=20)
    monthly_salary: float = Field(ge=0, default=0)


class DriverOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    phone: str
    monthly_salary: float


# ═══════════ CONDUCTOR ═══════════

class ConductorIn(BaseModel):
    name: TitleStr = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=7, max_length=20)
    monthly_salary: float = Field(ge=0, default=0)


class ConductorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    phone: str
    monthly_salary: float


# ═══════════ TRIP ═══════════

class WaypointIn(BaseModel):
    stop_name: TitleStr = Field(min_length=1, max_length=150)
    arrival_time: str | None = Field(default=None, max_length=20)


class WaypointOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    stop_name: str
    order_no: int
    arrival_time: str | None


class TripVehicleIn(BaseModel):
    vehicle_id: int
    driver_id: int
    conductor_id: int | None = None
    mileage_kmpl: float = Field(gt=0, default=4.0)
    salary: float = Field(ge=0, default=0)
    conductor_salary: float = Field(ge=0, default=0)
    toll: float = Field(ge=0, default=0)
    allowance: float = Field(ge=0, default=0)
    extra: float = Field(ge=0, default=0)


class TripVehicleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    vehicle_id: int
    driver_id: int
    conductor_id: int | None
    mileage_kmpl: float
    diesel_rate: float
    fuel_expense: float
    salary: float
    conductor_salary: float
    toll: float
    allowance: float
    extra: float
    order_no: int


class TripIn(BaseModel):
    client_id: int

    booking_date: date
    travel_date: date
    travel_time: str | None = None
    travel_day: str | None = None
    shift: str = "day"

    tour_days: int | None = Field(default=None, ge=1)
    tour_nights: int | None = Field(default=None, ge=0)

    source: TitleStr = Field(min_length=2, max_length=150)
    destination: TitleStr = Field(min_length=2, max_length=150)
    distance_km: float = Field(gt=0)
    is_round_trip: bool = False

    client_rent: float = Field(gt=0)
    shift_extra: float = Field(ge=0, default=0)
    notes: str | None = None

    waypoints: list[WaypointIn] = []
    vehicles: list[TripVehicleIn] = Field(min_length=1)


class TripUpdate(BaseModel):
    client_id: int | None = None

    booking_date: date | None = None
    travel_date: date | None = None
    travel_time: str | None = None
    travel_day: str | None = None
    shift: str | None = None

    tour_days: int | None = None
    tour_nights: int | None = None

    source: NullableTitleStr = Field(default=None, min_length=2, max_length=150)
    destination: NullableTitleStr = Field(default=None, min_length=2, max_length=150)
    distance_km: float | None = Field(default=None, gt=0)
    is_round_trip: bool | None = None

    client_rent: float | None = Field(default=None, gt=0)
    shift_extra: float | None = Field(default=None, ge=0)
    notes: str | None = None

    waypoints: list[WaypointIn] | None = None
    vehicles: list[TripVehicleIn] | None = None


class TripOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    client_id: int
    booking_date: date
    travel_date: date
    travel_time: str | None
    travel_day: str | None
    shift: str
    tour_days: int | None
    tour_nights: int | None
    source: str
    destination: str
    distance_km: float
    is_round_trip: bool
    client_rent: float
    shift_extra: float
    net_profit: float
    status: str
    notes: str | None
    waypoints: list[WaypointOut] = []
    vehicles: list[TripVehicleOut] = []


class TripSummary(BaseModel):
    trip_id: int
    source: str
    destination: str
    distance_km: float

    total_fuel: float
    total_driver_salary: float
    total_conductor_salary: float
    total_toll: float
    total_allowance: float
    total_extra: float

    shift_extra: float
    total_expense: float

    client_rent: float
    net_profit: float
    profit_margin_percent: float
    vehicle_count: int
# ═══════════ MAINTENANCE ═══════════

class MaintenanceIn(BaseModel):
    vehicle_id: int
    maintenance_date: date
    maintenance_type: str = Field(min_length=2, max_length=30)
    description: str | None = Field(default=None, max_length=500)
    amount: float = Field(gt=0)
    odometer_km: int | None = Field(default=None, ge=0)
    vendor: NullableTitleStr = Field(default=None, max_length=100)


class MaintenanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    vehicle_id: int
    maintenance_date: date
    maintenance_type: str
    description: str | None
    amount: float
    odometer_km: int | None
    vendor: str | None


# ═══════════ REPORTS ═══════════

class VehicleReportPeriod(BaseModel):
    label: str
    start_date: date
    end_date: date
    trips: int
    distance_km: float
    earnings: float
    fuel_expense: float
    other_expenses: float
    maintenance: float
    total_expense: float
    net_profit: float


class VehicleReport(BaseModel):
    vehicle_id: int
    reg_no: str
    diary_number: str | None
    model: str
    total_trips: int
    total_distance_km: float
    total_earnings: float
    total_fuel: float
    total_other_expenses: float
    total_maintenance: float
    total_expense: float
    total_profit: float
    profit_margin_percent: float
    periods: list[VehicleReportPeriod]


# ═══════════ SETTINGS ═══════════

class SettingsIn(BaseModel):
    bus_service_name: TitleStr = Field(default="", max_length=150)
    owner_name: TitleStr = Field(default="", max_length=100)
    owner_phone_1: str = Field(default="", max_length=20)
    owner_phone_2: str | None = Field(default=None, max_length=20)
    receipt_footer_text: str | None = Field(default=None, max_length=1000)
    address: NullableTitleStr = Field(default=None, max_length=255)
    day_shift_extra: float = Field(ge=0, default=0)
    night_shift_extra: float = Field(ge=0, default=0)


class SettingsOut(SettingsIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ═══════════ STAFF PAYMENTS ═══════════

class StaffPaymentIn(BaseModel):
    staff_type: str = Field(pattern="^(driver|conductor)$")
    staff_id: int
    payment_date: date
    amount: float = Field(gt=0)
    payment_method: str = Field(default="cash", max_length=20)
    notes: str | None = Field(default=None, max_length=500)


class StaffPaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    staff_type: str
    staff_id: int
    payment_date: date
    amount: float
    payment_method: str
    notes: str | None
    trip_id: int | None
    source: str


class StaffPaymentUpdate(BaseModel):
    payment_date: date | None = None
    amount: float | None = Field(default=None, gt=0)
    payment_method: str | None = None
    notes: str | None = None


class StaffSummary(BaseModel):
    staff_type: str
    staff_id: int
    name: str
    phone: str

    total_trips: int
    trip_earnings: float       # sum of source='trip'
    manual_payments: float     # sum of source='manual'
    total_earned: float        # trip_earnings + manual_payments = grand total in ledger

    payments: list[dict]       # unified list, latest first

# ═══════════ RECEIPT ═══════════

class ReceiptIn(BaseModel):
    receipt_date: date
    travel_date: date | None = None
    travel_time: str | None = None
    travel_day: str | None = None
    tour_days: int | None = Field(default=None, ge=1)
    tour_nights: int | None = Field(default=None, ge=0)
    client_id: int | None = None
    trip_id: int | None = None

    client_name: TitleStr = Field(min_length=1, max_length=100)
    client_phone: str = Field(min_length=7, max_length=20)
    client_phone_alt: str | None = Field(default=None, max_length=20)

    route_from: TitleStr = Field(min_length=1, max_length=100)
    route_to: TitleStr = Field(min_length=1, max_length=100)
    bus_number: str = Field(min_length=1, max_length=200)

    total_amount: float = Field(gt=0)
    advance_amount: float = Field(ge=0, default=0)

    driver_name: TitleStr = Field(min_length=1, max_length=500)
    driver_phone: str = Field(min_length=7, max_length=500)
    driver_phone_alt: str | None = Field(default=None, max_length=200)

    conductor_name: NullableTitleStr = Field(default=None, max_length=500)
    conductor_phone: str | None = Field(default=None, max_length=500)
    conductor_phone_alt: str | None = Field(default=None, max_length=200)

    notes: str | None = None
    status: str = "issued"


class ReceiptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    receipt_number: str
    receipt_date: date
    travel_date: date | None
    travel_time: str | None
    travel_day: str | None
    tour_days: int | None
    tour_nights: int | None
    client_id: int | None
    trip_id: int | None
    client_name: str
    client_phone: str
    client_phone_alt: str | None
    route_from: str
    route_to: str
    bus_number: str
    total_amount: float
    advance_amount: float
    due_amount: float
    driver_name: str
    driver_phone: str
    driver_phone_alt: str | None
    conductor_name: str | None
    conductor_phone: str | None
    conductor_phone_alt: str | None
    notes: str | None
    status: str