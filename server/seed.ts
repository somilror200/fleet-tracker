// Seed data for the Fleet Tracker demo: a regional Victoria, Australia
// transport fleet operating along the Melbourne <-> Ballarat corridor.
import { db } from "./storage";
import { vehicles, drivers, trips, alerts } from "@shared/schema";
import { eq } from "drizzle-orm";

const now = () => new Date().toISOString();

export function seedIfEmpty() {
  const existing = db.select().from(vehicles).all();
  if (existing.length > 0) return;

  console.log("[seed] Empty database detected — seeding Fleet Tracker demo data");

  // Melbourne ~ (-37.8136, 144.9631), Ballarat ~ (-37.5622, 143.8503)
  const driverRows = db
    .insert(drivers)
    .values([
      { name: "Liam Carter", licenseNumber: "VIC-HR-88231", phone: "0412 334 221", status: "on_trip", vehicleId: null },
      { name: "Priya Nandan", licenseNumber: "VIC-HR-77120", phone: "0423 991 004", status: "on_trip", vehicleId: null },
      { name: "Jack O'Malley", licenseNumber: "VIC-MR-55871", phone: "0401 552 998", status: "on_trip", vehicleId: null },
      { name: "Sione Taufa", licenseNumber: "VIC-HR-90344", phone: "0433 218 760", status: "available", vehicleId: null },
      { name: "Grace Whelan", licenseNumber: "VIC-LR-42109", phone: "0455 671 320", status: "off_duty", vehicleId: null },
    ])
    .returning()
    .all();

  const [liam, priya, jack, sione, grace] = driverRows;

  const vehicleRows = db
    .insert(vehicles)
    .values([
      {
        plate: "VIC-4821",
        name: "Freightliner 04",
        type: "truck",
        status: "active",
        driverId: liam.id,
        mileageKm: 182430,
        fuelPercent: 78,
        lat: -37.72,
        lng: 144.55,
        heading: 250,
        speedKmh: 88,
        updatedAt: now(),
      },
      {
        plate: "VIC-1190",
        name: "Kenworth T610",
        type: "truck",
        status: "active",
        driverId: priya.id,
        mileageKm: 245110,
        fuelPercent: 54,
        lat: -37.65,
        lng: 144.82,
        heading: 70,
        speedKmh: 92,
        updatedAt: now(),
      },
      {
        plate: "VIC-3307",
        name: "Isuzu NPR Van 02",
        type: "van",
        status: "active",
        driverId: jack.id,
        mileageKm: 98220,
        fuelPercent: 41,
        lat: -37.81,
        lng: 144.96,
        heading: 300,
        speedKmh: 64,
        updatedAt: now(),
      },
      {
        plate: "VIC-7745",
        name: "Freightliner 07",
        type: "truck",
        status: "idle",
        driverId: sione.id,
        mileageKm: 156780,
        fuelPercent: 96,
        lat: -37.56,
        lng: 143.85,
        heading: 90,
        speedKmh: 0,
        updatedAt: now(),
      },
      {
        plate: "VIC-2214",
        name: "Transit Van 09",
        type: "van",
        status: "maintenance",
        driverId: null,
        mileageKm: 210990,
        fuelPercent: 12,
        lat: -37.66,
        lng: 144.28,
        heading: 180,
        speedKmh: 0,
        updatedAt: now(),
      },
      {
        plate: "VIC-5502",
        name: "Hyundai Staria",
        type: "car",
        status: "idle",
        driverId: grace.id,
        mileageKm: 61340,
        fuelPercent: 88,
        lat: -37.81,
        lng: 144.96,
        heading: 0,
        speedKmh: 0,
        updatedAt: now(),
      },
    ])
    .returning()
    .all();

  const [truck4821, truck1190, van3307, truck7745, van2214, car5502] = vehicleRows;

  // Assign vehicles back onto their drivers (mirrors the driverId set above)
  db.update(drivers).set({ vehicleId: truck4821.id }).where(eq(drivers.id, liam.id)).run();
  db.update(drivers).set({ vehicleId: truck1190.id }).where(eq(drivers.id, priya.id)).run();
  db.update(drivers).set({ vehicleId: van3307.id }).where(eq(drivers.id, jack.id)).run();
  db.update(drivers).set({ vehicleId: truck7745.id }).where(eq(drivers.id, sione.id)).run();
  db.update(drivers).set({ vehicleId: car5502.id }).where(eq(drivers.id, grace.id)).run();

  const dayAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000).toISOString();

  db.insert(trips)
    .values([
      {
        vehicleId: truck4821.id,
        driverId: liam.id,
        startLocation: "Melbourne Freight Terminal",
        endLocation: "Ballarat Distribution Centre",
        startTime: dayAgo(1.5),
        endTime: null,
        distanceKm: 58,
        status: "in_progress",
      },
      {
        vehicleId: truck1190.id,
        driverId: priya.id,
        startLocation: "Ballarat Distribution Centre",
        endLocation: "Melbourne Freight Terminal",
        startTime: dayAgo(0.8),
        endTime: null,
        distanceKm: 43,
        status: "in_progress",
      },
      {
        vehicleId: van3307.id,
        driverId: jack.id,
        startLocation: "Melbourne CBD Depot",
        endLocation: "Bacchus Marsh Warehouse",
        startTime: dayAgo(0.4),
        endTime: null,
        distanceKm: 21,
        status: "in_progress",
      },
      {
        vehicleId: truck7745.id,
        driverId: sione.id,
        startLocation: "Ballarat Distribution Centre",
        endLocation: "Melbourne Freight Terminal",
        startTime: dayAgo(30),
        endTime: dayAgo(28.5),
        distanceKm: 111,
        status: "completed",
      },
      {
        vehicleId: truck4821.id,
        driverId: liam.id,
        startLocation: "Melbourne Freight Terminal",
        endLocation: "Ballarat Distribution Centre",
        startTime: dayAgo(52),
        endTime: dayAgo(50.2),
        distanceKm: 112,
        status: "completed",
      },
      {
        vehicleId: van2214.id,
        driverId: grace.id,
        startLocation: "Melbourne CBD Depot",
        endLocation: "Ballarat Service Centre",
        startTime: dayAgo(76),
        endTime: dayAgo(74.3),
        distanceKm: 108,
        status: "completed",
      },
      {
        vehicleId: truck1190.id,
        driverId: priya.id,
        startLocation: "Ballarat Distribution Centre",
        endLocation: "Melbourne Freight Terminal",
        startTime: dayAgo(101),
        endTime: dayAgo(99.4),
        distanceKm: 113,
        status: "completed",
      },
      {
        vehicleId: car5502.id,
        driverId: grace.id,
        startLocation: "Melbourne CBD Depot",
        endLocation: "Melton Site Office",
        startTime: dayAgo(125),
        endTime: dayAgo(124.2),
        distanceKm: 34,
        status: "completed",
      },
    ])
    .run();

  db.insert(alerts)
    .values([
      {
        vehicleId: van2214.id,
        type: "maintenance",
        message: "Scheduled service overdue by 1,200 km",
        severity: "high",
        resolved: false,
        createdAt: dayAgo(4),
      },
      {
        vehicleId: van2214.id,
        type: "fuel",
        message: "Fuel level critical — 12% remaining",
        severity: "high",
        resolved: false,
        createdAt: dayAgo(1),
      },
      {
        vehicleId: truck1190.id,
        type: "fuel",
        message: "Fuel level below 55% — refuel before Ballarat leg",
        severity: "medium",
        resolved: false,
        createdAt: dayAgo(2),
      },
      {
        vehicleId: truck4821.id,
        type: "speed",
        message: "Speed briefly exceeded 100 km/h on Western Hwy",
        severity: "low",
        resolved: true,
        createdAt: dayAgo(20),
      },
      {
        vehicleId: truck7745.id,
        type: "maintenance",
        message: "Tyre pressure sensor warning cleared after inspection",
        severity: "low",
        resolved: true,
        createdAt: dayAgo(60),
      },
    ])
    .run();

  console.log("[seed] Seed complete: 6 vehicles, 5 drivers, 8 trips, 5 alerts");
}
