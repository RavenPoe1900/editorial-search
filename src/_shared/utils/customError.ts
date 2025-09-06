/**
 * @fileoverview Defines a custom Error class for consistent error handling.
 */

/**
 * @class CustomError
 * @extends Error
 * @description A custom error class that includes an HTTP status code and optional additional info.
 */
export default class CustomError extends Error {
  public status: number;
  public additionalInfo: unknown;

  /**
   * @constructor
   * @param {string} message - The error message.
   * @param {number} [status=500] - The HTTP status code associated with the error.
   * @param {unknown} [additionalInfo=null] - Any extra information to attach to the error.
   */
  constructor(message: string, status = 500, additionalInfo: unknown = null) {
    super(message);
    this.status = status;
    this.additionalInfo = additionalInfo;
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}