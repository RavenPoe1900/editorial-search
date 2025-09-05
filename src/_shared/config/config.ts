import dotenv from "dotenv";
dotenv.config();

const PORT = Number(process.env.PORT || 3000);

const config = {
  PORT,
  URL: "/api",
  NODE_ENV: process.env.NODE_ENV,
};

export default config;