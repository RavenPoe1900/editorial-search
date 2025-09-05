import { Request, Response, NextFunction } from "express";
import UserService from "../../users/application/user.service";
import userPopulate from "../../users/domain/user.populate";

export default (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const raw = req.user;
    const userId = typeof raw === "string" ? raw : raw?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await UserService.findById(userId, userPopulate as any);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.status !== 200) {
      return res.status(user.status).json({ error: user.error });
    }

    const roleName = (user.data as any)?.role?.name;
    if (!allowedRoles.includes(roleName)) {
      return res.status(403).json({ error: "Access denied, insufficient permissions" });
    }

    next();
  };
};