/**
 * @fileoverview Custom Express request types for the application.
 */

import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

/**
 * @interface AuthenticatedRequest
 * @description Extends the base Express `Request` interface to include the `user` property.
 * This property is attached by the authentication middleware and contains the decoded JWT payload.
 */
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload & { userId?: string };
}