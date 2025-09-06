/**
 * @fileoverview Defines the data contracts (types and interfaces) for the search module.
 * This file represents the "read model" projection that is indexed in Elasticsearch.
 * It intentionally contains only the fields that are needed for search or display
 * within the Search API (API B), not necessarily the full product aggregate.
 *
 * Extended to include GS1-aligned fields: manufacturer and netWeight.
 * - manufacturer: The name of the organization responsible for the product (brand owner or producer).
 * - netWeight: A structured representation of net mass (value + unit), using GS1-recognized units where possible.
 *
 * NOTE:
 * If the upstream (API A) domain evolves, this projection can safely diverge as long as
 * the indexer (upsertProductById / snapshot) supplies data consistent with this contract.
 */

/**
 * @interface NetWeight
 * @description Represents the net weight of a product.
 * Use GS1-compatible units (e.g., "GRM" for grams, "KGM" for kilograms).
 */
export interface NetWeight {
  /** Numeric quantity representing the net weight value. */
  value: number;
  /** Unit code (string) representing the weight unit. */
  unit: string;
}

/**
 * @interface ProductDocument
 * @description Represents the projection stored in the Elasticsearch index.
 * This structure is optimized for search relevance and result display.
 */
export interface ProductDocument {
  /** GTIN / Global Trade Item Number (unique identifier in GS1 context). */
  gtin: string;
  /** Human-readable product name. */
  name: string;
  /** Brand under which the product is marketed. */
  brand: string;
  /** Name of the manufacturer or producer (GS1-aligned). */
  manufacturer: string;
  /** Structured net weight (value + unit). */
  netWeight: NetWeight;
  /** Optional textual description of the product. */
  description?: string;
  /** Editorial status controlling visibility. Only PUBLISHED appears in search results. */
  status: 'PUBLISHED' | 'PENDING_REVIEW';
  /** ISO timestamp of last update (used for freshness, potential sorting). */
  updatedAt: string;
}

/**
 * @interface ProductSearchHit
 * @description A single hit returned by Elasticsearch search API, including metadata like score.
 */
export interface ProductSearchHit {
  /** Document ID in Elasticsearch (mirrors the product aggregate ID / Mongo _id). */
  _id: string;
  /** Relevance score assigned by Elasticsearch for the query. */
  _score: number;
  /** The actual source document (Product projection). */
  _source: ProductDocument;
}

/**
 * @interface SearchServiceResponse
 * @description The structured payload returned by the SearchService on success.
 */
export interface SearchServiceResponse {
  /** Array of search hits (scored documents). */
  hits: ProductSearchHit[];
  /** Total number of matching documents across all pages. */
  total: number;
}

/**
 * @interface SearchApiRequestQuery
 * @description Typed (validated) query string parameters for /api/search.
 * Values are normalized by the validation middleware before reaching the controller.
 */
export interface SearchApiRequestQuery {
  /** Full-text query string. */
  q: string;
  /** Page number (0-based index). */
  page: number;
  /** Page size (number of documents per page). */
  limit: number;
}