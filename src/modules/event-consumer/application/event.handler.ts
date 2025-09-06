/**
 * @fileoverview Dispatcher for product-related events consumed from the message broker.
 * Decides which Elasticsearch indexing action to perform based on routing key + payload shape.
 *
 * SUPPORTED KEYS:
 *  - product.created
 *  - product.updated
 *  - product.approved
 *  - product.deleted
 *
 * DUAL MODE:
 *  - ID-only events trigger a fetch from API A (upsertProductById).
 *  - Snapshot events (with 'snapshot') index directly (upsertProductSnapshot).
 */

import {
  upsertProductById,
  upsertProductSnapshot,
  deleteProduct
} from "../../../_shared/integrations/elasticsearch/es.product.indexer";
import { logger } from "../../../_shared/utils/logger";
import {
  AnyProductEvent,
  hasSnapshot,
  isProductEvent
} from "../domain/event.types";

/**
 * @function handleProductEvent
 * @description Core handler invoked by the RabbitMQ consumer for each product lifecycle event.
 * @param routingKey Topic-style routing key (e.g., "product.updated").
 * @param payload Raw (unknown) payload parsed from message content.
 * @throws Re-throws errors so the caller can nack appropriately (enabling retries or DLQ strategy).
 */
export const handleProductEvent = async (routingKey: string, payload: unknown): Promise<void> => {
  // --- Shape Validation ---
  if (!isProductEvent(payload)) {
    logger(
      `Rejected event with invalid payload shape for routingKey='${routingKey}'`,
      "EVENT_HANDLER",
      "red"
    );
    throw new Error("Invalid product event payload.");
  }

  // At this point TypeScript knows payload is AnyProductEvent.
  const eventPayload: AnyProductEvent = payload;

  logger(
    `Handling event '${routingKey}' for productId=${eventPayload.productId}${hasSnapshot(eventPayload) ? " (snapshot present)" : ""}`,
    "EVENT_HANDLER",
    "cyan"
  );

  try {
    switch (routingKey) {
      case "product.created":
      case "product.updated":
      case "product.approved":
        if (hasSnapshot(eventPayload)) {
          // Snapshot path: index directly (no network hop to API A).
          await upsertProductSnapshot(eventPayload.productId, eventPayload.snapshot);
        } else {
          // Legacy path: fetch latest state from API A (GraphQL).
          await upsertProductById(eventPayload.productId);
        }
        break;

      case "product.deleted":
        await deleteProduct(eventPayload.productId);
        break;

      default:
        // Unknown routing keys are acknowledged silently (no retry).
        logger(
          `Unknown routing key '${routingKey}' - acknowledged without action.`,
          "EVENT_HANDLER",
          "yellow"
        );
    }
  } catch (err: any) {
    logger(
      `Error processing '${routingKey}' for productId=${eventPayload.productId}: ${err.message}`,
      "EVENT_HANDLER",
      "red"
    );
    // Propagate error to let the consumer decide (nack, requeue, DLQ, etc.).
    throw err;
  }
};