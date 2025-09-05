import express from "express";
import * as roleController from "./roles.controller";
import roleDto from "../domain/role.dto";
import updateRoleDto from "../domain/roleUpdate.dto";
import validateBodyDto from "../../_shared/middlewares/validate/dtoBody.validate";
import validateId from "../../_shared/middlewares/validate/id.validate";
import authenticationMiddleware from "../../_shared/middlewares/authentication.middleware";
import authorizationMiddleware from "../../_shared/middlewares/authorization.middleware";
import roleDeleteMiddleware from "../../_shared/middlewares/roleDelete.middleware";
import RoleTypeEnum from "../../_shared/enum/roles.enum";
import paginateDto from "../../_shared/joi/paginateDto.joi";
import validateQueryDto from "../../_shared/middlewares/validate/dtoQuery.validate";

const router = express.Router();

const middleAccess = [RoleTypeEnum.ADMIN, RoleTypeEnum.MANAGER, RoleTypeEnum.EMPLOYEE];

router.post(
  "/",
  validateBodyDto(roleDto),
  authenticationMiddleware,
  authorizationMiddleware(middleAccess),
  roleController.createRole
);

router.get(
  "/",
  authenticationMiddleware,
  authorizationMiddleware(middleAccess),
  validateQueryDto(paginateDto),
  roleController.getAllRoles
);

router.get(
  "/:id",
  authenticationMiddleware,
  authorizationMiddleware(middleAccess),
  validateId,
  roleController.getRoleById
);

router.put(
  "/:id",
  authenticationMiddleware,
  authorizationMiddleware(middleAccess),
  validateId,
  validateBodyDto(updateRoleDto),
  roleController.updateRole
);

router.delete(
  "/:id",
  authenticationMiddleware,
  authorizationMiddleware(middleAccess),
  validateId,
  roleController.softDeleteRole
);

router.delete(
  "/permanent/:id",
  authenticationMiddleware,
  authorizationMiddleware(middleAccess),
  validateId,
  roleDeleteMiddleware,
  roleController.deleteRole
);

export default router;