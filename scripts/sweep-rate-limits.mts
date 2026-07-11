import "dotenv/config";
import { prisma } from "@/server/prisma";
import { deleteExpiredRateLimits } from "@/server/rate-limit";

const deleted = await deleteExpiredRateLimits();
console.log(`Deleted ${deleted} expired rate_limit row(s)`);

await prisma.$disconnect();
