/**
 * @fileoverview Defines the data contracts (types and interfaces) for the search module.
 */

/**
 * @interface ProductDocument
 * @description Represents the structure of a product document as it is stored in Elasticsearch.
 * This should be a subset of the full product model, containing only searchable and display fields.
 */
export interface ProductDocument {
  gtin: string;
  name: string;
  brand: string;
  description?: string;
  status: 'PUBLISHED' | 'PENDING_REVIEW';
  updatedAt: string;
}

/**
 * @interface ProductSearchHit
 * @description Represents a single search result ("hit") from Elasticsearch,
 * including search-specific metadata like the relevance score.
 */
export interface ProductSearchHit {
  _id: string;
  _score: number;
  _source: ProductDocument;
}

/**
 * @interface SearchServiceResponse
 * @description Defines the structure of the successful data payload returned by the SearchService.
 */
export interface SearchServiceResponse {
  hits: ProductSearchHit[];
  total: number;
}

/**
 * @interface SearchApiRequestQuery
 * @description Defines the typed structure of the query parameters for a search API request
 * after validation and parsing.
 */
export interface SearchApiRequestQuery {
  q: string;
  page: number;
  limit: number;
}