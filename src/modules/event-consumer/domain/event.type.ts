/**
 * @fileoverview Defines the data contracts (types and interfaces) for product events
 * received from the message queue.
 */

/**
 * @interface ProductCreatedEvent
 * @description Payload for 'product.created' events.
 */
export interface ProductCreatedEvent {
  productId: string;
  // Other relevant fields could be here if using the "Event-Carried State Transfer" pattern.
}

/**
 * @interface ProductUpdatedEvent
 * @description Payload for 'product.updated' and 'product.approved' events.
 */
export interface ProductUpdatedEvent {
  productId: string;
}

/**
 * @interface ProductDeletedEvent
 * @description Payload for 'product.deleted' events.
 */
export interface ProductDeletedEvent {
  productId: string;
}

/**
 * @type AnyProductEvent
 * @description A union type representing any possible product event payload.
 * This ensures that the event handler can safely access `productId`.
 */
export type AnyProductEvent = ProductCreatedEvent | ProductUpdatedEvent | ProductDeletedEvent;

/**
 * @function isProductEvent
 * @description A type guard to validate that a parsed payload from RabbitMQ
 * conforms to the `AnyProductEvent` structure.
 * @param {unknown} payload - The parsed JSON payload.
 * @returns {boolean} True if the payload is a valid product event.
 */
export function isProductEvent(payload: unknown): payload is AnyProductEvent {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'productId' in payload &&
    typeof (payload as AnyProductEvent).productId === 'string'
  );
}