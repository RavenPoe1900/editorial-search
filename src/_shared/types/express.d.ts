import "express";
import type { JwtPayload } from "jsonwebtoken";

declare module "express-serve-static-core" {
  interface Request {
    user?: string | (JwtPayload & { userId?: string });
  }
}