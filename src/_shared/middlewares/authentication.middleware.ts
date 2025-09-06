/**
 * @fileoverview Middleware to handle JWT-based authentication.
 * It verifies the token from the Authorization header and attaches the decoded user payload to the request object.
 */

import jwt, { JwtPayload } from "jsonwebtoken";
import { Response, NextFunction } from "express";
import config from "../config/config";
import type { AuthenticatedRequest } from "../types/request.types";
import { logger } from "../utils/logger";

/**
 * @function authenticationMiddleware
 * @description An Express middleware that checks for a valid JWT in the 'Authorization' header.
 * @param {AuthenticatedRequest} req - The Express request object, extended with a 'user' property.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function in the stack.
 */
export default (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    res.status(401).json({ error: "Access denied. No token provided." });
    return;
  }

  const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;

  if (!token) {
    res.status(401).json({ error: "Access denied. Malformed token." });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.JWT.key) as JwtPayload & { userId?: string };
    
    // Attach the decoded payload to the request object for use in subsequent handlers.
    req.user = decoded; 
    
    next();
  } catch (err: any) {
    logger(`Invalid token detected: ${err.message}`, "AUTH_MIDDLEWARE", "red");
    res.status(401).json({ error: "Invalid or expired token." });
  }
};