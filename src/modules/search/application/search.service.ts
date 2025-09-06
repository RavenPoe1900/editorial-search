/**
 * @fileoverview Application-layer service for performing product searches.
 * This class encapsulates:
 *  - Query construction
 *  - Pagination handling
 *  - Editorial visibility filtering
 *  - Defensive guards (e.g., deep pagination protection)
 *
 * RATIONALE:
 * Keeping Elasticsearch access isolated here allows controllers to stay thin,
 * and eases future changes (e.g., migrating to vector search, adding synonyms, etc.).
 */

import { Client } from "@elastic/elasticsearch";
import { getES } from "../../../_shared/integrations/elasticsearch/es.client";
import { logger } from "../../../_shared/utils/logger";
import config from "../../../_shared/config/config";
import type { ServiceResult } from "../../../_shared/service/base.service.types";
import type {
  ProductDocument,
  ProductSearchHit,
  SearchServiceResponse,
} from "../domain/search.type";

/**
 * Deep pagination beyond 10k results is expensive with from+size.
 * For large navigation, a search_after approach would be preferable.
 */
const MAX_RESULT_WINDOW = 10_000;

/**
 * @class SearchService
 * @description Orchestrates full-text search with multi-field queries and editorial filters.
 */
class SearchService {
  /** Reusable Elasticsearch client (singleton). */
  private esClient: Client;
  /** Index name loaded from configuration. */
  private readonly index: string = config.ELASTICSEARCH_PRODUCT_INDEX;

  constructor() {
    this.esClient = getES();
  }

  /**
   * @method searchProducts
   * @description Executes a multi_match query targetting textual fields with boosting.
   *              Restricts results to PUBLISHED documents only.
   * @param {string} query - The raw search text entered by the user.
   * @param {number} page - Zero-based page number.
   * @param {number} limit - Page size (documents per page).
   * @returns {Promise<ServiceResult<SearchServiceResponse>>} Standardized service result.
   *
   * ERROR HANDLING:
   *  - Returns 400 if deep pagination threshold exceeded.
   *  - Returns 500 on unexpected Elasticsearch errors.
   *
   * FUTURE EXTENSIONS:
   *  - Add faceting (aggregations) for brand / manufacturer.
   *  - Add sorting (e.g., by updatedAt or relevancy variants).
   */
  public async searchProducts(
    query: string,
    page: number,
    limit: number
  ): Promise<ServiceResult<SearchServiceResponse>> {
    const from = page * limit;

    // Guard: reject deep pagination before hitting Elasticsearch.
    if (from > MAX_RESULT_WINDOW) {
      return {
        status: 400,
        error: `Pagination window too deep. Adjust page/limit so page*limit <= ${MAX_RESULT_WINDOW}.`
      };
    }

    try {
      const response = await this.esClient.search<ProductDocument>({
        index: this.index,
        from,
        size: limit,
        // A bool query allows combining full-text relevance with filters.
        query: {
          bool: {
            must: [{
              multi_match: {
                query,
                fields: [
                  "name^3",        // Highest weight to product name.
                  "brand^2",       // Secondary emphasis on brand.
                  "manufacturer^2",// Manufacturer relevance (can be adjusted).
                  "description"    // Plain description relevance.
                ],
                fuzziness: "AUTO", // Adds tolerance for minor typos.
              },
            }],
            // Editorial visibility: only published items are searchable.
            filter: [{ term: { status: "PUBLISHED" } }],
          },
        },
      });

      // Extract typed hits safely (response.hits.hits can be empty).
      const hits = (response.hits.hits as ProductSearchHit[]) || [];

      // Total can be a number (older ES) or an object with value (modern ES).
      const total = typeof response.hits.total === "number"
        ? response.hits.total
        : response.hits.total?.value ?? 0;

      const data: SearchServiceResponse = { hits, total };

      return { status: 200, data };
    } catch (error: any) {
      logger(`Elasticsearch search error: ${error.message}`, "SEARCH_SERVICE", "red");
      return { status: 500, error: "Failed to perform search due to a server error." };
    }
  }
}

// Export singleton instance (stateless service).
export default new SearchService();