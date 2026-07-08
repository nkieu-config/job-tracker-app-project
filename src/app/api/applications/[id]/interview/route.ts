import { getSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import { interviewPrepStream } from "@/lib/ai-client";
import { checkAiRateLimit } from "@/lib/rate-limit";

export const maxDuration = 30;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const application = await prisma.application.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!application) {
    return new Response("Not found", { status: 404 });
  }
  if (!application.jobDescription?.trim()) {
    return new Response("Add a job description first.", { status: 400 });
  }

  if (!(await checkAiRateLimit(session.user.id))) {
    return new Response("AI rate limit reached. Please try again later.", {
      status: 429,
    });
  }

  const aiRes = await interviewPrepStream(
    application.jobDescription,
    application.role,
  );

  if (!aiRes.ok || !aiRes.body) {
    return new Response(
      (await aiRes.text()) || "Failed to generate interview prep.",
      { status: aiRes.status },
    );
  }

  return new Response(aiRes.body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
