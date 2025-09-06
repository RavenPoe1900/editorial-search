/**
 * @fileoverview The controller for handling HTTP requests to the search endpoint.
 */

import { Request, Response } from "express";
import SearchService from "../application/search.service";
import type { ServiceResult } from "../../../_shared/service/base.service.types";

// --- FIX ---
// Type imports now correctly point to the `domain/search.types.ts` file.
import type {
  SearchApiRequestQuery,
  ProductSearchHit,
  SearchServiceResponse
} from "../domain/search.type";

/**
 * @function searchProducts
 * @description An Express controller to handle product search requests.
 * It validates input, calls the search service, and formats the response for the client.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @returns {Promise<void>}
 */
export const searchProducts = async (req: Request, res: Response): Promise<void> => {
  // The query parameters have already been validated and typed by middleware.
  const { q, page, limit } = req.query as unknown as SearchApiRequestQuery;

  const result: ServiceResult<SearchServiceResponse> = await SearchService.searchProducts(q, page, limit);

  if (result.status >= 400 || !result.data) {
    res.status(result.status).json({
      error: { message: result.error || "An unknown error occurred." },
    });
    return;
  }
  
  // Type guard to ensure `result.data` is not an array, which `ServiceResult` allows.
  if (Array.isArray(result.data)) {
    res.status(500).json({ error: { message: "Unexpected response format from search service." } });
    return;
  }

  // Format the response to be user-friendly.
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