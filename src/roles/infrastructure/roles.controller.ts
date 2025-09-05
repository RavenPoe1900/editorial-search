import { Request, Response } from "express";
import RoleService from "../application/role.service";

export const createRole = async (req: Request, res: Response) => {
  const result = await RoleService.create(req.body as any);
  res.status(result.status).json(result);
};

export const getAllRoles = async (req: Request, res: Response) => {
  const { page, limit, filter } = req.query as any;
  const result = await RoleService.findAll(page, limit, filter as any);
  res.status(result.status).json(result);
};

export const getRoleById = async (req: Request, res: Response) => {
  const result = await RoleService.findById(req.params.id);
  res.status(result.status).json(result);
};

export const updateRole = async (req: Request, res: Response) => {
  const result = await RoleService.updateById(req.params.id, req.body as any);
  res.status(result.status).json(result);
};

export const softDeleteRole = async (req: Request, res: Response) => {
  const result = await RoleService.softDeleteById(req.params.id);
  res.status(result.status).json(result);
};

export const deleteRole = async (req: Request, res: Response) => {
  const result = await RoleService.deleteById(req.params.id);
  res.status(result.status).json(result);
};