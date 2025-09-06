/**
 * @fileoverview RabbitMQ consumer service.
 * This service handles the connection, channel management, and message consumption
 * from RabbitMQ with robust retry and graceful shutdown logic.
 */

import * as amqp from "amqplib";
import type { Channel, ConsumeMessage } from "amqplib";
import { logger } from "../../../_shared/utils/logger";
import config from "../../../_shared/config/config";
import { handleProductEvent } from "./event.handler";

let connection: amqp.Connection | null = null;
let channel: Channel | null = null;
let isClosing = false;

/**
 * @function assertIsPromiseConnection
 * @description A type guard to ensure the object returned from amqp.connect is a promise-based Connection.
 * @param {unknown} conn - The connection object to check.
 */
function assertIsPromiseConnection(conn: unknown): asserts conn is amqp.Connection {
  // --- FIX ---
  // We use `(conn as any)` to bypass the compile-time check within the type guard itself,
  // relying on the runtime check for the function's existence.
  if (!conn || typeof conn !== "object" || typeof (conn as any).createChannel !== "function") {
    throw new Error("Returned object from amqp.connect does not appear to be a promise-based Connection.");
  }
}

/**
 * @function stopConsumer
 * @description Gracefully closes the channel and connection to RabbitMQ.
 */
export async function stopConsumer(): Promise<void> {
  if (isClosing) return;
  isClosing = true;
  logger("Stopping RabbitMQ consumer...", "AMQP_CONSUMER", "yellow");
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    // --- FIX ---
    // We close the connection using a runtime type check to avoid TypeScript's compile-time error.
    if (connection && typeof (connection as any).close === "function") {
      await (connection as any).close();
      connection = null;
    }
    logger("RabbitMQ consumer stopped gracefully.", "AMQP_CONSUMER", "green");
  } catch (err: any) {
    logger(`Error during consumer shutdown: ${err.message}`, "AMQP_CONSUMER", "red");
  } finally {
    isClosing = false;
  }
}

/**
 * @function establishConnection
 * @description Establishes a connection and channel, and sets up listeners.
 */
async function establishConnection(): Promise<void> {
  logger(`Connecting to RabbitMQ at ${config.RABBITMQ_URL}`, "AMQP_CONSUMER", "cyan");

  const conn = await amqp.connect(config.RABBITMQ_URL);
  assertIsPromiseConnection(conn);

  const ch = await conn.createChannel();

  await ch.assertExchange(config.RABBITMQ_EXCHANGE, "topic", { durable: true });
  const q = await ch.assertQueue(config.RABBITMQ_SEARCH_QUEUE, { durable: true });
  await ch.bindQueue(q.queue, config.RABBITMQ_EXCHANGE, "product.#");

  connection = conn;
  channel = ch;

  connection.on("error", (err) => {
    logger(`RabbitMQ connection error: ${err.message}`, "AMQP_CONSUMER", "red");
  });

  connection.on("close", () => {
    logger("RabbitMQ connection closed.", "AMQP_CONSUMER", "yellow");
    connection = null;
    channel = null;
    if (!isClosing) {
      logger("Attempting to reconnect in 5 seconds...", "AMQP_CONSUMER", "yellow");
      setTimeout(startConsumer, 5000);
    }
  });

  logger(`Consumer ready. Listening to queue: ${q.queue}`, "AMQP_CONSUMER", "green");
  ch.consume(q.queue, (msg) => handleMessage(msg, ch), { noAck: false });
}

/**
 * @function startConsumer
 * @description The main public function to start the consumer with retry logic.
 */
export async function startConsumer(): Promise<void> {
  if (connection) {
    logger("Consumer is already running.", "AMQP_CONSUMER", "yellow");
    return;
  }
  const maxRetries = config.STARTUP_RETRIES;
  const retryDelay = config.STARTUP_RETRY_DELAY_MS;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await establishConnection();
      return;
    } catch (err: any) {
      const logLevel = attempt < maxRetries ? "WARN" : "ERROR";
      const logColor = attempt < maxRetries ? "yellow" : "red";
      logger(
        `Failed to connect to RabbitMQ (attempt ${attempt}/${maxRetries}): ${err.message}`,
        logLevel,
        logColor
      );
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        throw new Error(`Could not connect to RabbitMQ after ${maxRetries} attempts.`);
      }
    }
  }
}

/**
 * @function handleMessage
 * @description Processes an incoming message from the queue.
 */
function handleMessage(msg: ConsumeMessage | null, ch: Channel): void {
  if (msg === null) {
    logger("Received null message (queue may have been deleted).", "AMQP_HANDLER", "yellow");
    return;
  }
  let payload: unknown;
  try {
    payload = JSON.parse(msg.content.toString());
  } catch (err) {
    logger("Failed to parse message content as JSON. Rejecting message.", "AMQP_HANDLER", "red");
    ch.nack(msg, false, false);
    return;
  }
  handleProductEvent(msg.fields.routingKey, payload)
    .then(() => {
      ch.ack(msg);
    })
    .catch(() => {
      ch.nack(msg, false, false);
    });
}