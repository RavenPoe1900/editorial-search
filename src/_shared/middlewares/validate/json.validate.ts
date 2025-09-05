import { Request, Response, NextFunction } from "express";
import Joi from "joi";

const idSchema = Joi.string().length(24).hex().required();

function validateId(req: Request, res: Response, next: NextFunction) {
  const { error } = idSchema.validate(req.params.id);
  if (error) {
    return res.status(400).json({ errors: error.details.map((err) => err.message) });
  }
  next();
}

export default validateId;