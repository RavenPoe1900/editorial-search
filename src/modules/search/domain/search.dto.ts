/**
 * @fileoverview Joi validation schema for the search endpoint's query parameters.
 */

import Joi from "joi";

/**
 * @const searchQueryDto
 * @description Defines the validation schema for the product search query.
 * @property {string} q - The search term. Required, min 2 characters.
 * @property {number} page - The page number for pagination. Optional, defaults to 0.
 * @property {number} limit - The number of results per page. Optional, defaults to 10.
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