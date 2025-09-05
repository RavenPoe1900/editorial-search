import path from "path";
import findRoutes from "../service/findRote.service";
import express, { Express } from "express";
import { printEndpoints } from "../utils/logger";

function setupRoot(app: Express) {
  const mainRouter = express.Router();

  const routes = findRoutes(path.resolve(__dirname, "../../"), "infrastructure", ".routers.ts");

  routes.forEach((routePath) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(routePath);
      const route = mod.default || mod;

      if (typeof route !== "function") {
        console.warn(`[Logger] Ruta ignorada (no es un router): ${routePath}`);
        return;
      }

      const baseName = path.basename(routePath);
      const routeName = baseName.replace(/\.routers?\.ts$/i, "").split(".")[0];
      const basePath = `/api/${routeName}`;

      mainRouter.use(`/${routeName}`, route);

      if (route.stack) {
        route.stack.forEach((layer: any) => {
          if (layer.route) {
            const fullPath = basePath + layer.route.path;
            const methods = Object.keys(layer.route.methods).map((m) => m.toUpperCase());
            printEndpoints(fullPath, methods);
          } else if (layer.name === "router") {
            console.log(`[RouterExplorer] Router anidado detectado en /${routeName}, revisa si necesitas más profundidad.`);
          }
        });
      }
    } catch (err) {
      console.error(`Error al cargar ruta ${routePath}:`, err);
    }
  });

  app.use("/api", mainRouter);

  return app;
}

export default setupRoot;