import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: (request) => {
    if (!request) return [];
    const origin = request.headers.get("origin") ?? "";
    const host = request.headers.get("host") ?? "";
    const isLocalServer = /^localhost(:\d+)?$/.test(host);
    return isLocalServer && /^http:\/\/localhost:\d+$/.test(origin)
      ? [origin]
      : [];
  },
  // nextCookies() must be the LAST plugin — it lets Better Auth set cookies
  // from Next.js server actions/route handlers.
  plugins: [nextCookies()],
});
