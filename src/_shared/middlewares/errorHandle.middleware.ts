import CustomError from "../utils/customError";
import { logger } from "../utils/logger";
import { Request, Response, NextFunction } from "express";

export default (err: any, _req: Request, res: Response, _next: NextFunction) => {
  let customError = err;
  if (!(err instanceof CustomError)) {
    logger(err.toString(), "ERROR", "red" as any);
    customError = new CustomError("Server Error", 500);
  }
  res.status(customError.status || 500).json({
    status: customError.status || 500,
    message: customError.message || "Server Error",
    additionalInfo: customError.additionalInfo || undefined,
  });
};