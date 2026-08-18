# Fleet Tracker

A full-stack fleet management dashboard for a regional Australian transport operator. Fleet Tracker gives dispatchers a single real-time view of vehicle locations, driver assignments, trip logs, and maintenance/fuel alerts across a fleet running the Melbourne–Ballarat corridor in Victoria. It was built as a portfolio project to connect hands-on transport/logistics experience with modern full-stack web development skills.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, wouter, Recharts, react-leaflet
- **Backend:** Node.js, Express, TypeScript
- **Database/ORM:** SQLite via better-sqlite3, Drizzle ORM, Zod (drizzle-zod) for validation
- **Maps:** Leaflet with OpenStreetMap/CARTO dark tiles (no API key required)

## Features

- **Dashboard** — fleet-wide KPIs, live map preview, recent trips, and an alerts feed.
- **Live Map** — interactive vehicle map with heading, status, driver information, and automatic refresh every 3 seconds.
- **Vehicles** — fleet CRUD, health/status information, synchronized driver assignment, and live-updating vehicle details.
- **Drivers** — roster CRUD with licensing/contact information and synchronized vehicle assignment.
- **Trips** — filterable trip log with guarded vehicle/driver availability, start/completion lifecycle, distance, and duration.
- **Alerts** — maintenance, fuel, and speed alerts with severity badges and one-click resolution.
- **Analytics** — Recharts visualizations for distance, fuel level, and fleet utilization.

## Live Tracking Simulation

Fleet Tracker's centerpiece is a simulated real-time GPS feed. Every 3 seconds the backend moves active vehicles through the Melbourne–Ballarat operating region, updating heading, speed, mileage, fuel and alert state. The frontend polls the API on the same interval so the dashboard, vehicle detail view and map update without a manual refresh.

Vehicle telemetry is simulated for demonstration purposes and is not connected to real GPS hardware.

## Requirements

- Node.js 22 or 24
- npm

No external database server, map API key, or `.env` file is required for local development.

## Quick Start

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:5000
```

On a fresh checkout, Fleet Tracker now creates the required SQLite tables automatically before any seed query runs. If the database is empty, it then seeds the demo fleet (6 vehicles, 5 drivers, trips and alerts). The local SQLite files are ignored by Git.

You **do not** need to run `npm run db:push` just to start a fresh checkout. That command remains available when intentionally changing the Drizzle schema during development.

## Verification

Run the TypeScript check and production build:

```bash
npm test
```

The repository also includes an API/lifecycle smoke test:

```bash
npm run test:smoke
```

`test:smoke` expects Fleet Tracker to already be running on `http://127.0.0.1:5000` (or set `BASE_URL`). It checks startup health, seeded data, validation/error responses, vehicle/driver assignment synchronization, trip creation, duplicate-trip protection, trip completion, vehicle stopping, driver release, alert resolution and delete guards.

GitHub Actions runs a clean `npm ci`, type-check, fresh development startup, production build and production smoke test on Node 22 and Node 24.

## Production

```bash
npm run build
npm start
```

Set `PORT` if you need a port other than the default `5000`.

## Useful Commands

```bash
npm run dev        # development server + Vite
npm run check      # TypeScript type-check
npm run build      # production client/server build
npm start          # run the production build
npm run db:push    # intentionally push Drizzle schema changes
npm run test:smoke # API/lifecycle smoke test against a running server
```

## Data Model

- **vehicles** — plate, name, type, operational status, assigned driver, mileage, fuel, GPS position, heading and speed
- **drivers** — name, licence number, phone, duty status and assigned vehicle
- **trips** — vehicle, driver, start/end locations, start/end time, distance and trip status
- **alerts** — vehicle, alert type, message, severity, resolution state and creation time

## Data Integrity Rules

- An active vehicle must have an in-progress trip.
- An `on_trip` driver must have an in-progress trip.
- A new trip requires an idle vehicle and an available driver.
- A vehicle or driver cannot be allocated to two active trips at once.
- Completing a trip returns the vehicle to idle, sets its speed to zero and makes the driver available.
- Vehicle↔driver assignment is synchronized from either edit screen.
- Active-trip vehicles/drivers cannot be deleted or reassigned until the trip is completed.
