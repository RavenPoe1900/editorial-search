import { Request, Response } from "express";
import * as authService from "../application/auth.service";

export const register = async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  const result = await authService.register(email, password);
  res.status(result.status).json(result);
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  const result = await authService.login(email, password);
  res.status(result.status).json(result);
};

export const refreshToken = async (req: Request, res: Response) => {
  const token =
    (req.body && (req.body as any).refreshToken) ||
    (req.cookies && (req.cookies as any).refreshToken) ||
    null;

  const result = await authService.refreshToken(token);
  res.status(result.status).json(result);
};

export const getUser = async (req: Request, res: Response) => {
  const userId = typeof req.user === "string" ? req.user : req.user?.userId;
  const result = await authService.getUser(userId as string);
  res.status(result.status).json(result);
};