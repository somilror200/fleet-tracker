import type { Express } from "express";
import type { Server } from "node:http";
import { storage } from "./storage";
import { seedIfEmpty } from "./seed";
import { startSimulation } from "./simulation";
import {
  insertVehicleSchema,
  insertDriverSchema,
  insertTripSchema,
} from "@shared/schema";

const tripUpdateSchema = insertTripSchema
  .pick({ status: true, endTime: true, distanceKm: true })
  .partial();

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function hasOwn(obj: object, key: string) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  seedIfEmpty();
  startSimulation();

  app.get("/api/health", async (_req, res) => {
    const [vehicleRows, driverRows, tripRows, alertRows] = await Promise.all([
      storage.getVehicles(),
      storage.getDrivers(),
      storage.getTrips(),
      storage.getAlerts(),
    ]);

    res.json({
      status: "ok",
      counts: {
        vehicles: vehicleRows.length,
        drivers: driverRows.length,
        trips: tripRows.length,
        alerts: alertRows.length,
      },
    });
  });

  // ---------- Vehicles ----------
  app.get("/api/vehicles", async (_req, res) => {
    res.json(await storage.getVehicles());
  });

  app.get("/api/vehicles/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid vehicle id" });

    const vehicle = await storage.getVehicle(id);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    res.json(vehicle);
  });

  app.post("/api/vehicles", async (req, res) => {
    const parsed = insertVehicleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    if (parsed.data.status === "active") {
      return res.status(400).json({ message: "New vehicles cannot start active; create a trip to put a vehicle into active service" });
    }

    const requestedDriverId = parsed.data.driverId ?? null;
    if (requestedDriverId !== null) {
      const driver = await storage.getDriver(requestedDriverId);
      if (!driver) return res.status(400).json({ message: "Assigned driver does not exist" });
      if (driver.status !== "available") {
        return res.status(409).json({ message: "Only available drivers can be assigned to a new vehicle" });
      }
    }

    let vehicle = await storage.createVehicle({ ...parsed.data, driverId: null });
    if (requestedDriverId !== null) {
      await storage.assignDriverToVehicle(vehicle.id, requestedDriverId);
      vehicle = (await storage.getVehicle(vehicle.id))!;
    }

    res.status(201).json(vehicle);
  });

  app.patch("/api/vehicles/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid vehicle id" });

    const existing = await storage.getVehicle(id);
    if (!existing) return res.status(404).json({ message: "Vehicle not found" });

    const parsed = insertVehicleSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const activeTrip = await storage.hasInProgressTripForVehicle(id);
    if (activeTrip && parsed.data.status && parsed.data.status !== "active") {
      return res.status(409).json({ message: "Complete the active trip before changing this vehicle out of active service" });
    }
    if (!activeTrip && parsed.data.status === "active") {
      return res.status(409).json({ message: "A vehicle can only be active while it has an in-progress trip" });
    }

    const driverWasProvided = hasOwn(parsed.data, "driverId");
    const requestedDriverId = parsed.data.driverId ?? null;
    if (activeTrip && driverWasProvided && requestedDriverId !== existing.driverId) {
      return res.status(409).json({ message: "Complete the active trip before changing this vehicle's driver" });
    }
    if (driverWasProvided && requestedDriverId !== null) {
      const driver = await storage.getDriver(requestedDriverId);
      if (!driver) return res.status(400).json({ message: "Assigned driver does not exist" });
      if (driver.status !== "available" && driver.id !== existing.driverId) {
        return res.status(409).json({ message: "That driver is not available" });
      }
      if ((await storage.hasInProgressTripForDriver(requestedDriverId)) && driver.vehicleId !== id) {
        return res.status(409).json({ message: "That driver is already on an active trip" });
      }
    }

    const { driverId: _driverId, ...changes } = parsed.data;
    if (Object.keys(changes).length > 0) await storage.updateVehicle(id, changes);
    if (driverWasProvided) await storage.assignDriverToVehicle(id, requestedDriverId);

    res.json(await storage.getVehicle(id));
  });

  app.delete("/api/vehicles/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid vehicle id" });
    if (await storage.hasInProgressTripForVehicle(id)) {
      return res.status(409).json({ message: "Complete the active trip before deleting this vehicle" });
    }

    const ok = await storage.deleteVehicle(id);
    if (!ok) return res.status(404).json({ message: "Vehicle not found" });
    res.status(204).send();
  });

  // ---------- Drivers ----------
  app.get("/api/drivers", async (_req, res) => {
    res.json(await storage.getDrivers());
  });

  app.post("/api/drivers", async (req, res) => {
    const parsed = insertDriverSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    if (parsed.data.status === "on_trip") {
      return res.status(400).json({ message: "New drivers cannot start on-trip; create a trip to put a driver on duty" });
    }

    const requestedVehicleId = parsed.data.vehicleId ?? null;
    if (requestedVehicleId !== null) {
      const vehicle = await storage.getVehicle(requestedVehicleId);
      if (!vehicle) return res.status(400).json({ message: "Assigned vehicle does not exist" });
      if (vehicle.status !== "idle") {
        return res.status(409).json({ message: "Only idle vehicles can be assigned to a new driver" });
      }
    }

    let driver = await storage.createDriver({ ...parsed.data, vehicleId: null });
    if (requestedVehicleId !== null) {
      await storage.assignVehicleToDriver(driver.id, requestedVehicleId);
      driver = (await storage.getDriver(driver.id))!;
    }

    res.status(201).json(driver);
  });

  app.patch("/api/drivers/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid driver id" });

    const existing = await storage.getDriver(id);
    if (!existing) return res.status(404).json({ message: "Driver not found" });

    const parsed = insertDriverSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const activeTrip = await storage.hasInProgressTripForDriver(id);
    if (activeTrip && parsed.data.status && parsed.data.status !== "on_trip") {
      return res.status(409).json({ message: "Complete the active trip before changing this driver's duty status" });
    }
    if (!activeTrip && parsed.data.status === "on_trip") {
      return res.status(409).json({ message: "A driver can only be on-trip while assigned to an in-progress trip" });
    }

    const vehicleWasProvided = hasOwn(parsed.data, "vehicleId");
    const requestedVehicleId = parsed.data.vehicleId ?? null;
    if (activeTrip && vehicleWasProvided && requestedVehicleId !== existing.vehicleId) {
      return res.status(409).json({ message: "Complete the active trip before changing this driver's vehicle" });
    }
    if (vehicleWasProvided && requestedVehicleId !== null) {
      const vehicle = await storage.getVehicle(requestedVehicleId);
      if (!vehicle) return res.status(400).json({ message: "Assigned vehicle does not exist" });
      if (vehicle.status !== "idle" && vehicle.id !== existing.vehicleId) {
        return res.status(409).json({ message: "That vehicle is not idle" });
      }
    }

    const { vehicleId: _vehicleId, ...changes } = parsed.data;
    if (Object.keys(changes).length > 0) await storage.updateDriver(id, changes);
    if (vehicleWasProvided) await storage.assignVehicleToDriver(id, requestedVehicleId);

    res.json(await storage.getDriver(id));
  });

  app.delete("/api/drivers/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid driver id" });
    if (await storage.hasInProgressTripForDriver(id)) {
      return res.status(409).json({ message: "Complete the active trip before deleting this driver" });
    }

    const ok = await storage.deleteDriver(id);
    if (!ok) return res.status(404).json({ message: "Driver not found" });
    res.status(204).send();
  });

  // ---------- Trips ----------
  app.get("/api/trips", async (_req, res) => {
    res.json(await storage.getTrips());
  });

  app.post("/api/trips", async (req, res) => {
    const parsed = insertTripSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    if (parsed.data.status !== "in_progress" || parsed.data.endTime) {
      return res.status(400).json({ message: "New trips must start in progress with no end time" });
    }

    const vehicle = await storage.getVehicle(parsed.data.vehicleId);
    const driver = await storage.getDriver(parsed.data.driverId);
    if (!vehicle) return res.status(400).json({ message: "Vehicle does not exist" });
    if (!driver) return res.status(400).json({ message: "Driver does not exist" });
    if (vehicle.status !== "idle") {
      return res.status(409).json({ message: "Vehicle must be idle before starting a new trip" });
    }
    if (driver.status !== "available") {
      return res.status(409).json({ message: "Driver must be available before starting a new trip" });
    }
    if (await storage.hasInProgressTripForVehicle(vehicle.id)) {
      return res.status(409).json({ message: "Vehicle already has an active trip" });
    }
    if (await storage.hasInProgressTripForDriver(driver.id)) {
      return res.status(409).json({ message: "Driver already has an active trip" });
    }

    const trip = await storage.createTrip({ ...parsed.data, status: "in_progress", endTime: null });
    await storage.assignDriverToVehicle(vehicle.id, driver.id);
    await storage.updateVehicle(vehicle.id, { status: "active" });
    await storage.updateDriver(driver.id, { status: "on_trip" });

    res.status(201).json(trip);
  });

  app.patch("/api/trips/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid trip id" });

    const existing = await storage.getTrip(id);
    if (!existing) return res.status(404).json({ message: "Trip not found" });

    const parsed = tripUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    if (existing.status === "completed" && parsed.data.status === "in_progress") {
      return res.status(409).json({ message: "Completed trips cannot be reopened" });
    }

    const resultingStatus = parsed.data.status ?? existing.status;
    if (parsed.data.endTime) {
      if (resultingStatus !== "completed") {
        return res.status(400).json({ message: "An end time can only be set on a completed trip" });
      }
      const endTimestamp = Date.parse(parsed.data.endTime);
      if (Number.isNaN(endTimestamp) || endTimestamp < Date.parse(existing.startTime)) {
        return res.status(400).json({ message: "Trip end time must be a valid date/time after the start time" });
      }
    }

    const changes = { ...parsed.data };
    if (resultingStatus === "completed") {
      if (hasOwn(parsed.data, "endTime") && parsed.data.endTime === null) {
        changes.endTime = existing.endTime ?? new Date().toISOString();
      } else if (changes.status === "completed" && !changes.endTime) {
        changes.endTime = existing.endTime ?? new Date().toISOString();
      }
    }

    const trip = await storage.updateTrip(id, changes);
    if (!trip) return res.status(404).json({ message: "Trip not found" });

    if (existing.status !== "completed" && trip.status === "completed") {
      await storage.updateDriver(trip.driverId, { status: "available" });
      await storage.updateVehicle(trip.vehicleId, { status: "idle", speedKmh: 0 });
    }

    res.json(trip);
  });

  // ---------- Alerts ----------
  app.get("/api/alerts", async (_req, res) => {
    res.json(await storage.getAlerts());
  });

  app.patch("/api/alerts/:id/resolve", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid alert id" });

    const alert = await storage.resolveAlert(id);
    if (!alert) return res.status(404).json({ message: "Alert not found" });
    res.json(alert);
  });

  app.use("/api/{*path}", (_req, res) => {
    res.status(404).json({ message: "API route not found" });
  });

  return httpServer;
}
