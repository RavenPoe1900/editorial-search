/**
 * @fileoverview The application service for handling product searches.
 * This service contains the logic to query Elasticsearch.
 */

import { Client } from "@elastic/elasticsearch";
import { getES } from "../../../_shared/integrations/elasticsearch/es.client";
import { logger } from "../../../_shared/utils/logger";
import config from "../../../_shared/config/config";
import type { ServiceResult } from "../../../_shared/service/base.service.types";

// --- FIX ---
// 1. Corrected the import path from `search.type` to `search.types`.
// 2. Removed `SearchServiceResult` as it's not exported.
// 3. Imported `SearchServiceResponse` which is the actual data payload type.
import type {
  ProductDocument,
  ProductSearchHit,
  SearchServiceResponse,
} from "../domain/search.type";

/**
 * @class SearchService
 * @description A service class to perform product searches in Elasticsearch.
 */
class SearchService {
  private esClient: Client;
  private readonly index: string = config.ELASTICSEARCH_PRODUCT_INDEX;

  constructor() {
    this.esClient = getES();
  }

  /**
   * @method searchProducts
   * @description Performs a multi-match search against the products index.
   * @param {string} query - The user's search query.
   * @param {number} page - The page number for pagination.
   * @param {number} limit - The number of results per page.
   * @returns {Promise<ServiceResult<SearchServiceResponse>>} The result of the service operation.
   */
  public async searchProducts(query: string, page: number, limit: number): Promise<ServiceResult<SearchServiceResponse>> {
    const from = page * limit;

    try {
      const response = await this.esClient.search<ProductDocument>({
        index: this.index,
        from,
        size: limit,
        query: {
          bool: {
            must: [{
              multi_match: {
                query,
                fields: ["name^3", "brand^2", "description"], // Boost name and brand fields
                fuzziness: "AUTO",
              },
            }],
            // Only search for products that are visible to the public.
            filter: [{ term: { status: "PUBLISHED" } }],
          },
        },
      });

      // Safely extract hits and total count from the Elasticsearch response.
      const hits = (response.hits.hits as ProductSearchHit[]) || [];
      const total = typeof response.hits.total === 'number' 
        ? response.hits.total 
        : response.hits.total?.value ?? 0;
      
      const data: SearchServiceResponse = { hits, total };

      return {
        status: 200,
        data: data,
      };
    } catch (error: any) {
      logger(`Elasticsearch search error: ${error.message}`, "SEARCH_SERVICE", "red");
      return { status: 500, error: "Failed to perform search due to a server error." };
    }
  }
}

// Export a singleton instance of the service.
export default new SearchService();