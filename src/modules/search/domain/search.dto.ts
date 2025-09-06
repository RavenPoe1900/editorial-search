/**
 * @fileoverview Joi schema for validating search endpoint query parameters.
 * This schema ensures that pagination constraints and query presence are enforced before
 * hitting the application service layer.
 */

import Joi from "joi";

/**
 * @constant searchQueryDto
 * @description Validation schema for query parameters:
 *  - q: required, trimmed, minimum length 2.
 *  - page: non-negative integer, defaults to 0.
 *  - limit: positive integer, capped to prevent excessive result size, defaults to 10.
 *
 * NOTE:
 * Business logic (e.g., deep pagination guard) is enforced later in the service.
 */
export const searchQueryDto = Joi.object({
  q: Joi.string().trim().min(2).required().messages({
    "string.base": "Search query 'q' must be a string.",
    "string.empty": "Search query 'q' cannot be empty.",
    "string.min": "Search query 'q' must be at least 2 characters long.",
    "any.required": "Search query 'q' is required.",
  }),
  page: Joi.number().integer().min(0).default(0),
  limit: Joi.number().integer().min(1).max(100).default(10),
});