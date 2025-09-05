import cron from "node-cron";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RefreshToken = require("../../auth/domain/refresh-token.schema");
import { logger } from "../utils/logger";
import config from "../config/config";

export async function cleanupExpiredRefreshTokens({ batchSize = 1000 }: { batchSize?: number } = {}) {
  const now = new Date();
  let totalDeleted = 0;

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const docs = await RefreshToken.find({ expiresAt: { $lte: now } }).limit(batchSize).select("_id").lean();

      if (!docs || docs.length === 0) break;

      const ids = docs.map((d: any) => d._id);
      const res = await RefreshToken.deleteMany({ _id: { $in: ids } });
      totalDeleted += res.deletedCount || 0;
    }

    logger(`Refresh token cleanup completed, deleted ${totalDeleted} expired tokens`);
    return { deletedCount: totalDeleted };
  } catch (err: any) {
    logger(`Error during refresh token cleanup: ${err.message}`, "ERROR", "red" as any);
    throw err;
  }
}

export function registerCleanupJob() {
  const schedule = config.JOB.cronCleanupRefreshTokens || "0 2 * * *";

  if (!cron.validate(schedule)) {
    logger(
      `Invalid cron schedule for refresh token cleanup: ${schedule}. Job not registered.`,
      "WARN",
      "yellow" as any
    );
    return;
  }

  cron.schedule(
    schedule,
    () => {
      logger("Starting scheduled refresh token cleanup job");
      cleanupExpiredRefreshTokens().catch((err) =>
        logger(`Scheduled cleanup failed: ${err.message}`, "ERROR", "red" as any)
      );
    },
    { scheduled: true }
  );

  logger(`Registered refresh token cleanup job with schedule "${schedule}"`);
}