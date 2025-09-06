/**
 * @fileoverview Defines the router for the /search endpoint.
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
 *     summary: Search for products
 *     tags: [Search]
 *     description: >
 *       Performs a full-text search for products based on a query string.
 *       The search is performed on the 'name', 'brand', and 'description' fields.
 *       Results are paginated.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           example: "organic coffee"
 *         description: The search term. Minimum 2 characters.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *         description: The page number for pagination (0-indexed).
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: The number of results per page.
 *     responses:
 *       '200':
 *         description: A paginated list of products matching the search query.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "60d0fe4f5311236168a109ca"
 *                       score:
 *                         type: number
 *                         example: 12.345
 *                       name:
 *                         type: string
 *                         example: "Organic Fair-Trade Coffee"
 *                       brand:
 *                         type: string
 *                         example: "EcoBean"
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 1
 *                     page:
 *                       type: integer
 *                       example: 0
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     totalPages:
 *                       type: integer
 *                       example: 1
 *       '400':
 *         description: Bad Request. Invalid or missing query parameters.
 *       '401':
 *         description: Unauthorized. A valid JWT token is required.
 */
router.get(
  "/", // The base path is `/search`, so this becomes `/api/search`
  authenticationMiddleware,
  validateQueryDto(searchQueryDto),
  searchProducts
);

export default router;