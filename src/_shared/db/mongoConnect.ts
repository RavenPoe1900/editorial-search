import mongoose, { Model } from "mongoose";
import path from "path";
import fs from "fs";
import config from "../config/config";
import { logger } from "../utils/logger";

class MongooseDb {
  mongoose = mongoose;
  models: Record<string, Model<any>> = {};

  async connect() {
    const uri = config.MONGODB.url;
    if (!uri) {
      throw new Error("MONGO_URI is not defined in configuration.");
    }
    try {
      await this.mongoose.connect(uri, {
        autoIndex: true,
        sanitizeFilter: true,
      } as any);
      logger("Connected to MongoDB with Mongoose");
      this.loadModels();
    } catch (err) {
      console.error("Failed to connect to MongoDB with Mongoose", err);
      process.exit(1);
    }
  }

  private loadModels() {
    const srcPath = path.resolve(__dirname, "../../");
    const findSchemas = (dir: string): string[] => {
      const results: string[] = [];
      const list = fs.readdirSync(dir);

      list.forEach((file) => {
        const filePath = path.resolve(dir, file);
        const stat = fs.statSync(filePath);

        if (stat && stat.isDirectory()) {
          if (path.basename(filePath) === "domain") {
            const domainList = fs.readdirSync(filePath);
            domainList.forEach((domainFile) => {
              const domainPath = path.resolve(filePath, domainFile);
              if (fs.statSync(domainPath).isFile() && domainFile.endsWith(".schema.ts")) {
                results.push(domainPath);
              }
            });
          } else {
            results.push(...findSchemas(filePath));
          }
        }
      });

      return results;
    };

    try {
      const schemaFiles = findSchemas(srcPath);
      schemaFiles.forEach((file) => {
        const modelName = path.basename(file, ".schema.ts");
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        this.models[modelName] = require(file).default || require(file);
      });
    } catch (err) {
      console.error("Failed to load models", err);
    }
  }

  async disconnect() {
    try {
      await this.mongoose.disconnect();
      console.log("Disconnected from MongoDB with Mongoose");
    } catch (err) {
      console.error("Failed to disconnect from MongoDB with Mongoose", err);
    }
  }
}

export default MongooseDb;