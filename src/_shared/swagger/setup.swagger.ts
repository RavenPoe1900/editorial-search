import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import path from "path";
import findRoutes from "../service/findRote.service";
import { Express } from "express";

const routes = findRoutes(path.resolve(__dirname, "../../"), "domain", ".swagger.ts");

function setupSwagger(app: Express, port: number) {
  const swaggerDefinition = {
    openapi: "3.0.0",
    info: {
      title: "My API",
      version: "1.0.0",
      description: "API documentation",
    },
    servers: [
      { url: `http://localhost:${port}`, description: "Development" },
      { url: "https://staging.api.example.com", description: "Staging" },
      { url: "https://api.example.com", description: "Production" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Usar: Bearer <access_token>",
        },
        refreshCookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "refreshToken",
          description:
            "Refresh token enviado vía cookie HttpOnly llamada `refreshToken`. Swagger no puede crear cookies HttpOnly; ver descripción del endpoint.",
        },
      },
    },
    tags: [
      { name: "Auth", description: "Autenticación y gestión de tokens" },
      { name: "Users", description: "Usuarios y perfiles" },
      { name: "Health", description: "Health checks y estado del sistema" },
    ],
  };

  const swaggerOptions = {
    swaggerDefinition,
    apis: routes,
  };

  const specs = swaggerJsdoc(swaggerOptions as any);

  const swaggerUiOptions = {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: "none",
      requestInterceptor: (req: any) => {
        req.credentials = "include";
        return req;
      },
    },
    customSiteTitle: "My API Docs",
  };

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions as any));
}

export default setupSwagger;