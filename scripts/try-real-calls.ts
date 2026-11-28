// Day 2b: a few real AI calls through the real answer step.
//
// Run (no extra packages; Vite comes with vitest and understands "?raw"):
//   node --env-file=.env.local -e "import('vite').then(v => v.runnerImport('./scripts/try-real-calls.ts', { configFile: false }))"
//
// For each question it runs the real answerQuestion with the real callGroq.
// While that one question runs, fetch is wrapped so the script can also record
// the HTTP status, finish_reason, token counts and time taken. It prints the
// raw AI reply (invented test questions only). It never prints the key or the
// request headers, and it writes nothing to disk.

import { answerQuestion, type AnswerResult } from "../lib/answer";
import { callGroq } from "../lib/groq";
import { articles } from "../lib/help-centre";
import { matchRule } from "../lib/rules";

const MAX_AI_CALLS = 7; // Day 2b budget is 8; the 8th is C06 through the real route.
const WAIT_MS = 35_000; // 4,000 tokens/minute project limit.

type Expect =
  | { outcome: "answered"; ids: string[] }
  | { outcome: "handover"; reason?: string }
  | { outcome: "declined" };

type Case = { id: string; question: string; expect: Expect; aiCalls?: 0 };

const CASES: Case[] = [
  {
    id: "C35",
    question:
      "Can you correct the billing address on the receipt you sent me last March?",
    expect: { outcome: "handover", reason: "ai_unsure" },
  },
  {
    id: "C39",
    question: "What's the capital of Australia?",
    expect: { outcome: "declined" },
  },
  {
    id: "C03",
    question: "Can I pay for Tallyfox with PayPal?",
    expect: { outcome: "answered", ids: ["A04"] },
  },
  {
    id: "C23",
    question: "I forgot my password",
    expect: { outcome: "answered", ids: ["A21"] },
  },
  {
    id: "C16",
    question: "Can I invoice in US dollars?",
    expect: { outcome: "handover" },
  },
  {
    id: "C22",
    question: "How do I get all my invoices out as a backup?",
    expect: { outcome: "handover" },
  },
  {
    id: "DE",
    question: "Wie kann ich mein Abo kündigen?",
    expect: { outcome: "handover", reason: "language_not_supported" },
  },
  {
    id: "C29",
    question: "I was charged twice this month, please refund me",
    expect: { outcome: "handover", reason: "billing_dispute" },
    aiCalls: 0,
  },
];

type CallFacts = {
  httpStatus: number;
  errorCode?: unknown;
  finishReason?: unknown;
  promptTokens?: unknown;
  completionTokens?: unknown;
  reasoningTokens?: unknown;
  usage?: unknown;
  aiStatus?: unknown;
  raw?: unknown;
};

type Choice = { finish_reason?: unknown; message?: { content?: unknown } };
type GroqReply = {
  choices?: Choice[];
  usage?: {
    prompt_tokens?: unknown;
    completion_tokens?: unknown;
    completion_tokens_details?: { reasoning_tokens?: unknown };
  };
  error?: { code?: unknown };
};

/** Wraps fetch for one question only, and records what each AI call returned. */
async function runOne(question: string) {
  const calls: CallFacts[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const response = await realFetch(input, init);
    const body = (await response
      .clone()
      .json()
      .catch(() => null)) as GroqReply | null;
    const raw = body?.choices?.[0]?.message?.content;
    let aiStatus: unknown;
    try {
      aiStatus = (JSON.parse(String(raw)) as { status?: unknown }).status;
    } catch {
      aiStatus = undefined;
    }
    calls.push({
      httpStatus: response.status,
      errorCode: body?.error?.code,
      finishReason: body?.choices?.[0]?.finish_reason,
      promptTokens: body?.usage?.prompt_tokens,
      completionTokens: body?.usage?.completion_tokens,
      reasoningTokens: body?.usage?.completion_tokens_details?.reasoning_tokens,
      usage: body?.usage,
      aiStatus,
      raw,
    });
    return response;
  };
  const started = performance.now();
  try {
    const result = await answerQuestion(question, {
      callAi: callGroq,
      articles,
      aiEnabled: process.env.AI_ENABLED,
    });
    return { result, calls, seconds: (performance.now() - started) / 1000 };
  } finally {
    globalThis.fetch = realFetch;
  }
}

function matches(expect: Expect, result: AnswerResult): boolean {
  if (expect.outcome !== result.outcome) return false;
  if (expect.outcome === "answered" && result.outcome === "answered") {
    return result.cited_ids.every((id) => expect.ids.includes(id));
  }
  if (expect.outcome === "handover" && result.outcome === "handover") {
    return expect.reason === undefined || expect.reason === result.reason;
  }
  return true;
}

function isWrongAnswer(expect: Expect, result: AnswerResult): boolean {
  if (result.outcome !== "answered") return false;
  return expect.outcome !== "answered" || !matches(expect, result);
}

async function main() {
  // Yes/no only. Never the values.
  console.log("key set:", Boolean(process.env.GROQ_API_KEY));
  console.log("AI_ENABLED is exactly true:", process.env.AI_ENABLED === "true");
  if (!process.env.GROQ_API_KEY || process.env.AI_ENABLED !== "true") {
    console.log("STOP: AI not switched on. No calls made.");
    return;
  }

  let aiCalls = 0;
  for (const c of CASES) {
    const needsAi = matchRule(c.question) === null;
    if (needsAi) {
      if (aiCalls >= MAX_AI_CALLS) {
        console.log(`STOP: budget of ${MAX_AI_CALLS} AI calls reached.`);
        break;
      }
      console.log(`(waiting ${WAIT_MS / 1000} s before ${c.id})`);
      await new Promise((r) => setTimeout(r, WAIT_MS));
    }

    const { result, calls, seconds } = await runOne(c.question);
    aiCalls += calls.length;

    console.log(`\n=== ${c.id}: ${c.question}`);
    for (const call of calls) console.log("raw AI reply:", call.raw);
    const { raw: _raw, ...facts } = calls[0] ?? { httpStatus: 0 };
    void _raw;
    console.log(
      "ROW",
      JSON.stringify({
        id: c.id,
        expect: c.expect,
        result,
        aiCallsThisCase: calls.length,
        seconds: Number(seconds.toFixed(2)),
        ...(calls.length ? facts : {}),
        match: matches(c.expect, result) && (c.aiCalls !== 0 || calls.length === 0),
        wrongAnswer: isWrongAnswer(c.expect, result),
      }),
    );

    const httpFailed = calls.some((call) => call.httpStatus !== 200);
    if (result.outcome === "unavailable" || httpFailed) {
      console.log("STOP: unavailable or HTTP error. No further calls.");
      break;
    }
  }
  console.log(`\nTOTAL AI calls made by this script: ${aiCalls}`);
}

await main();
