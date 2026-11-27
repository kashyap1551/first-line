import { answerQuestion } from "@/lib/answer";
import { callGroq } from "@/lib/groq";
import { articles } from "@/lib/help-centre";

// The only log line is in lib/answer.ts: the error type and HTTP status of a
// failed AI call. Never the question, the AI reply or any key.

export async function POST(request: Request) {
  let question: unknown;
  try {
    const body: unknown = await request.json();
    question =
      typeof body === "object" && body !== null && "question" in body
        ? body.question
        : undefined;
  } catch {
    question = undefined;
  }

  const result = await answerQuestion(question, {
    callAi: callGroq,
    articles,
    aiEnabled: process.env.AI_ENABLED,
  });
  return Response.json(result, {
    status: result.outcome === "rejected" ? 400 : 200,
  });
}
