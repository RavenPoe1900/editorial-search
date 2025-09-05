import { Request, Response, NextFunction } from "express";
import Joi from "joi";

function validateQueryDto<T extends object>(schema: Joi.ObjectSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { error: joiError, value } = schema.validate(req.query, {
      abortEarly: false,
      allowUnknown: false,
    });

    const errors = joiError ? joiError.details.map((err) => err.message) : [];

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }
    req.query = value as any;
    next();
  };
}

export default validateQueryDto;