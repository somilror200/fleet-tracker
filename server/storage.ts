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
import { eq } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

export interface IStorage {
  // Vehicles
  getVehicles(): Promise<Vehicle[]>;
  getVehicle(id: number): Promise<Vehicle | undefined>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: number, vehicle: Partial<InsertVehicle>): Promise<Vehicle | undefined>;
  deleteVehicle(id: number): Promise<boolean>;

  // Drivers
  getDrivers(): Promise<Driver[]>;
  getDriver(id: number): Promise<Driver | undefined>;
  createDriver(driver: InsertDriver): Promise<Driver>;
  updateDriver(id: number, driver: Partial<InsertDriver>): Promise<Driver | undefined>;
  deleteDriver(id: number): Promise<boolean>;

  // Trips
  getTrips(): Promise<Trip[]>;
  getTrip(id: number): Promise<Trip | undefined>;
  createTrip(trip: InsertTrip): Promise<Trip>;
  updateTrip(id: number, trip: Partial<InsertTrip>): Promise<Trip | undefined>;
  deleteTrip(id: number): Promise<boolean>;

  // Alerts
  getAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  resolveAlert(id: number): Promise<Alert | undefined>;
}

export class DatabaseStorage implements IStorage {
  // ---------- Vehicles ----------
  async getVehicles(): Promise<Vehicle[]> {
    return db.select().from(vehicles).all();
  }

  async getVehicle(id: number): Promise<Vehicle | undefined> {
    return db.select().from(vehicles).where(eq(vehicles.id, id)).get();
  }

  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    return db
      .insert(vehicles)
      .values({ ...vehicle, updatedAt: new Date().toISOString() })
      .returning()
      .get();
  }

  async updateVehicle(id: number, vehicle: Partial<InsertVehicle>): Promise<Vehicle | undefined> {
    return db
      .update(vehicles)
      .set({ ...vehicle, updatedAt: new Date().toISOString() })
      .where(eq(vehicles.id, id))
      .returning()
      .get();
  }

  async deleteVehicle(id: number): Promise<boolean> {
    const result = db.delete(vehicles).where(eq(vehicles.id, id)).run();
    return result.changes > 0;
  }

  // ---------- Drivers ----------
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
    const result = db.delete(drivers).where(eq(drivers.id, id)).run();
    return result.changes > 0;
  }

  // ---------- Trips ----------
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

  // ---------- Alerts ----------
  async getAlerts(): Promise<Alert[]> {
    return db.select().from(alerts).all();
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    return db
      .insert(alerts)
      .values({ ...alert, createdAt: new Date().toISOString() })
      .returning()
      .get();
  }

  async resolveAlert(id: number): Promise<Alert | undefined> {
    return db.update(alerts).set({ resolved: true }).where(eq(alerts.id, id)).returning().get();
  }
}

export const storage = new DatabaseStorage();
