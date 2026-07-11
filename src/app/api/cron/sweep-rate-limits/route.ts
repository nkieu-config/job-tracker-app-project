import { NextResponse } from "next/server";
import { deleteExpiredRateLimits } from "@/server/rate-limit";

export const maxDuration = 30;

// Vercel Cron hits this on a schedule (see vercel.json). It's a public URL, so
// it authenticates the caller against CRON_SECRET; Vercel sends it as
// `Authorization: Bearer <CRON_SECRET>`. Without the secret set the route
// refuses to run rather than silently accepting anyone.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deleted = await deleteExpiredRateLimits();
  return NextResponse.json({ deleted });
}
