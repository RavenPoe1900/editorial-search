/**
 * @fileoverview Health and readiness probe routes for operational monitoring.
 */

import { Router } from "express";
import { getES } from "../integrations/elasticsearch/es.client";

const router = Router();

/**
 * @route GET /api/health
 * @description Liveness probe - process is up.
 */
router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

/**
 * @route GET /api/readiness
 * @description Readiness probe - checks external dependencies (Elasticsearch).
 */
router.get("/readiness", async (_req, res) => {
  try {
    await getES().ping();
    res.json({ ready: true });
  } catch {
    res.status(503).json({ ready: false });
  }
});

export default router;