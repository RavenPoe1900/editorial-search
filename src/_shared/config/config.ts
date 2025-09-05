import dotenv from "dotenv";
dotenv.config();

const PORT = Number(process.env.PORT || 3000);

export interface JwtConfig {
  key: string;
  expires: string;
}

export interface RefreshJwtConfig {
  refreshKey: string;
  refreshExpires: string;
  maxTokensPerUser: number;
}

export interface CookieConfig {
  secure: boolean;
  httpOnly: boolean;
  sameSite: "Lax" | "Strict" | "None" | string;
  maxAge: number | null;
}

export interface MongoConfig {
  url?: string;
  urlIntegration?: string;
}

export interface JobConfig {
  cronCleanupRefreshTokens?: string;
}

const JWT: JwtConfig = {
  key: process.env.JWT_SECRET_KEY || "your-secret-key",
  expires: process.env.JWT_SECRET_KEY_EXPIRES || "15m",
};

const REFRESH_JWT: RefreshJwtConfig = {
  refreshKey: process.env.JWT_REFRESH_KEY || "your-refresh-secret-key",
  refreshExpires: process.env.JWT_REFRESH_EXPIRES || "7d",
  maxTokensPerUser: parseInt(process.env.REFRESH_MAX_TOKENS || "5", 10),
};

const COOKIE: CookieConfig = {
  secure: process.env.COOKIE_SECURE === "true" || false,
  httpOnly: true,
  sameSite: (process.env.COOKIE_SAMESITE as any) || "Lax",
  maxAge: process.env.COOKIE_MAXAGE ? parseInt(process.env.COOKIE_MAXAGE, 10) : null,
};

const MONGODB: MongoConfig = {
  url: process.env.MONGO_URI,
  urlIntegration: process.env.MONGO_URI_INTEGRATION,
};

const JOB: JobConfig = {
  cronCleanupRefreshTokens: process.env.CRON_CLEANUP_REFRESH_TOKENS,
};

const config = {
  PORT,
  JWT,
  REFRESH_JWT,
  COOKIE,
  URL: "/api",
  NODE_ENV: process.env.NODE_ENV,
  MONGODB,
  JOB,
};

export default config;