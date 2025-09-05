import { Request, Response, NextFunction } from "express";

export default (err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && (err as any).status === 400 && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON syntax" });
  }
  next();
};