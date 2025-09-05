export default class CustomError extends Error {
  status: number;
  additionalInfo: unknown;

  constructor(message: string, status = 500, additionalInfo: unknown = null) {
    super(message);
    this.status = status;
    this.additionalInfo = additionalInfo;
    Error.captureStackTrace(this, this.constructor);
  }
}