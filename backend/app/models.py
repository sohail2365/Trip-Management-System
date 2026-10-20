from datetime import date
from sqlalchemy import String, Float, Numeric, Date, ForeignKey, Integer, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    password: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="admin")


class Client(Base):
    __tablename__ = "clients"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    phone: Mapped[str] = mapped_column(String(20))
    cnic: Mapped[str | None] = mapped_column(String(20), nullable=True)


class FuelRate(Base):
    __tablename__ = "fuel_rates"
    id: Mapped[int] = mapped_column(primary_key=True)
    rate_date: Mapped[date] = mapped_column(Date, unique=True, index=True)
    rate_pkr: Mapped[float] = mapped_column(Float)
    source: Mapped[str] = mapped_column(String(30), default="manual")


class Vehicle(Base):
    __tablename__ = "vehicles"
    id: Mapped[int] = mapped_column(primary_key=True)
    reg_no: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    diary_number: Mapped[str | None] = mapped_column(
        String(30), unique=True, index=True, nullable=True
    )
    model: Mapped[str] = mapped_column(String(80))
    mileage_kmpl: Mapped[float] = mapped_column(Float, default=4.0)


class Driver(Base):
    __tablename__ = "drivers"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    phone: Mapped[str] = mapped_column(String(20))
    monthly_salary: Mapped[float] = mapped_column(Numeric(12, 2), default=0)


class Conductor(Base):
    __tablename__ = "conductors"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    phone: Mapped[str] = mapped_column(String(20))
    monthly_salary: Mapped[float] = mapped_column(Numeric(12, 2), default=0)


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"))

    booking_date: Mapped[date] = mapped_column(Date)
    travel_date: Mapped[date] = mapped_column(Date, index=True)
    travel_time: Mapped[str | None] = mapped_column(String(20), nullable=True)
    travel_day: Mapped[str | None] = mapped_column(String(15), nullable=True)
    shift: Mapped[str] = mapped_column(String(10), default="day")

    tour_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tour_nights: Mapped[int | None] = mapped_column(Integer, nullable=True)

    source: Mapped[str] = mapped_column(String(150))
    destination: Mapped[str] = mapped_column(String(150))
    distance_km: Mapped[float] = mapped_column(Float)
    is_round_trip: Mapped[bool] = mapped_column(Boolean, default=False)

    client_rent: Mapped[float] = mapped_column(Numeric(12, 2))
    shift_extra: Mapped[float] = mapped_column(Numeric(12, 2), default=0)

    net_profit: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    status: Mapped[str] = mapped_column(String(20), default="scheduled")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Deprecated (kept for backup)
    vehicle_id: Mapped[int | None] = mapped_column(ForeignKey("vehicles.id"), nullable=True)
    driver_id: Mapped[int | None] = mapped_column(ForeignKey("drivers.id"), nullable=True)
    conductor_id: Mapped[int | None] = mapped_column(ForeignKey("conductors.id"), nullable=True)
    mileage_kmpl: Mapped[float | None] = mapped_column(Float, nullable=True)
    diesel_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    fuel_expense: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    salary: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    conductor_salary: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    toll: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    allowance: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    extra: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)

    vehicles: Mapped[list["TripVehicle"]] = relationship(
        back_populates="trip",
        cascade="all, delete-orphan",
        order_by="TripVehicle.order_no",
    )
    waypoints: Mapped[list["TripWaypoint"]] = relationship(
        back_populates="trip",
        cascade="all, delete-orphan",
        order_by="TripWaypoint.order_no",
    )


class TripVehicle(Base):
    __tablename__ = "trip_vehicles"
    id: Mapped[int] = mapped_column(primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"))
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"))
    driver_id: Mapped[int] = mapped_column(ForeignKey("drivers.id"))
    conductor_id: Mapped[int | None] = mapped_column(ForeignKey("conductors.id"), nullable=True)

    mileage_kmpl: Mapped[float] = mapped_column(Numeric(8, 2), default=4)
    diesel_rate: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    fuel_expense: Mapped[float] = mapped_column(Numeric(12, 2), default=0)

    # Per-vehicle expenses
    salary: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    conductor_salary: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    toll: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    allowance: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    extra: Mapped[float] = mapped_column(Numeric(12, 2), default=0)

    order_no: Mapped[int] = mapped_column(Integer, default=1)

    trip: Mapped[Trip] = relationship(back_populates="vehicles")


class TripWaypoint(Base):
    __tablename__ = "trip_waypoints"
    id: Mapped[int] = mapped_column(primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"))
    stop_name: Mapped[str] = mapped_column(String(150))
    order_no: Mapped[int] = mapped_column(Integer)
    arrival_time: Mapped[str | None] = mapped_column(String(20), nullable=True)

    trip: Mapped[Trip] = relationship(back_populates="waypoints")


class VehicleMaintenance(Base):
    __tablename__ = "vehicle_maintenance"
    id: Mapped[int] = mapped_column(primary_key=True)
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id", ondelete="CASCADE"), index=True)
    maintenance_date: Mapped[date] = mapped_column(Date, index=True)
    maintenance_type: Mapped[str] = mapped_column(String(30))
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    odometer_km: Mapped[int | None] = mapped_column(Integer, nullable=True)
    vendor: Mapped[str | None] = mapped_column(String(100), nullable=True)


class AppSettings(Base):
    __tablename__ = "app_settings"
    id: Mapped[int] = mapped_column(primary_key=True)
    bus_service_name: Mapped[str] = mapped_column(String(150), default="")
    owner_name: Mapped[str] = mapped_column(String(100), default="")
    owner_phone_1: Mapped[str] = mapped_column(String(20), default="")
    owner_phone_2: Mapped[str | None] = mapped_column(String(20), nullable=True)
    receipt_footer_text: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    day_shift_extra: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    night_shift_extra: Mapped[float] = mapped_column(Numeric(12, 2), default=0)


class StaffPayment(Base):
    __tablename__ = "staff_payments"
    id: Mapped[int] = mapped_column(primary_key=True)
    staff_type: Mapped[str] = mapped_column(String(20), index=True)
    staff_id: Mapped[int] = mapped_column(Integer, index=True)
    payment_date: Mapped[date] = mapped_column(Date, index=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    payment_method: Mapped[str] = mapped_column(String(20), default="cash")
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # NEW
    trip_id: Mapped[int | None] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"), nullable=True, index=True
    )
    source: Mapped[str] = mapped_column(String(20), default="manual")  # 'trip' | 'manual'


class Receipt(Base):
    __tablename__ = "receipts"
    id: Mapped[int] = mapped_column(primary_key=True)
    receipt_number: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    receipt_date: Mapped[date] = mapped_column(Date, index=True)
    travel_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    travel_time: Mapped[str | None] = mapped_column(String(20), nullable=True)
    travel_day: Mapped[str | None] = mapped_column(String(15), nullable=True)
    tour_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tour_nights: Mapped[int | None] = mapped_column(Integer, nullable=True)

    client_id: Mapped[int | None] = mapped_column(ForeignKey("clients.id"), nullable=True)
    trip_id: Mapped[int | None] = mapped_column(ForeignKey("trips.id"), nullable=True)

    client_name: Mapped[str] = mapped_column(String(100))
    client_phone: Mapped[str] = mapped_column(String(20))
    client_phone_alt: Mapped[str | None] = mapped_column(String(20), nullable=True)

    route_from: Mapped[str] = mapped_column(String(100))
    route_to: Mapped[str] = mapped_column(String(100))
    bus_number: Mapped[str] = mapped_column(String(200))

    total_amount: Mapped[float] = mapped_column(Numeric(12, 2))
    advance_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    due_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)

    driver_name: Mapped[str] = mapped_column(String(500))
    driver_phone: Mapped[str] = mapped_column(String(500))
    driver_phone_alt: Mapped[str | None] = mapped_column(String(200), nullable=True)

    conductor_name: Mapped[str | None] = mapped_column(String(500), nullable=True)
    conductor_phone: Mapped[str | None] = mapped_column(String(500), nullable=True)
    conductor_phone_alt: Mapped[str | None] = mapped_column(String(200), nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="issued")