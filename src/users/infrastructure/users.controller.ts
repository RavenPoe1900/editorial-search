import { Request, Response } from "express";
import UserService from "../application/user.service";
import userPopulate from "../domain/user.populate";

const selectOptions = "-password -tests";

export const createUser = async (req: Request, res: Response) => {
  const result = await UserService.create(req.body as any, userPopulate as any, selectOptions);
  res.status(result.status).json(result);
};

export const getAllUsers = async (req: Request, res: Response) => {
  const { page, limit, filter } = req.query as any;
  const result = await UserService.findAll(page, limit, filter, userPopulate as any, "-password -tests");
  res.status(result.status).json(result);
};

export const getUserById = async (req: Request, res: Response) => {
  const result = await UserService.findById(req.params.id, userPopulate as any, selectOptions);
  res.status(result.status).json(result);
};

export const updateUser = async (req: Request, res: Response) => {
  const result = await UserService.updateById(req.params.id, req.body as any, userPopulate as any);
  res.status(result.status).json(result);
};

export const softDeleteUser = async (req: Request, res: Response) => {
  const result = await UserService.softDeleteById(req.params.id, userPopulate as any, selectOptions);
  res.status(result.status).json(result);
};