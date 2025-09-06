/**
 * @fileoverview A global error handling middleware for the Express application.
 * It catches all errors passed to `next()` and formats them into a consistent JSON response.
 */

import { Request, Response, NextFunction } from "express";
import CustomError from "../utils/customError";
import { logger } from "../utils/logger";

/**
 * @function errorHandler
 * @description Catches and processes errors. If the error is not an instance of `CustomError`,
 * it wraps it in a generic `CustomError` to ensure a consistent response format.
 * @param {any} err - The error object.
 * @param {Request} _req - The Express request object (unused).
 * @param {Response} res - The Express response object.
 * @param {NextFunction} _next - The next middleware function (unused).
 */
export default (err: any, _req: Request, res: Response, _next: NextFunction): void => {
  let customError = err;

  if (!(err instanceof CustomError)) {
    // For unexpected errors, log the full error and create a generic server error.
    logger(err.stack || err.toString(), "UNHANDLED_ERROR", "red");
    customError = new CustomError("An unexpected server error occurred.", 500);
  }

  res.status(customError.status).json({
    error: {
      message: customError.message,
      status: customError.status,
      ...(customError.additionalInfo && { details: customError.additionalInfo }),
    },
  });
};