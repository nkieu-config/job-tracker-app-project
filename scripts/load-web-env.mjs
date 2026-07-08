import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webEnvPath = path.join(rootDir, ".env");

/** Load `.env` for root-level scripts and Prisma CLI. */
export function loadWebEnv() {
  config({ path: webEnvPath, quiet: true });
}
