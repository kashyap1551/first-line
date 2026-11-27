import { groqError } from "./ai-errors";
import { AI_TIMEOUT_MS, type CallAi } from "./answer";
import { buildGroqRequest } from "./groq-request";

// The real AI call. Never used by tests: they pass a fake CallAi instead.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export const callGroq: CallAi = async ({ system, user, signal }) => {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("The AI key is not set");

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildGroqRequest(system, user)),
    signal: AbortSignal.any([signal, AbortSignal.timeout(AI_TIMEOUT_MS)]),
  });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw groqError(response.status, body);
  }

  const data: unknown = await response.json();
  const content = (
    data as { choices?: { message?: { content?: unknown } }[] } | null
  )?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("The AI reply had no text");
  }
  return content;
};
