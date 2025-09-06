/**
 * @fileoverview Contains the logic for interacting with the products index in Elasticsearch.
 * It provides functions to create/update (upsert) and delete product documents.
 */

import axios from "axios";
import { getES } from "./es.client";
import { logger } from "../../utils/logger";
import config from "../../config/config";
import type { ProductDocument } from "../../../modules/search/domain/search.type";

const INDEX = config.ELASTICSEARCH_PRODUCT_INDEX;

/**
 * @interface GraphQLResponse
 * @description A generic type for a GraphQL response containing a product.
 */
interface GraphQLResponse {
  data?: {
    product: ProductDocument | null;
  };
  errors?: { message: string }[];
}

/**
 * @function fetchProductFromApiA
 * @description Fetches the complete data for a product from API A using GraphQL.
 * NOTE: This approach creates a coupling between services. In more advanced architectures,
 * the event from RabbitMQ should contain all necessary data (Event-Carried State Transfer pattern).
 * @param {string} productId - The ID of the product to fetch.
 * @returns {Promise<ProductDocument | null>} The product data ready for indexing, or null if not found.
 * @throws {Error} If the request to API A fails or returns GraphQL errors.
 */
async function fetchProductFromApiA(productId: string): Promise<ProductDocument | null> {
  const graphqlQuery = {
    query: `
      query GetProductForIndexing($id: ObjectID!) {
        product(id: $id) {
          gtin
          name
          brand
          description
          status
          updatedAt
        }
      }
    `,
    variables: { id: productId },
  };

  try {
    const response = await axios.post<GraphQLResponse>(config.API_A_URL, graphqlQuery, {
      // NOTE: A service-to-service authentication token should be included here.
      // headers: { 'Authorization': `Bearer ${SERVICE_AUTH_TOKEN}` }
    });

    if (response.data.errors) {
      throw new Error(`GraphQL error: ${JSON.stringify(response.data.errors)}`);
    }
    
    return response.data.data?.product ?? null;

  } catch (error: any) {
    logger(`Failed to fetch product ${productId} from API A: ${error.message}`, "INDEXER", "red");
    throw error;
  }
}

/**
 * @function upsertProductById
 * @description Fetches a product by its ID from API A and then indexes/updates it in Elasticsearch.
 * @param {string} productId - The ID of the product to create or update.
 * @returns {Promise<void>}
 * @throws Will re-throw errors from fetching or indexing to be handled by the event consumer.
 */
export async function upsertProductById(productId: string): Promise<void> {
  try {
    const productData = await fetchProductFromApiA(productId);
    if (!productData) {
      logger(`Product ${productId} not found in API A, skipping upsert.`, "INDEXER", "yellow");
      // Optional: Consider deleting the product from ES if it no longer exists in the source of truth.
      // await deleteProduct(productId);
      return;
    }

    const es = getES();
    await es.index({
      index: INDEX,
      id: productId, // Use the MongoDB ID as the document ID in Elasticsearch
      document: productData,
      refresh: "wait_for", // Wait for the document to be visible for searches
    });

    logger(`[Elasticsearch] Upserted product ${productId}`, "INDEXER", "green");
  } catch (err: any) {
    logger(`[Elasticsearch] Upsert by ID error for product ${productId}: ${err.message}`, "INDEXER", "red");
    throw err;
  }
}

/**
 * @function deleteProduct
 * @description Deletes a product from the Elasticsearch index.
 * @param {string} id - The ID of the product to delete.
 * @returns {Promise<void>}
 * @throws Will re-throw errors if the deletion fails for reasons other than 'not found'.
 */
export async function deleteProduct(id: string): Promise<void> {
  try {
    const es = getES();
    await es.delete({
      index: INDEX,
      id: String(id),
      refresh: "wait_for",
    });
    logger(`[Elasticsearch] Deleted product ${id}`, "INDEXER", "green");
  } catch (err: any) {
    // If the document does not exist (404), it's not an error; the operation is idempotent.
    if (err?.meta?.statusCode === 404) {
      logger(`[Elasticsearch] Product ${id} to delete was not found. Operation is idempotent.`, "INDEXER", "yellow");
    } else {
      logger(`[Elasticsearch] Delete error for product ${id}: ${err.message}`, "INDEXER", "red");
      throw err;
    }
  }
}