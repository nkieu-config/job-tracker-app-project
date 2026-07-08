import { getGeminiClient, GENERATION_MODEL } from "./gemini";

type TextChunk = { text?: string };

// Wrap Gemini's async chunk iterator in a web ReadableStream so a Route Handler
// can return it straight to the browser as a plain-text token stream.
function streamResponse(stream: AsyncIterable<TextChunk>): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
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

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function generate(
  prompt: string,
  temperature: number,
): Promise<Response> {
  let ai;
  try {
    ai = getGeminiClient();
  } catch {
    return new Response("AI is not configured.", { status: 503 });
  }

  try {
    const stream = await ai.models.generateContentStream({
      model: GENERATION_MODEL,
      contents: prompt,
      config: { temperature },
    });
    return streamResponse(stream);
  } catch {
    return new Response("The AI service failed. Please try again.", {
      status: 502,
    });
  }
}

export function tailorBulletsStream(
  jobDescription: string,
  experience: string,
): Promise<Response> {
  const prompt = `You are an expert resume writer. Rewrite the candidate's experience into 3-5 strong, tailored resume bullet points for the target job.

Rules:
- Start each bullet with "- " on its own line.
- Lead with a strong action verb; quantify impact where the input allows.
- Emphasise skills and keywords relevant to the job description.
- Do NOT invent facts, numbers, or technologies not implied by the experience.
- Output only the bullet points, nothing else.

Target job description:
"""
${jobDescription.slice(0, 6000)}
"""

Candidate's experience:
"""
${experience.slice(0, 4000)}
"""`;

  return generate(prompt, 0.6);
}

export function interviewPrepStream(
  jobDescription: string,
  role?: string,
): Promise<Response> {
  const prompt = `You are a senior engineering interviewer preparing a candidate for an interview${role ? ` for the role of "${role.slice(0, 200)}"` : ""}.

Based on the job description below, produce a focused interview prep sheet with exactly these sections:

Technical questions
- 5 to 7 questions targeting the specific skills and technologies in the job description.
- After each question, add one line starting with "  Strong answers cover: " summarising what a good answer includes.

Behavioral questions
- 3 questions matched to the seniority and responsibilities implied by the job description, each with the same "  Strong answers cover: " line.

Questions to ask the interviewer
- 3 thoughtful questions the candidate could ask, specific to this role.

Rules:
- Use plain text with "- " bullets and the section headings above. No markdown symbols like # or **.
- Base everything on the job description; do not invent requirements it doesn't mention.

Job description:
"""
${jobDescription.slice(0, 6000)}
"""`;

  return generate(prompt, 0.4);
}
