/**
 * @fileoverview A generic middleware factory for validating request query parameters using Joi.
 */

import { Request, Response, NextFunction } from "express";
import Joi from "joi";

/**
 * @function validateQueryDto
 * @description A higher-order function that returns a middleware for validating `req.query`.
 * @template T - A generic type for the object schema.
 * @param {Joi.ObjectSchema<T>} schema - The Joi schema to validate against.
 * @returns An Express middleware function.
 */
function validateQueryDto<T extends object>(schema: Joi.ObjectSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      allowUnknown: true, 
      stripUnknown: false,
    });

    if (error) {
      const validationErrors = error.details.map((detail) => detail.message);
      res.status(400).json({
        error: {
          message: "Invalid query parameters.",
          details: validationErrors,
        },
      });
      return;
    }

    // --- FIX ---
    // Instead of replacing req.query, we merge the validated value back into it.
    // This preserves the original req.query type (ParsedQs) and avoids the TypeScript error.
    Object.assign(req.query, value);
    
    next();
  };
}

export default validateQueryDto;