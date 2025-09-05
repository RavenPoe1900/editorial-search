import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { logger } from "./_shared/utils/logger";
import errorHandler from "./_shared/middlewares/errorHandle.middleware";
import config from "./_shared/config/config";
import setupSwagger from "./_shared/swagger/setup.swagger";
import setupRoot from "./_shared/root/setup.root";
import jsonSyntaxErrorHandler from "./_shared/middlewares/validate/json.validate";

const app = express();

const port = config.PORT;

app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  })
);
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(jsonSyntaxErrorHandler);

async function init() {
  try {
    setupRoot(app);
    setupSwagger(app, port);

    app.use(errorHandler);

    app.listen(port, () => {
      logger(`Server is running in port:${port}`);
    });
  } catch (err) {
    console.error("Failed to initialize app:", err);
    process.exit(1);
  }
}

init();

export default app;