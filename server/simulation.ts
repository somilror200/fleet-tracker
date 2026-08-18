// Live fleet tracking simulation.
// Every tick, active vehicles take a small random-walk step within the
// Melbourne <-> Ballarat operating region, with plausible heading/speed,
// mileage accrual, fuel drain, and threshold-triggered alerts.
import { db, storage } from "./storage";
import { vehicles, alerts } from "@shared/schema";
import { eq } from "drizzle-orm";

// Bounding box roughly covering the Melbourne <-> Ballarat corridor (VIC, AU)
const BOUNDS = {
  minLat: -37.9,
  maxLat: -37.0,
  minLng: 143.8,
  maxLng: 145.2,
};

const TICK_MS = 3000;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeHeading(deg: number) {
  let h = deg % 360;
  if (h < 0) h += 360;
  return h;
}

// Roughly convert km to degrees of lat/lng at this latitude band.
const KM_PER_DEG_LAT = 111;
function kmPerDegLng(lat: number) {
  return 111.32 * Math.cos((lat * Math.PI) / 180);
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startSimulation() {
  if (intervalHandle) return;

  intervalHandle = setInterval(() => {
    try {
      tick();
    } catch (err) {
      console.error("[simulation] tick failed:", err);
    }
  }, TICK_MS);

  console.log(`[simulation] Live tracking started (tick every ${TICK_MS / 1000}s)`);
}

export function stopSimulation() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

function tick() {
  const activeVehicles = db.select().from(vehicles).where(eq(vehicles.status, "active")).all();

  for (const vehicle of activeVehicles) {
    // Gently steer heading with small random turns (feels like following roads)
    const turn = (Math.random() - 0.5) * 30; // +/-15deg swing
    const heading = normalizeHeading(vehicle.heading + turn);

    // Highway-feel speed: 60-100 km/h, drifting smoothly
    let speed = vehicle.speedKmh + (Math.random() - 0.5) * 10;
    speed = clamp(speed, 55, 100);

    // Distance covered this tick (speed is km/h, tick is TICK_MS ms)
    const hours = TICK_MS / 3_600_000;
    const distanceKm = speed * hours;

    // Move along heading
    const rad = (heading * Math.PI) / 180;
    const dLat = (distanceKm * Math.cos(rad)) / KM_PER_DEG_LAT;
    const dLng = (distanceKm * Math.sin(rad)) / kmPerDegLng(vehicle.lat);

    let lat = vehicle.lat + dLat;
    let lng = vehicle.lng + dLng;

    // Bounce off the bounding box edges by reflecting heading, keeping the
    // fleet visually confined to the Melbourne-Ballarat corridor.
    let newHeading = heading;
    if (lat < BOUNDS.minLat || lat > BOUNDS.maxLat) {
      lat = clamp(lat, BOUNDS.minLat, BOUNDS.maxLat);
      newHeading = normalizeHeading(180 - newHeading);
    }
    if (lng < BOUNDS.minLng || lng > BOUNDS.maxLng) {
      lng = clamp(lng, BOUNDS.minLng, BOUNDS.maxLng);
      newHeading = normalizeHeading(360 - newHeading);
    }

    const mileageKm = vehicle.mileageKm + distanceKm;

    // Fuel drains slowly while driving
    let fuelPercent = vehicle.fuelPercent - Math.random() * 0.18;
    fuelPercent = clamp(fuelPercent, 0, 100);

    db.update(vehicles)
      .set({
        lat,
        lng,
        heading: newHeading,
        speedKmh: Math.round(speed * 10) / 10,
        mileageKm: Math.round(mileageKm * 10) / 10,
        fuelPercent: Math.round(fuelPercent * 10) / 10,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(vehicles.id, vehicle.id))
      .run();

    // Spawn a low-fuel alert once fuel crosses below 15%, if one isn't
    // already open for this vehicle.
    if (fuelPercent < 15) {
      const openFuelAlert = db
        .select()
        .from(alerts)
        .where(eq(alerts.vehicleId, vehicle.id))
        .all()
        .find((a) => a.type === "fuel" && !a.resolved);

      if (!openFuelAlert) {
        storage.createAlert({
          vehicleId: vehicle.id,
          type: "fuel",
          message: `Fuel level critical — ${Math.round(fuelPercent)}% remaining`,
          severity: "high",
          resolved: false,
        });
        console.log(`[simulation] Low fuel alert created for vehicle #${vehicle.id}`);
      }
    }

    // Spawn a speed alert on rare high-speed excursions (skip if one is
    // already open for this vehicle, to avoid flooding the alerts feed).
    if (speed > 99.5 && Math.random() < 0.015) {
      const openSpeedAlert = db
        .select()
        .from(alerts)
        .where(eq(alerts.vehicleId, vehicle.id))
        .all()
        .find((a) => a.type === "speed" && !a.resolved);

      if (!openSpeedAlert) {
        storage.createAlert({
          vehicleId: vehicle.id,
          type: "speed",
          message: `Speed briefly exceeded ${Math.round(speed)} km/h`,
          severity: "low",
          resolved: false,
        });
      }
    }
  }
}
