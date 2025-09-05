import jwt from "jsonwebtoken";
import { randomUUID, randomBytes } from "crypto";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RefreshToken = require("../domain/refresh-token.schema");
import config from "../../_shared/config/config";
import userService from "../../users/application/user.service";
import RoleService from "../../roles/application/role.service";
import RoleTypeEnum from "../../_shared/enum/roles.enum";
import { hashPassword, comparePassword } from "../../_shared/hash/password.hash";

type ServiceResult<T> = { status: number; data?: T; error?: string };

async function generateRefreshToken(userId: string): Promise<string> {
  const jti = typeof randomUUID === "function" ? randomUUID() : randomBytes(16).toString("hex");

  const token = jwt.sign({ userId, jti }, config.REFRESH_JWT.refreshKey, {
    expiresIn: config.REFRESH_JWT.refreshExpires,
  });

  const decoded: any = jwt.decode(token);
  let expiresAt = new Date();
  if (decoded && decoded.exp) {
    expiresAt = new Date(decoded.exp * 1000);
  } else {
    const fallbackMs = 7 * 24 * 60 * 60 * 1000;
    expiresAt.setTime(expiresAt.getTime() + fallbackMs);
  }

  await RefreshToken.create({
    jti,
    expiresAt,
    userId,
  });

  return token;
}

export async function register(email: string, password: string): Promise<ServiceResult<{ accessToken: string; refreshToken: string }>> {
  try {
    const existing = await userService.findByEmail(email);
    if (existing && existing.status === 200) {
      return { status: 400, error: "User already exists" };
    }

    const hash = await hashPassword(password);
    const roleRes = await RoleService.findOneByCriteria({ name: RoleTypeEnum.EMPLOYEE });

    if (!roleRes || roleRes.status !== 200) {
      console.error('Ensuring "EMPLOYEE" role exist');
      return { status: 500, error: "Server error" };
    }

    const userRes = await userService.create({ email, password: hash, role: (roleRes.data as any)._id } as any);
    if (!userRes || userRes.status !== 201) {
      return { status: 500, error: "Could not create user" };
    }

    const payload = { userId: (userRes.data as any)._id };
    const accessToken = jwt.sign(payload, config.JWT.key, { expiresIn: config.JWT.expires });
    const refreshToken = await generateRefreshToken((userRes.data as any)._id);

    return { status: 201, data: { accessToken, refreshToken } };
  } catch (error) {
    console.error("Auth register error:", error);
    return { status: 500, error: "Server error" };
  }
}

export async function login(
  email: string,
  password: string
): Promise<ServiceResult<{ accessToken: string; refreshToken: string }>> {
  try {
    const userRes = await userService.findByEmail(email, true);
    if (!userRes || userRes.status !== 200) {
      return { status: 400, error: "Invalid credentials" };
    }
    const user: any = userRes.data;
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return { status: 400, error: "Invalid credentials" };
    }

    const payload = { userId: user._id };
    const accessToken = jwt.sign(payload, config.JWT.key, { expiresIn: config.JWT.expires });
    const refreshToken = await generateRefreshToken(user._id);

    return { status: 200, data: { accessToken, refreshToken } };
  } catch (error) {
    console.error("Auth login error:", error);
    return { status: 500, error: "Server error" };
  }
}

export async function refreshToken(refreshToken: string | null): Promise<ServiceResult<{ accessToken: string; refreshToken: string }>> {
  try {
    if (!refreshToken) return { status: 400, error: "Refresh token required" };

    const decoded: any = jwt.verify(refreshToken, config.REFRESH_JWT.refreshKey);
    const { jti, userId } = decoded;
    if (!jti || !userId) {
      return { status: 401, error: "Invalid refresh token payload" };
    }

    const stored = await RefreshToken.findOne({ jti, userId });
    if (!stored || stored.revokedAt || (stored.expiresAt && stored.expiresAt <= new Date())) {
      return { status: 401, error: "Invalid or expired refresh token" };
    }

    stored.revokedAt = new Date();
    await stored.save();

    const userRes = await userService.findById(userId);
    if (!userRes || userRes.status !== 200) {
      return { status: 404, error: "User not found" };
    }

    const payload = { userId: (userRes.data as any)._id };
    const newAccessToken = jwt.sign(payload, config.JWT.key, { expiresIn: config.JWT.expires });
    const newRefreshToken = await generateRefreshToken((userRes.data as any)._id);

    return { status: 200, data: { accessToken: newAccessToken, refreshToken: newRefreshToken } };
  } catch (err: any) {
    if (err.name === "TokenExpiredError" || err.name === "JsonWebTokenError") {
      return { status: 401, error: "Invalid refresh token" };
    }
    console.error("Refresh token error:", err);
    return { status: 500, error: "Server error" };
  }
}

export async function getUser(userId: string) {
  try {
    const user = await userService.findById(userId);
    if (!user) {
      return { status: 404, error: "User not found" };
    }
    return { status: 200, user };
  } catch {
    return { status: 500, error: "Server error" };
  }
}