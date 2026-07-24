import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { attachDatabasePool } from "@vercel/functions";
import pg from "pg";
import { PrismaClient } from "@/generated/prisma/client";

const pooledConnectionString = process.env.DATABASE_URL;
const migrationOnlyDirectConnectionString = process.env.DIRECT_URL;

const rawConnectionString =
  pooledConnectionString ?? migrationOnlyDirectConnectionString;
if (!rawConnectionString) {
  throw new Error("DATABASE_URL or DIRECT_URL must be set");
}

const ALIASED_SSL_MODES = new Set(["prefer", "require", "verify-ca"]);

function pinSslMode(url: string): string {
  try {
    const parsed = new URL(url);
    const mode = parsed.searchParams.get("sslmode");
    if (mode && ALIASED_SSL_MODES.has(mode)) {
      parsed.searchParams.set("sslmode", "verify-full");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

const connectionString = pinSslMode(rawConnectionString);

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// `pg` waits forever for a free connection by default, which is the worst way
// to run out of them: a page that needs more of the pool than is left renders
// an empty <main> and never resolves or errors, so nothing upstream can retry
// or say what happened. The browser suite caught exactly that — a desk route
// that opens a session, its metadata query and three more in parallel, stalled
// past fifteen seconds against a pool of five under concurrent load, then
// rendered in one second alone. Ten seconds is far longer than any healthy
// acquire and short enough that starvation surfaces as an error boundary
// instead of a hang.
const POOL_ACQUIRE_TIMEOUT_MS = 10_000;

function createPrismaClient(): PrismaClient {
  const pool = new pg.Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: POOL_ACQUIRE_TIMEOUT_MS,
  });
  attachDatabasePool(pool);
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
