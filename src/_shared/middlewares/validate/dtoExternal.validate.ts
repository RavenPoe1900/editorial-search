import { Request, Response, NextFunction } from "express";
import Joi from "joi";

function validateExternalDto<T extends object>(schema: Joi.ObjectSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const value = await schema.validateAsync(req.body, {
        abortEarly: false,
        allowUnknown: false,
      });

      req.body = value as any;
      next();
    } catch (error: any) {
      res.status(400).json({ errors: error.details.map((err: any) => err.message) });
    }
  };
}

export default validateExternalDto;