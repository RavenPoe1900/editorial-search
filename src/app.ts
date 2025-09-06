/**
 * @fileoverview The main entry point for the application.
 * This file configures the Express server, initializes middleware, sets up routes,
 * manages connections to external services (Elasticsearch, RabbitMQ),
 * and starts the server.
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
import { ensureESConnectivity } from "./_shared/integrations/elasticsearch/es.client";
import { startConsumer, stopConsumer } from "./modules/event-consumer/application/event-consumer.service";

const app: Express = express();
const port = config.PORT;

// --- Essential Middleware Setup ---
app.use(cookieParser());
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true,
}));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(jsonSyntaxErrorHandler); // Custom middleware for JSON syntax errors

/**
 * @function initializeDependencies
 * @description Ensures connectivity to all external services before starting the application.
 * It attempts to connect to Elasticsearch and start the RabbitMQ consumer, with retry logic.
 * If any essential connection fails after all retries, the application will not start.
 * @throws {Error} If it fails to connect to an essential service.
 */
async function initializeDependencies(): Promise<void> {
  logger("Initializing external dependencies...", "BOOTSTRAP", "cyan");
  await ensureESConnectivity({
    retries: config.STARTUP_RETRIES,
    delayMs: config.STARTUP_RETRY_DELAY_MS,
  });
  await startConsumer(); // The RabbitMQ consumer includes its own retry logic.
  logger("All dependencies initialized successfully.", "BOOTSTRAP", "green");
}

/**
 * @function main
 * @description The main function that orchestrates the application startup.
 */
async function main(): Promise<void> {
  try {
    // 1. Connect to external services
    await initializeDependencies();

    // 2. Set up application routes and Swagger documentation
    setupRoutes(app);
    setupSwagger(app, port);

    // 3. Set up the global error handler (must be the last middleware)
    app.use(errorHandler);

    // 4. Start the server to accept HTTP requests
    const server = app.listen(port, () => {
      logger(`Server is running at http://localhost:${port}`, "SERVER", "magenta");
      logger(`API documentation available at http://localhost:${port}/api-docs`, "SERVER", "magenta");
    });

    // --- Graceful Shutdown Management ---
    const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        logger(`Received ${signal}. Shutting down gracefully...`, "SERVER", "yellow");
        
        server.close(async () => {
          logger("HTTP server closed.", "SERVER", "yellow");
          
          // Stop the RabbitMQ consumer
          await stopConsumer();
          
          process.exit(0);
        });
      });
    });

  } catch (err: any) {
    logger(`Failed to initialize application: ${err.message}`, "FATAL", "red");
    process.exit(1);
  }
}

// Start the application
main();

export default app;