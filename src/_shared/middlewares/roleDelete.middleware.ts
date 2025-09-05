import { Request, Response, NextFunction } from "express";
import UserService from "../../users/application/user.service";

export default async (req: Request, res: Response, next: NextFunction) => {
  const roleId = req.params.id;
  try {
    const userRes = await UserService.findOneByCriteria({ role: roleId } as any);

    if (userRes && userRes.status === 200 && userRes.data) {
      return res.status(400).json({
        error: "Cannot delete role. Role is assigned to one or more users.",
      });
    }

    next();
  } catch (err) {
    console.error("roleDelete.middleware error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};