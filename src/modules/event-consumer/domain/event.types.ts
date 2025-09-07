/**
 * @fileoverview Type definitions and type guards for product events.
 */

export interface BaseProductEvent {
  productId: string;
  // Optional event timestamp or version fields can be added here.
}

export interface SnapshotProductEvent extends BaseProductEvent {
  snapshot: any; // You can refine this type to your ProductDocument projection.
}

export type AnyProductEvent = BaseProductEvent | SnapshotProductEvent;

/**
 * @function isProductEvent
 * @description Narrow unknown payload into a BaseProductEvent or SnapshotProductEvent shape.
 */
export function isProductEvent(payload: any): payload is AnyProductEvent {
  return (
    payload &&
    typeof payload === "object" &&
    typeof payload.productId === "string"
  );
}

/**
 * @function hasSnapshot
 * @description Checks if a product event includes a snapshot.
 */
export function hasSnapshot(payload: AnyProductEvent): payload is SnapshotProductEvent {
  return (payload as any).snapshot !== undefined;
}