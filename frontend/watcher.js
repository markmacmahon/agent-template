/* eslint-disable @typescript-eslint/no-require-imports */
const chokidar = require("chokidar");
const { exec } = require("child_process");
const { config } = require("dotenv");
const { createLogger } = require("./scripts/logger");

config({ path: ".env.local" });

const logger = createLogger("frontend:watcher");

const openapiFile = process.env.OPENAPI_OUTPUT_FILE;
// Watch the specific file for changes
chokidar.watch(openapiFile).on("change", (path) => {
  logger.info(`File ${path} has been modified. Running generate-client...`);
  exec("pnpm run generate-client", (error, stdout, stderr) => {
    if (error) {
      logger.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      logger.warn(`stderr: ${stderr}`);
      return;
    }
    logger.info(`stdout: ${stdout}`);
  });
});
