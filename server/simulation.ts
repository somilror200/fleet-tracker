// Live fleet tracking simulation.
// Every tick, active vehicles take a small random-walk step within the
// Melbourne <-> Ballarat operating region, with plausible heading/speed,
// mileage accrual, fuel drain, and threshold-triggered alerts.
import { db, storage } from "./storage";
import { vehicles, alerts } from "@shared/schema";
import { eq } from "drizzle-orm";

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

const KM_PER_DEG_LAT = 111;
function kmPerDegLng(lat: number) {
  return 111.32 * Math.cos((lat * Math.PI) / 180);
}

function hasOpenAlert(vehicleId: number, type: "fuel" | "speed") {
  return db
    .select()
    .from(alerts)
    .where(eq(alerts.vehicleId, vehicleId))
    .all()
    .some((alert) => alert.type === type && !alert.resolved);
}

function ensureLowFuelAlert(vehicleId: number, fuelPercent: number) {
  if (hasOpenAlert(vehicleId, "fuel")) return;
  void storage.createAlert({
    vehicleId,
    type: "fuel",
    message: `Fuel level critical — ${Math.round(fuelPercent)}% remaining`,
    severity: "high",
    resolved: false,
  });
  console.log(`[simulation] Low fuel alert created for vehicle #${vehicleId}`);
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
    // An active trip can remain open after a simulated vehicle has run out of
    // fuel, but the vehicle itself must not continue moving until refuelled.
    if (vehicle.fuelPercent <= 0) {
      db.update(vehicles)
        .set({ speedKmh: 0, updatedAt: new Date().toISOString() })
        .where(eq(vehicles.id, vehicle.id))
        .run();
      ensureLowFuelAlert(vehicle.id, 0);
      continue;
    }

    const turn = (Math.random() - 0.5) * 30;
    const heading = normalizeHeading(vehicle.heading + turn);

    let speed = vehicle.speedKmh + (Math.random() - 0.5) * 10;
    speed = clamp(speed, 55, 100);

    const hours = TICK_MS / 3_600_000;
    const distanceKm = speed * hours;

    const rad = (heading * Math.PI) / 180;
    const dLat = (distanceKm * Math.cos(rad)) / KM_PER_DEG_LAT;
    const dLng = (distanceKm * Math.sin(rad)) / kmPerDegLng(vehicle.lat);

    let lat = vehicle.lat + dLat;
    let lng = vehicle.lng + dLng;

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
    const fuelPercent = clamp(vehicle.fuelPercent - Math.random() * 0.18, 0, 100);
    const outOfFuel = fuelPercent <= 0;

    db.update(vehicles)
      .set({
        lat,
        lng,
        heading: newHeading,
        speedKmh: outOfFuel ? 0 : Math.round(speed * 10) / 10,
        mileageKm: Math.round(mileageKm * 10) / 10,
        fuelPercent: Math.round(fuelPercent * 10) / 10,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(vehicles.id, vehicle.id))
      .run();

    if (fuelPercent < 15) {
      ensureLowFuelAlert(vehicle.id, fuelPercent);
    }

    if (!outOfFuel && speed > 99.5 && Math.random() < 0.015 && !hasOpenAlert(vehicle.id, "speed")) {
      void storage.createAlert({
        vehicleId: vehicle.id,
        type: "speed",
        message: `Speed briefly exceeded ${Math.round(speed)} km/h`,
        severity: "low",
        resolved: false,
      });
    }
  }
}
