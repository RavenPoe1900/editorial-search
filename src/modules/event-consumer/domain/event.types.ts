/**
 * @fileoverview Event contract definitions for product lifecycle messages consumed by the Search API (API B).
 * Supports two patterns:
 *  - Minimal ID-only events (requiring a fetch from API A).
 *  - Enriched snapshot events (carry full product projection to avoid extra network calls).
 *
 * The enriched form is optional and backward compatible. Producers can progressively migrate.
 */

import type { ProductDocument } from "../../search/domain/search.type";

/**
 * Minimal lifecycle events containing only productId.
 * These require a fetch to API A to build the projection for indexing.
 */
export interface ProductCreatedEvent { productId: string; }
export interface ProductUpdatedEvent { productId: string; }
export interface ProductApprovedEvent { productId: string; }
export interface ProductDeletedEvent { productId: string; }

/**
 * @interface ProductSnapshotEvent
 * @description Enriched event including a full product snapshot suitable for direct indexing.
 * Optional metadata (version, occurredAt) can support ordering or optimistic concurrency later.
 */
export interface ProductSnapshotEvent {
  productId: string;
  snapshot: ProductDocument;
  version?: number;
  occurredAt?: string;
}

/**
 * @type AnyProductEvent
 * @description Union of all supported product event payload shapes.
 */
export type AnyProductEvent =
  | ProductCreatedEvent
  | ProductUpdatedEvent
  | ProductApprovedEvent
  | ProductDeletedEvent
  | ProductSnapshotEvent;

/**
 * @function isProductEvent
 * @description Runtime type guard ensuring the payload has a productId string.
 * NOTE: Does not validate snapshot structure deeply—only existence of productId.
 * @param payload Arbitrary deserialized message payload.
 */
export function isProductEvent(payload: unknown): payload is AnyProductEvent {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "productId" in payload &&
    typeof (payload as any).productId === "string"
  );
}

/**
 * @function hasSnapshot
 * @description Type guard detecting whether an event includes a full product snapshot.
 * @param payload An already validated AnyProductEvent.
 */
export function hasSnapshot(payload: AnyProductEvent): payload is ProductSnapshotEvent {
  return "snapshot" in payload && typeof (payload as any).snapshot === "object";
}