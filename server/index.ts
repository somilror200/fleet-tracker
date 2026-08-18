import "dotenv/config";
import express, { Response, NextFunction } from "express";
import type { Request } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "node:http";
import { stopSimulation } from "./simulation";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.disable("x-powered-by");

app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: unknown;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    if (!path.startsWith("/api")) return;

    const duration = Date.now() - start;
    let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;

    // Avoid dumping the large, frequently-polled GET payloads into the terminal.
    if (capturedJsonResponse && (req.method !== "GET" || res.statusCode >= 400)) {
      const serialized = JSON.stringify(capturedJsonResponse);
      logLine += ` :: ${serialized.length > 1000 ? `${serialized.slice(0, 1000)}…` : serialized}`;
    }

    log(logLine);
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);
    if (res.headersSent) return next(err);
    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${process.env.PORT}`);
  }

  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on http://localhost:${port}`);
  });

  const shutdown = (signal: string) => {
    log(`${signal} received, shutting down`, "server");
    stopSimulation();
    httpServer.close((err) => {
      if (err) {
        console.error("Failed to close HTTP server cleanly:", err);
        process.exit(1);
      }
      process.exit(0);
    });
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
})().catch((err) => {
  console.error("Fleet Tracker failed to start:", err);
  stopSimulation();
  process.exit(1);
});
