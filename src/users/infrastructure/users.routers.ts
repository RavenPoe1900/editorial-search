import express from "express";
import * as userController from "./users.controller";
import userDto from "../domain/user.dto";
import updateUserDto from "../domain/userUpdate.dto";
import validateExternalDto from "../../_shared/middlewares/validate/dtoExternal.validate";
import validateId from "../../_shared/middlewares/validate/id.validate";
import authenticationMiddleware from "../../_shared/middlewares/authentication.middleware";
import authorizationMiddleware from "../../_shared/middlewares/authorization.middleware";
import RoleTypeEnum from "../../_shared/enum/roles.enum";
import paginateDto from "../../_shared/joi/paginateDto.joi";
import validateQueryDto from "../../_shared/middlewares/validate/dtoQuery.validate";

const router = express.Router();
const middleAccess = [RoleTypeEnum.ADMIN, RoleTypeEnum.MANAGER];

router.post("/", authenticationMiddleware, authorizationMiddleware(middleAccess), validateExternalDto(userDto), userController.createUser);

router.get(
  "/",
  authenticationMiddleware,
  authorizationMiddleware(middleAccess),
  validateQueryDto(paginateDto),
  userController.getAllUsers
);

router.get("/:id", authenticationMiddleware, authorizationMiddleware(middleAccess), validateId, userController.getUserById);

router.put(
  "/:id",
  authenticationMiddleware,
  authorizationMiddleware(middleAccess),
  validateId,
  validateExternalDto(updateUserDto),
  userController.updateUser
);

router.delete("/:id", authenticationMiddleware, authorizationMiddleware(middleAccess), validateId, userController.softDeleteUser);

export default router;