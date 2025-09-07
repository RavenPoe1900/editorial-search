/**
 * @fileoverview Dynamic route registration bootstrap.
 *
 * Responsibilities:
 *  - Discover route definition files inside any <module>/infrastructure/ folder.
 *  - Accept filename suffixes: .root.ts, .router.ts, .routers.ts
 *  - Mount each discovered router at: /api/<moduleName>
 *  - Enumerate and log every concrete HTTP endpoint (method + full path).
 *
 * Assumptions:
 *  - Pure TypeScript runtime (ts-node / tsx). No .js resolution needed.
 *  - Each route file exports an Express.Router as default or module export.
 *
 * Non-goals:
 *  - Hot reload / dynamic watching (external tooling can handle that).
 */

import path from "path";
import express, { Express, Router } from "express";
import { logger } from "../utils/logger";
import { findRoutes } from "../service/findRoutes.service";

/**
 * Mounts all discovered routers and logs their endpoints.
 * @param app Express application instance.
 */
function setupRoot(app: Express) {
  const mainRouter = express.Router();

  // Fixed anchor: always start from project/src
  const srcPath = path.join(process.cwd(), "src");
  const suffixes = [".root.ts", ".router.ts", ".routers.ts"];

  logger(`Route discovery starting at: ${srcPath}`, "ROUTER_SETUP", "blue");
  logger(`Accepted suffixes: ${suffixes.join(", ")}`, "ROUTER_SETUP", "blue");

  const routeFiles = findRoutes({
    startPath: srcPath,
    targetFolder: "infrastructure",
    suffixes,
    log: (msg) => logger(msg, "ROUTER_DISCOVERY", "gray"),
  });

  logger(`Discovered ${routeFiles.length} route file(s).`, "ROUTER_SETUP", "cyan");

  routeFiles.forEach((absFilePath) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(absFilePath);
      const router: Router = mod.default || mod;

      if (typeof router !== "function" || !router.stack) {
        logger(`Skipping file (not an Express Router): ${absFilePath}`, "ROUTER_SETUP", "yellow");
        return;
      }

      // Derive module name: .../src/modules/<moduleName>/infrastructure/<file>.root.ts
      const parts = absFilePath.split(path.sep);
      const modulesIdx = parts.lastIndexOf("modules");
      const moduleName = parts[modulesIdx + 1];

      if (!moduleName) {
        logger(`Could not derive module name from path: ${absFilePath}`, "ROUTER_SETUP", "red");
        return;
      }

      const mountPath = `/${moduleName}`;
      mainRouter.use(mountPath, router);
      logger(`Mounted router: ${absFilePath} -> /api${mountPath}`, "ROUTER_SETUP", "green");

      enumerateRouterEndpoints(router, mountPath);

    } catch (e: any) {
      logger(`Error loading router file ${absFilePath}: ${e.message}`, "ROUTER_SETUP", "red");
    }
  });

  // Attach assembled main router under /api
  app.use("/api", mainRouter);

  // After everything mounted, produce a condensed summary list
  summarizeAllEndpoints(app);

  return app;
}

/**
 * Enumerates endpoints of a Router and logs them.
 * Traverses one nested router level (sufficient for most modular designs).
 */
function enumerateRouterEndpoints(router: Router, mountPath: string) {
  if (!router.stack) return;

  router.stack.forEach((layer: any) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods)
        .filter(m => layer.route.methods[m])
        .map(m => m.toUpperCase())
        .join(", ");
      const fullPath = `/api${mountPath}${layer.route.path}`;
      logger(`  -> ${methods.padEnd(12)} ${fullPath}`, "ROUTER_ENDPOINT", "magenta");
    } else if (layer.name === "router" && layer.handle?.stack) {
      logger(`  Nested router under /api${mountPath} (scanning inner stack)`, "ROUTER_ENDPOINT", "yellow");
      layer.handle.stack.forEach((inner: any) => {
        if (inner.route) {
          const innerMethods = Object.keys(inner.route.methods)
            .filter(m => inner.route.methods[m])
            .map(m => m.toUpperCase())
            .join(", ");
          const innerPath = `/api${mountPath}${inner.route.path}`;
          logger(`    -> ${innerMethods.padEnd(10)} ${innerPath}`, "ROUTER_ENDPOINT", "magenta");
        }
      });
    }
  });
}

/**
 * Walks the mounted app._router stack and prints a consolidated endpoint summary.
 * This helps verify final effective routes after all middlewares/routers are applied.
 */
function summarizeAllEndpoints(app: Express) {
  const stack = (app as any)?._router?.stack;
  if (!Array.isArray(stack)) {
    logger("Cannot summarize endpoints: app._router.stack missing.", "ROUTER_SUMMARY", "red");
    return;
  }

  const endpoints: { method: string; path: string }[] = [];

  const visitLayer = (layer: any, prefix = "") => {
    if (layer.route && layer.route.path) {
      const routePath = prefix + layer.route.path;
      const methods = Object.keys(layer.route.methods)
        .filter(m => layer.route.methods[m])
        .map(m => m.toUpperCase());

      methods.forEach(method => {
        endpoints.push({ method, path: routePath });
      });
    } else if (layer.name === "router" && layer.handle?.stack) {
      const newPrefix = layer.regexp && layer.regexp.fast_slash
        ? prefix
        : prefix + extractPathFromLayer(layer);
      layer.handle.stack.forEach((inner: any) => visitLayer(inner, newPrefix));
    }
  };

  stack.forEach((layer: any) => visitLayer(layer, ""));

  // Filter only /api prefixed endpoints for clarity
  const apiEndpoints = endpoints
    .filter(e => e.path.startsWith("/api/"))
    .sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

  logger("----- API ROUTE SUMMARY BEGIN -----", "ROUTER_SUMMARY", "blue");
  apiEndpoints.forEach(ep => {
    logger(`${ep.method.padEnd(6)} ${ep.path}`, "ROUTER_SUMMARY", "cyan");
  });
  logger("----- API ROUTE SUMMARY END -------", "ROUTER_SUMMARY", "blue");
}

/**
 * Attempts to reconstruct the mount path fragment from a layer's RegExp.
 * This is heuristic; Express stores paths as regex internally.
 */
function extractPathFromLayer(layer: any): string {
  if (!layer.regexp) return "";
  // layer.regexp.toString() sample: /^\\/?search\\/?(?=\\/|$)/i
  const match = layer.regexp.toString().match(/\\\/([^\\^$]+?)\\\/\?\(\?\=|\\\/([^\\^$]+?)\\\/\?/);
  const segment = match?.[1] || match?.[2];
  if (!segment) return "";
  return `/${segment}`;
}

export default setupRoot;