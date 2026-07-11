import "server-only";

import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const pooledConnectionString = process.env.DATABASE_URL;
const migrationOnlyDirectConnectionString = process.env.DIRECT_URL;

const connectionString =
  pooledConnectionString ?? migrationOnlyDirectConnectionString;
if (!connectionString) {
  throw new Error("DATABASE_URL or DIRECT_URL must be set");
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
