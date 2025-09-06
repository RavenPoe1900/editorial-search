/**
 * @fileoverview Centralized configuration for the Search API.
 * It loads environment variables from a .env file, validates them,
 * and exports a strongly-typed configuration object for use throughout the application.
 */
import dotenv from "dotenv";
dotenv.config();

/**
 * @interface JwtConfig
 * @description Defines the structure for JWT configuration.
 * @property {string} key - The secret key for signing tokens.
 * @property {string} expires - The expiration time for tokens (e.g., "15m").
 */
export interface JwtConfig {
  key: string;
  expires: string;
}

/**
 * @interface AppConfig
 * @description Gathers all application configuration into a single, typed interface.
 */
interface AppConfig {
  readonly NODE_ENV: 'development' | 'production' | 'test';
  readonly PORT: number;
  readonly CORS_ORIGIN: string | boolean;
  readonly JWT: JwtConfig;
  readonly ELASTICSEARCH_URL: string;
  readonly ELASTICSEARCH_PRODUCT_INDEX: string;
  readonly RABBITMQ_URL: string;
  readonly RABBITMQ_EXCHANGE: string;
  readonly RABBITMQ_SEARCH_QUEUE: string;
  readonly API_A_URL: string;
  readonly STARTUP_RETRIES: number;
  readonly STARTUP_RETRY_DELAY_MS: number;
}

// Main configuration object
const config: AppConfig = {
  NODE_ENV: (process.env.NODE_ENV as AppConfig['NODE_ENV']) || 'development',
  PORT: Number(process.env.PORT_API_B) || 3001,
  CORS_ORIGIN: process.env.CORS_ORIGIN || true,

  JWT: {
    key: process.env.JWT_SECRET_KEY || "a-very-secret-key-that-should-be-in-env",
    expires: process.env.JWT_SECRET_KEY_EXPIRES || "15m",
  },

  ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL || "http://localhost:9200",
  ELASTICSEARCH_PRODUCT_INDEX: process.env.ELASTICSEARCH_PRODUCT_INDEX || "products",

  RABBITMQ_URL: process.env.RABBITMQ_URL || "amqp://localhost",
  RABBITMQ_EXCHANGE: process.env.RABBITMQ_EXCHANGE || "products.events",
  RABBITMQ_SEARCH_QUEUE: process.env.RABBITMQ_SEARCH_QUEUE || "search_service_queue",

  API_A_URL: process.env.API_A_URL || "http://localhost:3015/graphql",

  STARTUP_RETRIES: Number(process.env.STARTUP_RETRIES) || 10,
  STARTUP_RETRY_DELAY_MS: Number(process.env.STARTUP_RETRY_DELAY_MS) || 5000,
};

// Make the config object immutable to prevent runtime modifications.
export default Object.freeze(config);