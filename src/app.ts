/**
 * @fileoverview Main application bootstrap for the Search API (API B).
 * Responsibilities:
 *  - Configure global middleware (CORS, JSON parsing, etc.)
 *  - Initialize critical external dependencies before accepting traffic.
 *  - Mount health probes early for environment readiness checks.
 *  - Register feature routes & Swagger documentation.
 *  - Manage graceful shutdown to avoid abrupt connection termination.
 *
 * STARTUP ORDER:
 *  1. Create Express app
 *  2. Register core middleware (JSON, CORS, parsers)
 *  3. Mount health endpoints (fast, independent of full readiness)
 *  4. Initialize dependencies (Elasticsearch + RabbitMQ)
 *  5. Mount feature routes and Swagger
 *  6. Start HTTP server
 *  7. Register signal handlers (SIGINT / SIGTERM)
 */

import express, { Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import config from "./_shared/config/config";
import { logger } from "./_shared/utils/logger";
import errorHandler from "./_shared/middlewares/errorHandle.middleware";
import jsonSyntaxErrorHandler from "./_shared/middlewares/validate/json.validate";
import setupSwagger from "./_shared/swagger/setup.swagger";
import setupRoutes from "./_shared/root/setup.root";
import healthRoutes from "./_shared/root/health.routes";
import { ensureESConnectivity, closeES } from "./_shared/integrations/elasticsearch/es.client";
import { startConsumer, stopConsumer } from "./modules/event-consumer/application/event-consumer.service";

const app: Express = express();
const port = config.PORT;

// --- Core Middleware (order matters: parsers before routes) ---
app.use(cookieParser());
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true,
}));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(jsonSyntaxErrorHandler); // Specialized JSON parse error handler (returns 400 for malformed JSON).

// --- Fast-path Probes (do not depend on full readiness) ---
app.use("/api", healthRoutes);

/**
 * @function initializeDependencies
 * @description Establishes connections to external services required for functional readiness.
 * Fails fast if dependencies cannot be reached within configured retry budget.
 */
async function initializeDependencies(): Promise<void> {
  logger("Initializing external dependencies...", "BOOTSTRAP", "cyan");
  await ensureESConnectivity({
    retries: config.STARTUP_RETRIES,
    delayMs: config.STARTUP_RETRY_DELAY_MS,
  });
  await startConsumer(); // RabbitMQ consumer manages its own reconnection.
  logger("All dependencies initialized successfully.", "BOOTSTRAP", "green");
}

/**
 * @function main
 * @description Orchestrates application startup lifecycle.
 */
async function main(): Promise<void> {
  try {
    await initializeDependencies();

    setupRoutes(app);
    setupSwagger(app, port);

    app.use(errorHandler);

    const server = app.listen(port, () => {
      logger(`Server running at http://localhost:${port}`, "SERVER", "magenta");
      logger(`Docs available at http://localhost:${port}/api-docs`, "SERVER", "magenta");
    });

    ["SIGINT", "SIGTERM"].forEach((signal) => {
      process.on(signal, async () => {
        logger(`Received ${signal}. Shutting down gracefully...`, "SERVER", "yellow");
        server.close(async () => {
          logger("HTTP server closed.", "SERVER", "yellow");
          await stopConsumer();
          await closeES();
          process.exit(0);
        });
        // Safety timeout (force exit if hanging)
        setTimeout(() => {
          logger("Forced shutdown after timeout.", "SERVER", "red");
          process.exit(1);
        }, config.SERVER?.gracefulTimeoutMs || 10000).unref();
      });
    });

  } catch (err: any) {
    logger(`Failed to initialize application: ${err.message}`, "FATAL", "red");
    process.exit(1);
  }
}

main();

export default app;