import { defineConfig } from "@hey-api/openapi-ts";
import { config } from "dotenv";

// Try to load .env.local (local development) and .env (CI/production)
config({ path: ".env.local" });
config({ path: ".env" });

// Use env var or fallback to default location (matches backend default)
const openapiFile =
  process.env.OPENAPI_OUTPUT_FILE || "../local-shared-data/openapi.json";

export default defineConfig({
  input: openapiFile,
  output: {
    format: "prettier",
    lint: "eslint",
    path: "app/openapi-client",
  },
  plugins: ["@hey-api/client-axios"],
});
