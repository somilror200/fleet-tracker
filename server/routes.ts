import type { Express } from "express";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { storage } from "./storage";
import { seedIfEmpty } from "./seed";
import { startSimulation } from "./simulation";
import {
  insertVehicleSchema,
  insertDriverSchema,
  insertTripSchema,
} from "@shared/schema";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  seedIfEmpty();
  startSimulation();

  // ---------- Vehicles ----------
  app.get("/api/vehicles", async (_req, res) => {
    const data = await storage.getVehicles();
    res.json(data);
  });

  app.get("/api/vehicles/:id", async (req, res) => {
    const vehicle = await storage.getVehicle(Number(req.params.id));
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    res.json(vehicle);
  });

  app.post("/api/vehicles", async (req, res) => {
    const parsed = insertVehicleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const vehicle = await storage.createVehicle(parsed.data);
    res.status(201).json(vehicle);
  });

  app.patch("/api/vehicles/:id", async (req, res) => {
    const parsed = insertVehicleSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const vehicle = await storage.updateVehicle(Number(req.params.id), parsed.data);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    res.json(vehicle);
  });

  app.delete("/api/vehicles/:id", async (req, res) => {
    const ok = await storage.deleteVehicle(Number(req.params.id));
    if (!ok) return res.status(404).json({ message: "Vehicle not found" });
    res.status(204).send();
  });

  // ---------- Drivers ----------
  app.get("/api/drivers", async (_req, res) => {
    const data = await storage.getDrivers();
    res.json(data);
  });

  app.post("/api/drivers", async (req, res) => {
    const parsed = insertDriverSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const driver = await storage.createDriver(parsed.data);
    res.status(201).json(driver);
  });

  app.patch("/api/drivers/:id", async (req, res) => {
    const parsed = insertDriverSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const driver = await storage.updateDriver(Number(req.params.id), parsed.data);
    if (!driver) return res.status(404).json({ message: "Driver not found" });
    res.json(driver);
  });

  app.delete("/api/drivers/:id", async (req, res) => {
    const ok = await storage.deleteDriver(Number(req.params.id));
    if (!ok) return res.status(404).json({ message: "Driver not found" });
    res.status(204).send();
  });

  // ---------- Trips ----------
  app.get("/api/trips", async (_req, res) => {
    const data = await storage.getTrips();
    res.json(data);
  });

  app.post("/api/trips", async (req, res) => {
    const parsed = insertTripSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const trip = await storage.createTrip(parsed.data);

    // Starting a trip puts the vehicle into active service and the driver on-trip.
    await storage.updateVehicle(parsed.data.vehicleId, { status: "active" });
    await storage.updateDriver(parsed.data.driverId, {
      status: "on_trip",
      vehicleId: parsed.data.vehicleId,
    });

    res.status(201).json(trip);
  });

  app.patch("/api/trips/:id", async (req, res) => {
    const parsed = insertTripSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const trip = await storage.updateTrip(Number(req.params.id), parsed.data);
    if (!trip) return res.status(404).json({ message: "Trip not found" });

    // Completing a trip frees up the driver.
    if (parsed.data.status === "completed") {
      await storage.updateDriver(trip.driverId, { status: "available" });
    }

    res.json(trip);
  });

  // ---------- Alerts ----------
  app.get("/api/alerts", async (_req, res) => {
    const data = await storage.getAlerts();
    res.json(data);
  });

  app.patch("/api/alerts/:id/resolve", async (req, res) => {
    const alert = await storage.resolveAlert(Number(req.params.id));
    if (!alert) return res.status(404).json({ message: "Alert not found" });
    res.json(alert);
  });

  return httpServer;
}
