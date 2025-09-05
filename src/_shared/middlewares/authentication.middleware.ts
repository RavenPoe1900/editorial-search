import jwt, { JwtPayload } from "jsonwebtoken";
import config from "../config/config";
import { Request, Response, NextFunction } from "express";

export default (req: Request, res: Response, next: NextFunction) => {
  const header = req.header("Authorization");

  if (!header) {
    return res.status(401).json({ error: "No token, authorization denied" });
  }

  const token = header.startsWith("Bearer ") ? header.substring(7) : header;

  if (!token) {
    return res.status(401).json({ error: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, config.JWT.key) as JwtPayload & { userId?: string };
    req.user = decoded;
    next();
  } catch (err: any) {
    console.error("Auth middleware error:", err.message);
    return res.status(401).json({ error: "Token is not valid" });
  }
};