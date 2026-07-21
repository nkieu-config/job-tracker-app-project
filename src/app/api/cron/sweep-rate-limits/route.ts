import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { deleteExpiredRateLimits } from "@/server/rate-limit";
import { deleteExpiredAiUsage } from "@/server/data/ai-usage";
import { jsonError } from "@/lib/http";

export const maxDuration = 30;

function authorizationMatches(header: string | null, secret: string): boolean {
  if (header === null) return false;
  const provided = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${secret}`);
  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}

// Vercel Cron hits this on a schedule (see vercel.json). It's a public URL, so
// it authenticates the caller against CRON_SECRET; Vercel sends it as
// `Authorization: Bearer <CRON_SECRET>`. Without the secret set the route
// refuses to run rather than silently accepting anyone.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return jsonError("Not configured", 503);
  }
  if (!authorizationMatches(request.headers.get("authorization"), secret)) {
    return jsonError("Unauthorized", 401);
  }

  const [rateLimits, aiUsage] = await Promise.all([
    deleteExpiredRateLimits(),
    deleteExpiredAiUsage(),
  ]);
  return NextResponse.json({ deleted: { rateLimits, aiUsage } });
}
