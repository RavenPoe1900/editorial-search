import express from "express";
const router = express.Router();
import * as authController from "./auth.controller";
import authenticationMiddleware from "../../_shared/middlewares/authentication.middleware";
import authDto from "../domain/auth.dto";
import validateBodyDto from "../../_shared/middlewares/validate/dtoBody.validate";

router.post("/register", validateBodyDto(authDto), authController.register);
router.post("/login", validateBodyDto(authDto), authController.login);
router.get("/me", authenticationMiddleware, authController.getUser);
router.post("/refresh", authController.refreshToken);

export default router;