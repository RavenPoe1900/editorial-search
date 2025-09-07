/**
 * @fileoverview Centralized client for Elasticsearch.
 * This file manages a single instance of the client (Singleton pattern) and provides
 * utilities to verify connectivity during application startup.
 */

import { Client } from "@elastic/elasticsearch";
import { logger } from "../../utils/logger";
import config from "../../config/config";

// Module-scoped variable to hold the single client instance.
let client: Client | undefined;

/**
 * @function getES
 * @description Retrieves the Singleton instance of the Elasticsearch client.
 * If the instance does not exist, it creates one using the application configuration.
 * @returns {Client} The Elasticsearch client instance.
 */
export function getES(): Client {
  if (!client) {
    logger("Creating new Elasticsearch client instance...", "ES_CLIENT", "cyan");
    client = new Client({
      node: config.ELASTICSEARCH_URL, // Legacy usage still valid
      // NOTE: Optionally could use config.SEARCH.url
      // node: config.SEARCH.url,
    });
  }
  return client;
}

/**
 * @function ensureESConnectivity
 * @description Ensures that Elasticsearch is available by retrying the connection
 * multiple times before failing. This is designed for use during application startup.
 * @param {object} options - Configuration options for retries.
 * @param {number} options.retries - The number of connection attempts.
 * @param {number} options.delayMs - The delay between attempts in milliseconds.
 * @throws {Error} If unable to connect after all retries have been exhausted.
 */
export async function ensureESConnectivity(options: { retries: number; delayMs: number }): Promise<void> {
  const { retries, delayMs } = options;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const es = getES();
      await es.ping();
      logger(`[Elasticsearch] Connectivity OK on attempt ${attempt}/${retries}.`, "ES_CLIENT", "green");
      return; // Successful connection.
    } catch (error: any) {
      lastError = error;
      const logLevel = attempt < retries ? "WARN" : "ERROR";
      const logColor = attempt < retries ? "yellow" : "red";
      logger(
        `[Elasticsearch] Ping failed (attempt ${attempt}/${retries}): ${error.message}`,
        logLevel,
        logColor
      );
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  const finalError = new Error(
    `Elasticsearch not available after ${retries} attempts at ${config.ELASTICSEARCH_URL}. Last error: ${lastError?.message || "unknown"}`
  );
  throw finalError;
}

/**
 * @function closeES
 * @description Gracefully closes the singleton client (optional for shutdown hooks).
 */
export async function closeES(): Promise<void> {
  if (client) {
    try {
      await client.close();
      logger("Elasticsearch client closed.", "ES_CLIENT", "yellow");
    } catch (err: any) {
      logger(`Error closing Elasticsearch client: ${err.message}`, "ES_CLIENT", "red");
    } finally {
      client = undefined;
    }
  }
}