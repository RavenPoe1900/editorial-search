/**
 * @fileoverview Configures and sets up Swagger (OpenAPI) documentation.
 */

import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import path from "path";
import { Express } from "express";

/**
 * @function setupSwagger
 * @description Initializes and mounts the Swagger UI middleware.
 * @param {Express} app - The Express application instance.
 * @param {number} port - The port the application is running on.
 */
function setupSwagger(app: Express, port: number): void {
  const swaggerDefinition = {
    openapi: "3.0.0",
    info: {
      title: "Editorial Search API",
      version: "1.0.0",
      description: "API for searching products and managing the search index.",
    },
    servers: [
      { url: `http://localhost:${port}`, description: "Development Server" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter 'Bearer <token>'",
        },
      },
    },
    tags: [
      { name: "Search", description: "Endpoints for querying products" },
      { name: "Health", description: "System health checks" },
    ],
  };

  const swaggerOptions = {
    swaggerDefinition,
    // Path to the API docs, now looking for `.router.ts` files in infrastructure folders
    apis: [path.resolve(__dirname, "../../modules/**/*.router.ts")],
  };

  const swaggerSpecs = swaggerJsdoc(swaggerOptions);

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
    customSiteTitle: "Search API Docs",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
    }
  }));
}

export default setupSwagger;