/**
 * @fileoverview Route discovery and setup service.
 * This file dynamically scans modules for router files and mounts them
 * onto the main Express application under the `/api` prefix.
 */

import path from "path";
import fs from "fs";
import express, { Express, Router } from "express";
import { logger } from "../utils/logger";

/**
 * @function findRouteFiles
 * @description Recursively finds files that match a pattern (e.g., '*.router.ts')
 * within a specific subfolder ('infrastructure').
 * @param {string} startPath - The root directory to start the search from.
 * @param {string} targetFolder - The name of the subfolder to search within (e.g., 'infrastructure').
 * @param {string} fileSuffix - The suffix of the file to find (e.g., '.router.ts').
 * @returns {string[]} An array of absolute paths to the found router files.
 */
function findRouteFiles(startPath: string, targetFolder: string, fileSuffix: string): string[] {
  const results: string[] = [];

  function explorer(currentDir: string) {
    try {
      const files = fs.readdirSync(currentDir);
      for (const file of files) {
        const filePath = path.join(currentDir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          if (file === targetFolder) {
            fs.readdirSync(filePath).forEach((infraFile) => {
              if (infraFile.endsWith(fileSuffix)) {
                results.push(path.join(filePath, infraFile));
              }
            });
          } else {
            explorer(filePath);
          }
        }
      }
    } catch (err: any) {
      logger(`Error reading directory ${currentDir}: ${err.message}`, "ROUTER_DISCOVERY", "red");
    }
  }

  explorer(startPath);
  return results;
}

/**
 * @function setupRoutes
 * @description Dynamically sets up all application routes.
 * @param {Express} app - The Express application instance.
 */
function setupRoutes(app: Express): void {
  const mainRouter = express.Router();
  const routeFiles = findRouteFiles(
    path.resolve(__dirname, "../../modules"),
    "infrastructure",
    ".router.ts" // Standardized to `.router.ts`
  );

  logger(`Found ${routeFiles.length} route file(s).`, "ROUTER_SETUP", "cyan");

  routeFiles.forEach((routePath) => {
    try {
      const mod = require(routePath);
      const router: Router = mod.default || mod;

      if (typeof router !== 'function' || !router.stack) {
        logger(`Skipping invalid router file: ${routePath}`, "ROUTER_SETUP", "yellow");
        return;
      }
      
      // Extract the module name from the file path.
      // e.g., /.../modules/search/infrastructure/search.router.ts -> "search"
      const routeName = routePath.split(path.sep).find((part, i, arr) => arr[i - 1] === 'modules');
      if (!routeName) {
        logger(`Could not determine route name for: ${routePath}`, "ROUTER_SETUP", "yellow");
        return;
      }

      const basePath = `/${routeName}`;
      mainRouter.use(basePath, router);
      logger(`Mounted router from ${routeName} at /api${basePath}`, "ROUTER_SETUP", "green");

    } catch (err: any) {
      logger(`Error loading router from ${routePath}: ${err.message}`, "ROUTER_SETUP", "red");
    }
  });

  app.use("/api", mainRouter);
}

export default setupRoutes;