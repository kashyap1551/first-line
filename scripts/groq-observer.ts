import type { CallFacts } from "../lib/eval-report";

type GroqReply = {
  choices?: { finish_reason?: unknown }[];
  usage?: {
    prompt_tokens?: unknown;
    completion_tokens?: unknown;
    completion_tokens_details?: { reasoning_tokens?: unknown };
  };
  error?: { code?: unknown };
};

const asNumber = (v: unknown) => (typeof v === "number" ? v : undefined);
const asString = (v: unknown) => (typeof v === "string" ? v : undefined);

/**
 * Wraps fetch so every AI call's HTTP status, finish_reason and token counts are
 * recorded. It reads only the reply body; it never looks at the request headers
 * (where the key is) and never keeps the reply text.
 */
export function observeGroqCalls() {
  let facts: CallFacts[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const response = await realFetch(input, init);
    const body = (await response
      .clone()
      .json()
      .catch(() => null)) as GroqReply | null;
    facts.push({
      httpStatus: response.status,
      errorCode: asString(body?.error?.code),
      finishReason: asString(body?.choices?.[0]?.finish_reason),
      promptTokens: asNumber(body?.usage?.prompt_tokens),
      completionTokens: asNumber(body?.usage?.completion_tokens),
      reasoningTokens: asNumber(body?.usage?.completion_tokens_details?.reasoning_tokens),
    });
    return response;
  };
  return {
    takeFacts() {
      const out = facts;
      facts = [];
      return out;
    },
    restore() {
      globalThis.fetch = realFetch;
    },
  };
}
