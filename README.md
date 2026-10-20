# Trip Management System

Transport management software for bus services — trips, receipts, drivers, conductors, fuel, maintenance, and reports.

## Features

- **Trip Management** — multi-stop routes, round trips, tour days, multi-bus convoy
- **Receipts** — auto-fill from trip, bilingual (English/Urdu), print/PDF
- **Fleet Management** — vehicles, drivers, conductors, staff payments ledger
- **Fuel Tracking** — daily rate auto-fetch from PSO, expense calculator
- **Maintenance** — vehicle-wise repair and servicing records
- **Reports** — weekly/monthly/yearly profit and loss

## Tech Stack

**Backend**
- Python 3.12+ / FastAPI
- PostgreSQL (Supabase)
- SQLAlchemy 2.0 (async)
- JWT authentication

**Frontend**
- React 18 + Vite
- Tailwind CSS
- React Router
- Axios

## Setup

### Backend

\\\ash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python -m scripts.migrate
uvicorn app.main:app --reload
\\\

Backend: http://127.0.0.1:8000
API Docs: http://127.0.0.1:8000/docs

### Frontend

\\\ash
cd frontend
npm install
npm run dev
\\\

Frontend: http://localhost:5173
