import sanitize from "mongo-sanitize";
import { Request, Response, NextFunction } from "express";

export default (req: Request, _res: Response, next: NextFunction) => {
  (req as any).body = sanitize(req.body);
  (req as any).query = sanitize(req.query);
  (req as any).params = sanitize(req.params);
  next();
};