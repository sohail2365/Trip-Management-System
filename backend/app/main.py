from fastapi import FastAPI
from app.routers import (
    auth, clients, fuel, vehicles, drivers, conductors,
    trips, dashboard, settings, receipts, maintenance, reports,
    staff_payments, routes,
)

app = FastAPI(title="TMS Backend")

app.include_router(auth.router, prefix="/api")
app.include_router(clients.router, prefix="/api")
app.include_router(fuel.router, prefix="/api")
app.include_router(vehicles.router, prefix="/api")
app.include_router(drivers.router, prefix="/api")
app.include_router(conductors.router, prefix="/api")
app.include_router(trips.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(receipts.router, prefix="/api")
app.include_router(maintenance.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(staff_payments.router, prefix="/api")
app.include_router(routes.router, prefix="/api")

@app.get("/")
def home():
    return {"message": "Salam! TMS Backend chal raha hai"}