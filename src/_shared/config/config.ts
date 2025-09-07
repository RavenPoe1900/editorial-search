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
  // Derived groups (added for structured usage; legacy keys remain):
  readonly RABBIT: {
    url: string;
    exchange: string;
    searchQueue: string;
    startupRetries: number;
    startupDelayMs: number;
    prefetch: number;
    reconnectBaseMs: number;
    reconnectMaxMs: number;
  };
  readonly SEARCH: {
    url: string;
    productIndex: string;
  };
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

  // Derived structured blocks (non-breaking; existing code can still use legacy keys)
  RABBIT: {
    url: process.env.RABBITMQ_URL || "amqp://localhost",
    exchange: process.env.RABBITMQ_EXCHANGE || "products.events",
    searchQueue: process.env.RABBITMQ_SEARCH_QUEUE || "search_service_queue",
    startupRetries: Number(process.env.STARTUP_RETRIES) || 10,
    startupDelayMs: Number(process.env.STARTUP_RETRY_DELAY_MS) || 5000,
    prefetch: Number(process.env.RABBITMQ_PREFETCH || 10),
    reconnectBaseMs: Number(process.env.RABBITMQ_RECONNECT_BASE_MS || 2000),
    reconnectMaxMs: Number(process.env.RABBITMQ_RECONNECT_MAX_MS || 15000),
  },
  SEARCH: {
    url: process.env.ELASTICSEARCH_URL || "http://localhost:9200",
    productIndex: process.env.ELASTICSEARCH_PRODUCT_INDEX || "products",
  }
};

// Make the config object immutable to prevent runtime modifications.
export default Object.freeze(config);