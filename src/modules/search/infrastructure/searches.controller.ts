/**
 * @fileoverview HTTP controller for the search endpoint.
 * Its responsibilities:
 *  - Interpret already-validated query parameters.
 *  - Invoke the application service.
 *  - Normalize the service layer result into an HTTP-friendly shape.
 *  - Handle error propagation consistently.
 *
 * DESIGN CHOICE:
 * Controller remains "thin"—no business logic here. All domain-specific logic
 * lives inside SearchService to simplify future testing and reuse.
 */

import { Request, Response } from "express";
import SearchService from "../application/search.service";
import type { ServiceResult } from "../../../_shared/service/base.service.types";
import type {
  SearchApiRequestQuery,
  ProductSearchHit,
  SearchServiceResponse
} from "../domain/search.type";

/**
 * @function searchProducts
 * @description Handles GET /api/search. Assumes prior validation middleware has ensured
 *              correct shape and defaults for query params.
 * @param req Express request object.
 * @param res Express response object.
 */
export const searchProducts = async (req: Request, res: Response): Promise<void> => {
  // Values are already sanitized and defaulted by Joi-based middleware.
  const { q, page, limit } = req.query as unknown as SearchApiRequestQuery;

  const result: ServiceResult<SearchServiceResponse> =
    await SearchService.searchProducts(q, page, limit);

  // Standard error branch (400, 500, etc.)
  if (result.status >= 400 || !result.data) {
    res.status(result.status).json({
      error: { message: result.error || "An unknown error occurred." },
    });
    return;
  }

  // Defensive: If the service contract changes unexpectedly to array.
  if (Array.isArray(result.data)) {
    res.status(500).json({ error: { message: "Unexpected response format from search service." } });
    return;
  }

  // Response normalization: flatten _source into each item and include score.
  const response = {
    data: result.data.hits.map((hit: ProductSearchHit) => ({
      id: hit._id,
      score: hit._score,
      ...hit._source,
    })),
    pagination: {
      total: result.data.total,
      page,
      limit,
      totalPages: Math.ceil(result.data.total / limit),
    },
  };

  res.status(200).json(response);
};