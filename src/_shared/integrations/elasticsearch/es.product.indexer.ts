/**
 * @fileoverview Elasticsearch product index interaction utilities.
 * Provides two upsert strategies:
 *  1. ID-based (fetch from API A via GraphQL).
 *  2. Snapshot-based (direct indexing from event-provided data).
 *
 * Also supports deletion (idempotent).
 *
 * DESIGN TRADEOFF:
 * The fetch-based approach introduces cross-service coupling and latency,
 * but keeps events lightweight. Snapshot-based events reduce coupling and
 * can accelerate indexing. Both are supported to allow migration.
 */

import axios from "axios";
import { getES } from "./es.client";
import { logger } from "../../utils/logger";
import config from "../../config/config";
import type { ProductDocument } from "../../../modules/search/domain/search.type";

const INDEX = config.ELASTICSEARCH_PRODUCT_INDEX;

/**
 * @interface GraphQLResponse
 * @description Minimal typed shape expected from API A's GraphQL endpoint for indexing projection.
 */
interface GraphQLResponse {
  data?: {
    product: ProductDocument | null;
  };
  errors?: { message: string }[];
}

/**
 * @function fetchProductFromApiA
 * @description Retrieves the latest product projection for indexing.
 * @param productId Product identifier used to fetch from API A.
 * @returns ProductDocument or null if not found.
 * @throws Error if GraphQL returns errors or network fails.
 *
 * NOTE:
 * A service-to-service authentication header should be added for production environments.
 */
async function fetchProductFromApiA(productId: string): Promise<ProductDocument | null> {
  const graphqlQuery = {
    query: `
      query GetProductForIndexing($id: ObjectID!) {
        product(id: $id) {
          gtin
          name
          brand
          manufacturer
          netWeight {
            value
            unit
          }
            description
          status
          updatedAt
        }
      }
    `,
    variables: { id: productId },
  };

  try {
    const response = await axios.post<GraphQLResponse>(
      config.API_A_URL,
      graphqlQuery,
      {
        timeout: 5000, // Defensive network timeout.
      }
    );

    if (response.data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
    }

    return response.data.data?.product ?? null;
  } catch (error: any) {
    logger(`Failed to fetch product ${productId} from API A: ${error.message}`, "INDEXER", "red");
    throw error;
  }
}

/**
 * @function upsertProductById
 * @description Fetches remote product data then indexes it.
 * @param productId Product identifier.
 */
export async function upsertProductById(productId: string): Promise<void> {
  try {
    const productData = await fetchProductFromApiA(productId);
    if (!productData) {
      logger(`Product ${productId} not found in API A - skipping upsert.`, "INDEXER", "yellow");
      return;
    }
    await indexDocument(productId, productData);
  } catch (err: any) {
    logger(`Upsert (fetch) failed for ${productId}: ${err.message}`, "INDEXER", "red");
    throw err;
  }
}

/**
 * @function upsertProductSnapshot
 * @description Directly indexes the provided snapshot (from enriched events).
 * @param productId Product identifier (document ID in ES).
 * @param snapshot Full product projection.
 */
export async function upsertProductSnapshot(productId: string, snapshot: ProductDocument): Promise<void> {
  try {
    await indexDocument(productId, snapshot);
  } catch (err: any) {
    logger(`Upsert (snapshot) failed for ${productId}: ${err.message}`, "INDEXER", "red");
    throw err;
  }
}

/**
 * @function indexDocument
 * @description Internal helper performing the actual ES indexing operation.
 * @param productId Document ID in ES (mirrors upstream ID).
 * @param doc Product document to index.
 */
async function indexDocument(productId: string, doc: ProductDocument): Promise<void> {
  const es = getES();
  await es.index({
    index: INDEX,
    id: productId,
    document: doc,
    refresh: "wait_for", // Ensures visibility in subsequent search queries.
  });
  logger(`Indexed product ${productId}`, "INDEXER", "green");
}

/**
 * @function deleteProduct
 * @description Removes a product document from the index (idempotent).
 * @param id Product identifier.
 */
export async function deleteProduct(id: string): Promise<void> {
  try {
    const es = getES();
    await es.delete({
      index: INDEX,
      id: String(id),
      refresh: "wait_for",
    });
    logger(`Deleted product ${id}`, "INDEXER", "green");
  } catch (err: any) {
    if (err?.meta?.statusCode === 404) {
      logger(`Product ${id} not found at delete (idempotent).`, "INDEXER", "yellow");
    } else {
      logger(`Delete failed for ${id}: ${err.message}`, "INDEXER", "red");
      throw err;
    }
  }
}