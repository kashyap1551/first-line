import { readFileSync } from "node:fs";
import { join } from "node:path";
import { answerQuestion } from "@/lib/answer";
import { parseArticles, type Article } from "@/lib/content";
import { callGroq } from "@/lib/groq";

// Nothing here logs the question, the AI reply or any key.

let articles: Article[] | undefined;
const helpCentre = () =>
  (articles ??= parseArticles(
    readFileSync(join(process.cwd(), "content", "help-center.md"), "utf8"),
  ));

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
    articles: helpCentre(),
    aiEnabled: process.env.AI_ENABLED,
  });
  return Response.json(result, {
    status: result.outcome === "rejected" ? 400 : 200,
  });
}
