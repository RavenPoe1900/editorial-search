/**
 * @fileoverview Route file discovery utility.
 *
 * Recursively traverses a source tree looking for folders with a specific name
 * (e.g. "infrastructure") and collects files whose names match any of the
 * configured suffixes (e.g. ".root.ts", ".router.ts").
 *
 * Design goals:
 *  - Non-throwing: all filesystem errors are caught and surfaced via an optional logger.
 *  - Deterministic: no reliance on glob libraries; pure recursive traversal.
 *  - Focused: does not attempt to parse or validate the contents of the files.
 */

import fs from "fs";
import path from "path";

/**
 * Options accepted by the findRoutes function.
 */
export interface FindRoutesOptions {
  /**
   * Absolute path where traversal begins (e.g. process.cwd() + "/src").
   */
  startPath: string;

  /**
   * Folder name that is expected to contain route definition files
   * (e.g. "infrastructure"). Matching is case-sensitive.
   */
  targetFolder: string;

  /**
   * List of file suffixes (endings) considered valid route files.
   * Example: [".root.ts", ".router.ts", ".routers.ts"]
   */
  suffixes: string[];

  /**
   * Optional logging function for debug or trace output.
   * Called with plain text messages describing traversal events.
   */
  log?: (msg: string) => void;
}

/**
 * Recursively traverses the directory tree starting at startPath.
 * When a directory matches targetFolder, only the immediate files inside
 * that directory are inspected for accepted suffixes (no deeper recursion there).
 *
 * For every other directory, recursion continues normally.
 *
 * This function never throws; all filesystem errors are caught and optionally logged.
 *
 * @param options FindRoutesOptions
 * @returns Absolute paths to all discovered route files.
 */
export function findRoutes(options: FindRoutesOptions): string[] {
  const { startPath, targetFolder, suffixes, log } = options;
  const results: string[] = [];

  if (!path.isAbsolute(startPath)) {
    log?.(`[findRoutes] WARNING: startPath should be absolute. Provided: ${startPath}`);
  }

  if (!fs.existsSync(startPath)) {
    log?.(`[findRoutes] Start path does not exist: ${startPath}`);
    return results;
  }

  /**
   * Internal recursive walker.
   * @param current Current directory in traversal.
   */
  function walk(current: string) {
    let entries: string[];
    try {
      entries = fs.readdirSync(current);
    } catch (e: any) {
      log?.(`[findRoutes] Cannot read directory: ${current} -> ${e.message}`);
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry);
      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch (e: any) {
        log?.(`[findRoutes] Cannot stat path: ${fullPath} -> ${e.message}`);
        continue;
      }

      if (!stat.isDirectory()) {
        // We only care about directories at this stage.
        continue;
      }

      if (entry === targetFolder) {
        // Inspect ONLY the direct children of the target folder (flat scan).
        let infraFiles: string[];
        try {
            infraFiles = fs.readdirSync(fullPath);
        } catch (e: any) {
            log?.(`[findRoutes] Cannot read target folder: ${fullPath} -> ${e.message}`);
            // Continue traversal after logging.
            walk(fullPath);
            continue;
        }

        for (const f of infraFiles) {
          if (suffixes.some(suf => f.endsWith(suf))) {
            const candidate = path.join(fullPath, f);
            results.push(candidate);
            log?.(`[findRoutes] Matched route file: ${candidate}`);
          }
        }

        // Continue traversal below targetFolder in case nested modules exist unintentionally.
        // (If this is undesirable, remove the line below.)
        walk(fullPath);
        continue;
      }

      // Recurse into non-target directories.
      walk(fullPath);
    }
  }

  walk(startPath);
  return results;
}

export default findRoutes;