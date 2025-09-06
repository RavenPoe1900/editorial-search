/**
 * @fileoverview Contains shared, generic types for application services.
 */

/**
 * @interface ServiceResult
 * @description A generic interface for service layer responses, indicating success or failure.
 * This provides a consistent return structure for all services.
 * @template T - The type of the data payload on success.
 */
export interface ServiceResult<T> {
  /** The HTTP-like status code of the operation (e.g., 200 for success, 404 for not found). */
  status: number;
  /** The data payload if the operation was successful. */
  data?: T | null;
  /** An error message if the operation failed. */
  error?: string;
}