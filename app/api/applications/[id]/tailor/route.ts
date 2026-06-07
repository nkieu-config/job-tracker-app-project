import { GoogleGenAI } from "@google/genai";
import { getSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";

// Allow time for the model to stream on Vercel (Pro+).
export const maxDuration = 30;

export async function POST(
  request: Request,
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

  const body = (await request.json().catch(() => ({}))) as {
    experience?: string;
  };
  const experience = (body.experience ?? "").toString().trim();
  if (!experience) {
    return new Response("Describe your experience first.", { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response("AI is not configured.", { status: 503 });
  }
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are an expert resume writer. Rewrite the candidate's experience into 3-5 strong, tailored resume bullet points for the target job.

Rules:
- Start each bullet with "- " on its own line.
- Lead with a strong action verb; quantify impact where the input allows.
- Emphasise skills and keywords relevant to the job description.
- Do NOT invent facts, numbers, or technologies not implied by the experience.
- Output only the bullet points, nothing else.

Target job description:
"""
${application.jobDescription.slice(0, 6000)}
"""

Candidate's experience:
"""
${experience.slice(0, 4000)}
"""`;

  let stream;
  try {
    stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { temperature: 0.6 },
    });
  } catch {
    return new Response("The AI service failed. Please try again.", {
      status: 502,
    });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.text) controller.enqueue(encoder.encode(chunk.text));
        }
      } catch {
        controller.enqueue(encoder.encode("\n\n[The stream was interrupted.]"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
