# Fleet Tracker

A full-stack fleet management dashboard for a regional Australian transport operator. Fleet Tracker gives dispatchers a single real-time view of vehicle locations, driver assignments, trip logs, and maintenance/fuel alerts across a fleet running the Melbourne–Ballarat corridor in Victoria. It was built as a portfolio project to connect hands-on transport/logistics experience with modern full-stack web development skills.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, wouter, Recharts, react-leaflet
- **Backend:** Node.js, Express, TypeScript
- **Database/ORM:** SQLite via better-sqlite3, Drizzle ORM, Zod (drizzle-zod) for validation
- **Maps:** Leaflet with OpenStreetMap/CARTO dark tiles (no API key required)

## Features

- **Dashboard** — fleet-wide KPIs (active vehicles, total fleet, drivers on duty, open alerts, distance covered today), a live map preview, recent trips, and an alerts feed.
- **Live Map** — full-size interactive map with heading-rotated, status-colored vehicle markers, popups with vehicle detail, and automatic refresh every 3 seconds.
- **Vehicles** — full CRUD for the fleet roster, status badges, and a detail view showing mileage, a fuel gauge, assigned driver, and recent trips per vehicle.
- **Drivers** — CRUD for the driver roster, including license/contact info, status, and vehicle assignment.
- **Trips** — a filterable trip log (by status/vehicle) with route, distance, and duration; create new trips that assign a driver and vehicle and mark the vehicle active.
- **Alerts** — maintenance, fuel, and speed alerts with severity badges and one-click resolution.
- **Analytics** — Recharts visualizations for distance covered per vehicle, fuel level by vehicle, and fleet utilization by status.

## Live Tracking Simulation

Fleet Tracker's centerpiece is a real-time GPS tracking simulation. A backend interval tick (every 3 seconds) moves every active vehicle along a random-walk path within the Melbourne–Ballarat bounding box, updating heading and speed with a plausible highway feel (60–100 km/h), accruing mileage, and slowly draining fuel. Crossing set thresholds (e.g. fuel below 15%, high-speed excursions) automatically raises maintenance/fuel/speed alerts. All state is persisted to SQLite, and the frontend polls the vehicles endpoint with TanStack Query (`refetchInterval: 3000`) so the map, tables, and KPIs update live without a manual refresh.

**Note:** vehicle GPS positions and telemetry are simulated for demonstration purposes — this is not connected to real GPS hardware.

## Setup

```bash
npm install
npm run dev
```

The app seeds its SQLite database automatically on first run (6 vehicles, 5 drivers, a mix of completed and in-progress trips, and a handful of alerts) and serves both the API and the frontend from a single port.

To build and run in production mode:

```bash
npm run build
NODE_ENV=production node dist/index.cjs
```

## Data Model

- **vehicles** — plate, name, type (truck/van/car), status (active/idle/maintenance), assigned driver, mileage, fuel %, GPS position, heading, speed
- **drivers** — name, license number, phone, status (available/on_trip/off_duty), assigned vehicle
- **trips** — vehicle, driver, start/end locations, start/end time, distance, status (in_progress/completed)
- **alerts** — vehicle, type (maintenance/fuel/speed), message, severity, resolved flag
