import { z } from "zod";
import { AiInvalidOutputError } from "./ai-errors";
import type { Article } from "./content";
import { buildUserMessage, PROMPT } from "./prompt";
import { matchRule } from "./rules";
import { search } from "./search";

export type AiRequest = { system: string; user: string; signal: AbortSignal };
/** Sends one request to the AI and returns its raw reply text. */
export type CallAi = (request: AiRequest) => Promise<string>;

export type AnswerDeps = {
  callAi: CallAi;
  articles: Article[];
  /** The AI_ENABLED setting. Only the exact text "true" switches the AI on. */
  aiEnabled: string | undefined;
};

export type HandoverReason =
  | "billing_dispute"
  | "security"
  | "asked_for_human"
  | "account_recovery"
  | "privacy_request"
  | "legal_complaint"
  | "ai_invalid_output"
  | "language_not_supported"
  | "ai_unsure"
  | "no_valid_source"
  | "quote_not_found";

export type AnswerResult =
  | { outcome: "rejected"; message: string }
  | { outcome: "paused"; message: string }
  | { outcome: "unavailable"; message: string }
  | { outcome: "handover"; reason: HandoverReason; summary: string }
  | { outcome: "declined" }
  | {
      outcome: "answered";
      answer: string;
      cited_ids: string[];
      quote: string;
    };

export const AI_TIMEOUT_MS = 15_000;

const QuestionSchema = z.string().trim().min(1).max(500);

const AiReplySchema = z
  .object({
    status: z.enum(["answered", "needs_human", "off_topic"]),
    language: z.string().regex(/^[a-z]{2}$/i),
    answer: z.string(),
    cited_ids: z.array(z.string()),
    quote: z.string(),
    handover_summary: z.string(),
  })
  .refine((r) => r.status !== "answered" || r.answer.trim() !== "");

// Differences in spaces and line breaks are ignored; every other character counts.
const squash = (text: string) => text.replace(/\s+/g, " ").trim();

const TIMED_OUT = Symbol("timed out");

/** Sends the request, but gives up and cancels it after AI_TIMEOUT_MS. */
async function callWithTimeout(
  callAi: CallAi,
  system: string,
  user: string,
): Promise<string | typeof TIMED_OUT> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(TIMED_OUT);
    }, AI_TIMEOUT_MS);
  });
  try {
    return await Promise.race([
      callAi({ system, user, signal: controller.signal }),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** The whole answer step. Plain code decides; the AI only reads and writes wording. */
export async function answerQuestion(
  input: unknown,
  deps: AnswerDeps,
): Promise<AnswerResult> {
  // a) Validate.
  const parsed = QuestionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      outcome: "rejected",
      message: "Questions must be 1 to 500 characters.",
    };
  }
  const question = parsed.data;
  const handover = (reason: HandoverReason, summary = question) =>
    ({ outcome: "handover", reason, summary }) as const;

  // b) Kill switch.
  if (deps.aiEnabled !== "true") {
    return { outcome: "paused", message: "Demo paused" };
  }

  // c) Hard rules.
  const rule = matchRule(question);
  if (rule) return handover(rule);

  // d) Top 3 articles.
  const given = search(question, deps.articles).map(
    ({ id }) => deps.articles.find((a) => a.id === id)!,
  );

  // e) One AI call, no retries.
  let text: string | typeof TIMED_OUT;
  try {
    text = await callWithTimeout(
      deps.callAi,
      PROMPT,
      buildUserMessage(question, given),
    );
  } catch (error) {
    if (error instanceof AiInvalidOutputError) {
      return handover("ai_invalid_output");
    }
    text = TIMED_OUT;
  }
  if (text === TIMED_OUT) {
    return { outcome: "unavailable", message: "Demo busy, try later" };
  }

  // f) The reply must be JSON in the expected shape.
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return handover("ai_invalid_output");
  }
  const reply = AiReplySchema.safeParse(json);
  if (!reply.success) return handover("ai_invalid_output");
  const ai = reply.data;

  // g) English only.
  if (ai.language.toLowerCase() !== "en") {
    return handover("language_not_supported");
  }

  // h) Off topic.
  if (ai.status === "off_topic") return { outcome: "declined" };

  // i) The AI isn't sure.
  if (ai.status === "needs_human") {
    return handover("ai_unsure", ai.handover_summary.trim() || question);
  }

  // j) Answered: check the sources and the quote.
  const givenIds = new Set(given.map((a) => a.id));
  if (
    ai.cited_ids.length === 0 ||
    !ai.cited_ids.every((id) => givenIds.has(id))
  ) {
    return handover("no_valid_source");
  }
  const quote = squash(ai.quote);
  const quoteFound =
    quote !== "" &&
    given.some(
      (a) => ai.cited_ids.includes(a.id) && squash(a.body).includes(quote),
    );
  if (!quoteFound) return handover("quote_not_found");

  return {
    outcome: "answered",
    answer: ai.answer,
    cited_ids: ai.cited_ids,
    quote: ai.quote,
  };
}
