import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

// We connect with the DIRECT (non-pooled) Neon connection at runtime.
//
// Why not the pooled endpoint? With node-postgres, Neon's pooler needs
// SNI to route to the right endpoint, but Neon's wildcard cert doesn't
// cover its multi-label hostnames — so you must either send SNI (and
// fail cert verification) or skip verification (and lose SNI routing).
// The pooler then returns "Endpoint ID not specified" / auth errors.
// The direct connection avoids this and is reliable at this app's scale.
// Revisit pooling (Neon serverless driver / Prisma Accelerate) if
// connection counts grow.
const rawUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!rawUrl) {
  throw new Error("DIRECT_URL or DATABASE_URL must be set");
}

// node-postgres now treats `sslmode=require` as full verification, but
// Neon's cert doesn't match its hostname. `uselibpqcompat=true` restores
// libpq's `require` behaviour: encrypt the connection without verifying
// the hostname — which is Neon's documented default.
function neonConnectionString(url: string): string {
  const u = new URL(url);
  u.searchParams.set("sslmode", "require");
  u.searchParams.set("uselibpqcompat", "true");
  return u.toString();
}

const connectionString = neonConnectionString(rawUrl);

// Reuse a single PrismaClient across hot reloads in dev to avoid
// exhausting the database connection pool.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
