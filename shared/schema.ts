import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

const validDateTime = (value: string) => !Number.isNaN(Date.parse(value));

// ---------- Vehicles ----------
export const vehicles = sqliteTable("vehicles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  plate: text("plate").notNull(),
  name: text("name").notNull(),
  type: text("type", { enum: ["truck", "van", "car"] }).notNull(),
  status: text("status", { enum: ["active", "idle", "maintenance"] })
    .notNull()
    .default("idle"),
  driverId: integer("driver_id"),
  mileageKm: real("mileage_km").notNull().default(0),
  fuelPercent: real("fuel_percent").notNull().default(100),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  heading: real("heading").notNull().default(0),
  speedKmh: real("speed_kmh").notNull().default(0),
  updatedAt: text("updated_at").notNull(),
});

export const insertVehicleSchema = createInsertSchema(vehicles, {
  plate: z.string().trim().min(1, "Plate is required"),
  name: z.string().trim().min(1, "Name is required"),
  type: z.enum(["truck", "van", "car"]),
  status: z.enum(["active", "idle", "maintenance"]),
  mileageKm: z.number().min(0),
  fuelPercent: z.number().min(0).max(100),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  heading: z.number().min(0).lt(360),
  speedKmh: z.number().min(0),
}).omit({
  id: true,
  updatedAt: true,
});
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehicles.$inferSelect;

// ---------- Drivers ----------
export const drivers = sqliteTable("drivers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  licenseNumber: text("license_number").notNull(),
  phone: text("phone").notNull(),
  status: text("status", { enum: ["available", "on_trip", "off_duty"] })
    .notNull()
    .default("available"),
  vehicleId: integer("vehicle_id"),
});

export const insertDriverSchema = createInsertSchema(drivers, {
  name: z.string().trim().min(1, "Name is required"),
  licenseNumber: z.string().trim().min(1, "License number is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  status: z.enum(["available", "on_trip", "off_duty"]),
}).omit({
  id: true,
});
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Driver = typeof drivers.$inferSelect;

// ---------- Trips ----------
export const trips = sqliteTable("trips", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vehicleId: integer("vehicle_id").notNull(),
  driverId: integer("driver_id").notNull(),
  startLocation: text("start_location").notNull(),
  endLocation: text("end_location").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time"),
  distanceKm: real("distance_km").notNull().default(0),
  status: text("status", { enum: ["in_progress", "completed"] })
    .notNull()
    .default("in_progress"),
});

export const insertTripSchema = createInsertSchema(trips, {
  vehicleId: z.number().int().positive(),
  driverId: z.number().int().positive(),
  startLocation: z.string().trim().min(1, "Start location is required"),
  endLocation: z.string().trim().min(1, "End location is required"),
  startTime: z.string().refine(validDateTime, "Start time must be a valid date/time"),
  distanceKm: z.number().min(0),
  status: z.enum(["in_progress", "completed"]),
}).omit({
  id: true,
});
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Trip = typeof trips.$inferSelect;

// ---------- Alerts ----------
export const alerts = sqliteTable("alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vehicleId: integer("vehicle_id").notNull(),
  type: text("type", { enum: ["maintenance", "fuel", "speed"] }).notNull(),
  message: text("message").notNull(),
  severity: text("severity", { enum: ["low", "medium", "high"] }).notNull(),
  resolved: integer("resolved", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});

export const insertAlertSchema = createInsertSchema(alerts, {
  vehicleId: z.number().int().positive(),
  type: z.enum(["maintenance", "fuel", "speed"]),
  message: z.string().trim().min(1, "Alert message is required"),
  severity: z.enum(["low", "medium", "high"]),
}).omit({
  id: true,
  createdAt: true,
});
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;
