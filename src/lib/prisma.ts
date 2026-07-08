import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL must be set");
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
