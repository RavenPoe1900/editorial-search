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

const MAX_RESULT_WINDOW = 10_000;

class SearchService {
  private esClient: Client;
  private readonly index: string = config.ELASTICSEARCH_PRODUCT_INDEX;

  constructor() {
    this.esClient = getES();
  }

  public async searchProducts(
    query: string,
    page: number,
    limit: number
  ): Promise<ServiceResult<SearchServiceResponse>> {
    const from = page * limit;

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
        query: {
          bool: {
            must: [{
              multi_match: {
                query,
                fields: [
                  "name^3",
                  "brand^2",
                  "manufacturer^2",
                  "description"
                ],
                fuzziness: "AUTO",
              },
            }],
            filter: [{ term: { status: "PUBLISHED" } }],
          },
        },
      });

      const hits = (response.hits.hits as ProductSearchHit[]) || [];
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

export default new SearchService();