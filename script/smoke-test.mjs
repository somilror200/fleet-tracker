const baseUrl = process.env.BASE_URL || "http://127.0.0.1:5000";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return { res, body };
}

async function expectStatus(path, status, options = {}) {
  const result = await request(path, options);
  assert(
    result.res.status === status,
    `${options.method || "GET"} ${path}: expected ${status}, got ${result.res.status} (${JSON.stringify(result.body)})`,
  );
  return result.body;
}

function vehiclePayload(overrides = {}) {
  return {
    plate: `QA-${Date.now()}`,
    name: "QA Test Truck",
    type: "truck",
    status: "idle",
    driverId: null,
    mileageKm: 1000,
    fuelPercent: 90,
    lat: -37.75,
    lng: 144.6,
    heading: 0,
    speedKmh: 0,
    ...overrides,
  };
}

function driverPayload(overrides = {}) {
  return {
    name: "QA Test Driver",
    licenseNumber: `QA-LIC-${Date.now()}`,
    phone: "0400 000 000",
    status: "available",
    vehicleId: null,
    ...overrides,
  };
}

async function main() {
  console.log(`[smoke] Testing ${baseUrl}`);

  const health = await expectStatus("/api/health", 200);
  assert(health?.status === "ok", "Health endpoint did not return status=ok");
  assert(health.counts.vehicles >= 1, "Seeded vehicles are missing");
  assert(health.counts.drivers >= 1, "Seeded drivers are missing");

  const vehicles = await expectStatus("/api/vehicles", 200);
  const drivers = await expectStatus("/api/drivers", 200);
  const trips = await expectStatus("/api/trips", 200);
  const alerts = await expectStatus("/api/alerts", 200);
  assert(Array.isArray(vehicles) && Array.isArray(drivers) && Array.isArray(trips) && Array.isArray(alerts), "List endpoints must return arrays");

  await expectStatus("/api/vehicles/not-a-number", 400);
  await expectStatus("/api/definitely-not-a-route", 404);
  await expectStatus("/api/vehicles", 400, {
    method: "POST",
    body: JSON.stringify({ name: "Missing required fields" }),
  });
  await expectStatus("/api/vehicles", 400, {
    method: "POST",
    body: JSON.stringify(vehiclePayload({ status: "active" })),
  });
  await expectStatus("/api/drivers", 400, {
    method: "POST",
    body: JSON.stringify(driverPayload({ status: "on_trip" })),
  });

  let vehicleId;
  let driverId;
  let tripId;

  try {
    const vehicle = await expectStatus("/api/vehicles", 201, {
      method: "POST",
      body: JSON.stringify(vehiclePayload()),
    });
    vehicleId = vehicle.id;

    const driver = await expectStatus("/api/drivers", 201, {
      method: "POST",
      body: JSON.stringify(driverPayload()),
    });
    driverId = driver.id;

    const assignedVehicle = await expectStatus(`/api/vehicles/${vehicleId}`, 200, {
      method: "PATCH",
      body: JSON.stringify({ driverId }),
    });
    assert(assignedVehicle.driverId === driverId, "Vehicle did not retain driver assignment");

    const assignedDriver = (await expectStatus("/api/drivers", 200)).find((d) => d.id === driverId);
    assert(assignedDriver?.vehicleId === vehicleId, "Driver reverse assignment was not synchronized");

    const unassignedDriver = await expectStatus(`/api/drivers/${driverId}`, 200, {
      method: "PATCH",
      body: JSON.stringify({ vehicleId: null }),
    });
    assert(unassignedDriver.vehicleId === null, "Driver could not be unassigned");
    const unassignedVehicle = await expectStatus(`/api/vehicles/${vehicleId}`, 200);
    assert(unassignedVehicle.driverId === null, "Vehicle reverse assignment was not cleared");

    await expectStatus(`/api/drivers/${driverId}`, 200, {
      method: "PATCH",
      body: JSON.stringify({ vehicleId }),
    });

    const trip = await expectStatus("/api/trips", 201, {
      method: "POST",
      body: JSON.stringify({
        vehicleId,
        driverId,
        startLocation: "QA Melbourne Depot",
        endLocation: "QA Ballarat Depot",
        startTime: new Date().toISOString(),
        endTime: null,
        distanceKm: 110,
        status: "in_progress",
      }),
    });
    tripId = trip.id;

    const activeVehicle = await expectStatus(`/api/vehicles/${vehicleId}`, 200);
    const activeDriver = (await expectStatus("/api/drivers", 200)).find((d) => d.id === driverId);
    assert(activeVehicle.status === "active", "Starting a trip did not activate vehicle");
    assert(activeDriver?.status === "on_trip", "Starting a trip did not put driver on trip");

    await expectStatus("/api/trips", 409, {
      method: "POST",
      body: JSON.stringify({
        vehicleId,
        driverId,
        startLocation: "Duplicate",
        endLocation: "Duplicate",
        startTime: new Date().toISOString(),
        endTime: null,
        distanceKm: 10,
        status: "in_progress",
      }),
    });

    await expectStatus(`/api/vehicles/${vehicleId}`, 409, {
      method: "PATCH",
      body: JSON.stringify({ driverId: null }),
    });
    await expectStatus(`/api/drivers/${driverId}`, 409, {
      method: "PATCH",
      body: JSON.stringify({ status: "available" }),
    });
    await expectStatus(`/api/vehicles/${vehicleId}`, 409, { method: "DELETE" });
    await expectStatus(`/api/drivers/${driverId}`, 409, { method: "DELETE" });

    const completed = await expectStatus(`/api/trips/${tripId}`, 200, {
      method: "PATCH",
      body: JSON.stringify({ status: "completed" }),
    });
    assert(completed.status === "completed" && completed.endTime, "Completing trip did not set an end time");

    const stoppedVehicle = await expectStatus(`/api/vehicles/${vehicleId}`, 200);
    const availableDriver = (await expectStatus("/api/drivers", 200)).find((d) => d.id === driverId);
    assert(stoppedVehicle.status === "idle", "Completing trip did not return vehicle to idle");
    assert(stoppedVehicle.speedKmh === 0, "Completing trip did not stop vehicle speed");
    assert(availableDriver?.status === "available", "Completing trip did not release driver");

    const completedMileage = stoppedVehicle.mileageKm;
    await sleep(3500);
    const afterTrackingTick = await expectStatus(`/api/vehicles/${vehicleId}`, 200);
    assert(afterTrackingTick.status === "idle", "Completed vehicle became active again after a simulation tick");
    assert(afterTrackingTick.speedKmh === 0, "Completed vehicle started moving again after a simulation tick");
    assert(afterTrackingTick.mileageKm === completedMileage, "Completed vehicle mileage changed after a simulation tick");

    await expectStatus(`/api/trips/${tripId}`, 409, {
      method: "PATCH",
      body: JSON.stringify({ status: "in_progress" }),
    });

    const openAlert = (await expectStatus("/api/alerts", 200)).find((a) => !a.resolved);
    if (openAlert) {
      const resolved = await expectStatus(`/api/alerts/${openAlert.id}/resolve`, 200, { method: "PATCH" });
      assert(resolved.resolved === true, "Alert resolution failed");
    }

    await expectStatus(`/api/drivers/${driverId}`, 204, { method: "DELETE" });
    driverId = undefined;
    const vehicleAfterDriverDelete = await expectStatus(`/api/vehicles/${vehicleId}`, 200);
    assert(vehicleAfterDriverDelete.driverId === null, "Deleting driver left a dangling vehicle assignment");

    await expectStatus(`/api/vehicles/${vehicleId}`, 204, { method: "DELETE" });
    vehicleId = undefined;
  } finally {
    if (driverId) await request(`/api/drivers/${driverId}`, { method: "DELETE" });
    if (vehicleId) await request(`/api/vehicles/${vehicleId}`, { method: "DELETE" });
  }

  console.log("[smoke] All API, lifecycle and simulation checks passed");
}

main().catch((err) => {
  console.error("[smoke] FAILED:", err);
  process.exit(1);
});
