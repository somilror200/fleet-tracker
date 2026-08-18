import {
  vehicles,
  drivers,
  trips,
  alerts,
  type Vehicle,
  type InsertVehicle,
  type Driver,
  type InsertDriver,
  type Trip,
  type InsertTrip,
  type Alert,
  type InsertAlert,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { and, eq } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("busy_timeout = 5000");

function initializeDatabase() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plate TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'idle',
      driver_id INTEGER,
      mileage_km REAL NOT NULL DEFAULT 0,
      fuel_percent REAL NOT NULL DEFAULT 100,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      heading REAL NOT NULL DEFAULT 0,
      speed_kmh REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS drivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      license_number TEXT NOT NULL,
      phone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available',
      vehicle_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      driver_id INTEGER NOT NULL,
      start_location TEXT NOT NULL,
      end_location TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      distance_km REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'in_progress'
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT NOT NULL,
      resolved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_trips_vehicle_status ON trips(vehicle_id, status);
    CREATE INDEX IF NOT EXISTS idx_trips_driver_status ON trips(driver_id, status);
    CREATE INDEX IF NOT EXISTS idx_alerts_vehicle_resolved ON alerts(vehicle_id, resolved);
  `);
}

initializeDatabase();

export const db = drizzle(sqlite);

export interface IStorage {
  getVehicles(): Promise<Vehicle[]>;
  getVehicle(id: number): Promise<Vehicle | undefined>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: number, vehicle: Partial<InsertVehicle>): Promise<Vehicle | undefined>;
  deleteVehicle(id: number): Promise<boolean>;
  assignDriverToVehicle(vehicleId: number, driverId: number | null): Promise<boolean>;

  getDrivers(): Promise<Driver[]>;
  getDriver(id: number): Promise<Driver | undefined>;
  createDriver(driver: InsertDriver): Promise<Driver>;
  updateDriver(id: number, driver: Partial<InsertDriver>): Promise<Driver | undefined>;
  deleteDriver(id: number): Promise<boolean>;
  assignVehicleToDriver(driverId: number, vehicleId: number | null): Promise<boolean>;

  getTrips(): Promise<Trip[]>;
  getTrip(id: number): Promise<Trip | undefined>;
  createTrip(trip: InsertTrip): Promise<Trip>;
  updateTrip(id: number, trip: Partial<InsertTrip>): Promise<Trip | undefined>;
  deleteTrip(id: number): Promise<boolean>;
  hasInProgressTripForVehicle(vehicleId: number): Promise<boolean>;
  hasInProgressTripForDriver(driverId: number): Promise<boolean>;

  getAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  resolveAlert(id: number): Promise<Alert | undefined>;
}

const nowIso = () => new Date().toISOString();

export class DatabaseStorage implements IStorage {
  async getVehicles(): Promise<Vehicle[]> {
    return db.select().from(vehicles).all();
  }

  async getVehicle(id: number): Promise<Vehicle | undefined> {
    return db.select().from(vehicles).where(eq(vehicles.id, id)).get();
  }

  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    return db.insert(vehicles).values({ ...vehicle, updatedAt: nowIso() }).returning().get();
  }

  async updateVehicle(id: number, vehicle: Partial<InsertVehicle>): Promise<Vehicle | undefined> {
    return db
      .update(vehicles)
      .set({ ...vehicle, updatedAt: nowIso() })
      .where(eq(vehicles.id, id))
      .returning()
      .get();
  }

  async deleteVehicle(id: number): Promise<boolean> {
    db.update(drivers).set({ vehicleId: null }).where(eq(drivers.vehicleId, id)).run();
    const result = db.delete(vehicles).where(eq(vehicles.id, id)).run();
    return result.changes > 0;
  }

  async assignDriverToVehicle(vehicleId: number, driverId: number | null): Promise<boolean> {
    const vehicle = await this.getVehicle(vehicleId);
    if (!vehicle) return false;

    if (driverId === null) {
      db.update(drivers).set({ vehicleId: null }).where(eq(drivers.vehicleId, vehicleId)).run();
      db.update(vehicles)
        .set({ driverId: null, updatedAt: nowIso() })
        .where(eq(vehicles.id, vehicleId))
        .run();
      return true;
    }

    const driver = await this.getDriver(driverId);
    if (!driver) return false;

    if (driver.vehicleId && driver.vehicleId !== vehicleId) {
      db.update(vehicles)
        .set({ driverId: null, updatedAt: nowIso() })
        .where(and(eq(vehicles.id, driver.vehicleId), eq(vehicles.driverId, driverId)))
        .run();
    }

    db.update(vehicles)
      .set({ driverId: null, updatedAt: nowIso() })
      .where(eq(vehicles.driverId, driverId))
      .run();
    db.update(drivers).set({ vehicleId: null }).where(eq(drivers.vehicleId, vehicleId)).run();
    db.update(vehicles)
      .set({ driverId, updatedAt: nowIso() })
      .where(eq(vehicles.id, vehicleId))
      .run();
    db.update(drivers).set({ vehicleId }).where(eq(drivers.id, driverId)).run();
    return true;
  }

  async getDrivers(): Promise<Driver[]> {
    return db.select().from(drivers).all();
  }

  async getDriver(id: number): Promise<Driver | undefined> {
    return db.select().from(drivers).where(eq(drivers.id, id)).get();
  }

  async createDriver(driver: InsertDriver): Promise<Driver> {
    return db.insert(drivers).values(driver).returning().get();
  }

  async updateDriver(id: number, driver: Partial<InsertDriver>): Promise<Driver | undefined> {
    return db.update(drivers).set(driver).where(eq(drivers.id, id)).returning().get();
  }

  async deleteDriver(id: number): Promise<boolean> {
    db.update(vehicles)
      .set({ driverId: null, updatedAt: nowIso() })
      .where(eq(vehicles.driverId, id))
      .run();
    const result = db.delete(drivers).where(eq(drivers.id, id)).run();
    return result.changes > 0;
  }

  async assignVehicleToDriver(driverId: number, vehicleId: number | null): Promise<boolean> {
    const driver = await this.getDriver(driverId);
    if (!driver) return false;

    if (vehicleId === null) {
      if (driver.vehicleId) {
        db.update(vehicles)
          .set({ driverId: null, updatedAt: nowIso() })
          .where(and(eq(vehicles.id, driver.vehicleId), eq(vehicles.driverId, driverId)))
          .run();
      }
      db.update(drivers).set({ vehicleId: null }).where(eq(drivers.id, driverId)).run();
      return true;
    }

    return this.assignDriverToVehicle(vehicleId, driverId);
  }

  async getTrips(): Promise<Trip[]> {
    return db.select().from(trips).all();
  }

  async getTrip(id: number): Promise<Trip | undefined> {
    return db.select().from(trips).where(eq(trips.id, id)).get();
  }

  async createTrip(trip: InsertTrip): Promise<Trip> {
    return db.insert(trips).values(trip).returning().get();
  }

  async updateTrip(id: number, trip: Partial<InsertTrip>): Promise<Trip | undefined> {
    return db.update(trips).set(trip).where(eq(trips.id, id)).returning().get();
  }

  async deleteTrip(id: number): Promise<boolean> {
    const result = db.delete(trips).where(eq(trips.id, id)).run();
    return result.changes > 0;
  }

  async hasInProgressTripForVehicle(vehicleId: number): Promise<boolean> {
    return !!db
      .select({ id: trips.id })
      .from(trips)
      .where(and(eq(trips.vehicleId, vehicleId), eq(trips.status, "in_progress")))
      .get();
  }

  async hasInProgressTripForDriver(driverId: number): Promise<boolean> {
    return !!db
      .select({ id: trips.id })
      .from(trips)
      .where(and(eq(trips.driverId, driverId), eq(trips.status, "in_progress")))
      .get();
  }

  async getAlerts(): Promise<Alert[]> {
    return db.select().from(alerts).all();
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    return db.insert(alerts).values({ ...alert, createdAt: nowIso() }).returning().get();
  }

  async resolveAlert(id: number): Promise<Alert | undefined> {
    return db.update(alerts).set({ resolved: true }).where(eq(alerts.id, id)).returning().get();
  }
}

export const storage = new DatabaseStorage();
