import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/app/generated/prisma/client";
import ws from "ws";

// Set up WebSocket constructor for Neon's serverless driver
neonConfig.webSocketConstructor = ws;

// We use the pooled connection string (DATABASE_URL) for the Neon serverless driver
// to take advantage of connection pooling, preventing connection exhaustion.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL must be set");
}

// Reuse a single PrismaClient across hot reloads in dev to avoid
// exhausting the database connection pool.
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
