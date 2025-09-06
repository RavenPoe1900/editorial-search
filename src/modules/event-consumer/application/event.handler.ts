/**
 * @fileoverview This file contains the core business logic for handling product events.
 * It acts as a dispatcher, calling the appropriate indexer function based on the event's routing key.
 */

import { upsertProductById, deleteProduct } from "../../../_shared/integrations/elasticsearch/es.product.indexer";
import { logger } from "../../../_shared/utils/logger";
import { isProductEvent } from "../domain/event.type";

/**
 * @function handleProductEvent
 * @description Processes a deserialized event message from RabbitMQ.
 * It determines which action to take in Elasticsearch based on the `routingKey`.
 * @param {string} routingKey - The routing key of the message (e.g., "product.created").
 * @param {unknown} payload - The message content, parsed from JSON.
 * @returns {Promise<void>}
 * @throws {Error} Throws an error if processing fails, which allows the caller to nack the message.
 */
export const handleProductEvent = async (routingKey: string, payload: unknown): Promise<void> => {
  if (!isProductEvent(payload)) {
    logger(`Received invalid event payload for routing key ${routingKey}: ${JSON.stringify(payload)}`, "EVENT_HANDLER", "red");
    throw new Error("Invalid event payload structure.");
  }

  logger(`Handling event: ${routingKey} for productId: ${payload.productId}`, "EVENT_HANDLER", "cyan");

  try {
    switch (routingKey) {
      case "product.created":
      case "product.updated":
      case "product.approved":
        // For all these events, the action is to (re)index the product.
        // The indexer service will fetch the latest data from API A.
        await upsertProductById(payload.productId);
        break;

      case "product.deleted":
        // If a product is deleted, we remove it from the search index.
        await deleteProduct(payload.productId);
        break;

      default:
        logger(`Unknown routing key, ignoring event: ${routingKey}`, "EVENT_HANDLER", "yellow");
        // We don't throw an error here, as it's not a processing failure.
        // We simply acknowledge and discard the message.
    }
  } catch (error: any) {
    logger(`Error handling event ${routingKey} for productId ${payload.productId}: ${error.message}`, "EVENT_HANDLER", "red");
    // Re-throw the error to ensure the message is nacked by the consumer service.
    throw error;
  }
};