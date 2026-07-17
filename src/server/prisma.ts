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

function createPrismaClient(): PrismaClient {
  const pool = new pg.Pool({ connectionString, max: 5 });
  attachDatabasePool(pool);
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
