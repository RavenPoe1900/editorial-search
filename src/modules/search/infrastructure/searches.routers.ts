/**
 * @fileoverview Router for the product search endpoint.
 * Wires middleware chain: authentication -> validation -> controller.
 * Authentication is currently enforced; if public access is desired,
 * you can remove the authenticationMiddleware from the chain.
 */

import express from "express";
import { searchProducts } from "./searches.controller";
import validateQueryDto from "../../../_shared/middlewares/validate/dtoQuery.validate";
import { searchQueryDto } from "../domain/search.dto";
import authenticationMiddleware from "../../../_shared/middlewares/authentication.middleware";

const router = express.Router();

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Full-text product search
 *     tags: [Search]
 *     description: >
 *       Executes a multi-field full-text search across name, brand, manufacturer, and description.
 *       Returns only products with status PUBLISHED. Supports pagination.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           example: "organic"
 *         description: Search text (minimum 2 characters).
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Zero-based page index.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Page size.
 *     responses:
 *       '200':
 *         description: Paginated list of search results.
 *       '400':
 *         description: Invalid query params or deep pagination exceeded.
 *       '401':
 *         description: Unauthorized (missing/invalid token).
 *       '500':
 *         description: Internal server error during search execution.
 */
router.get(
  "/",
  authenticationMiddleware,
  validateQueryDto(searchQueryDto),
  searchProducts
);

export default router;