import { z } from "zod";
import type { AnswerResult, HandoverReason } from "./answer";

// The browser's record of questions asked in the demo. Plain functions only:
// the widget keeps one store, and the inbox and billing pages will read it later.

export const STORAGE_KEY = "firstline:v1:events";
export const DAILY_CAP = 20;

export const HANDOVER_REASONS = [
  "billing_dispute",
  "security",
  "asked_for_human",
  "account_recovery",
  "privacy_request",
  "legal_complaint",
  "ai_invalid_output",
  "language_not_supported",
  "ai_unsure",
  "no_valid_source",
  "quote_not_found",
] as const satisfies readonly HandoverReason[];
// Fails the type check if lib/answer.ts gains a reason that is missing above.
const _allReasons: [Exclude<HandoverReason, (typeof HANDOVER_REASONS)[number]>] extends [never]
  ? true
  : never = true;
void _allReasons;

export type Outcome = AnswerResult["outcome"];
/** A handover reason, or the customer clicking No on an answer. */
export type Reason = HandoverReason | "customer_said_no";
export type Feedback = null | "yes" | "no";

export type ChatEvent = {
  id: string;
  /** ISO time the reply arrived. */
  at: string;
  question: string;
  outcome: Outcome;
  reason?: Reason;
  answer?: string;
  cited_ids?: string[];
  quote?: string;
  summary?: string;
  feedback: Feedback;
  /** The team marked this handover as handled. Missing on older records. */
  done?: boolean;
};

const OUTCOMES = [
  "answered",
  "handover",
  "declined",
  "unavailable",
  "paused",
  "rejected",
] as const satisfies readonly Outcome[];

// What /api/answer may send back. Anything else counts as "unavailable".
const ResponseSchema = z.discriminatedUnion("outcome", [
  z.object({
    outcome: z.literal("answered"),
    answer: z.string(),
    cited_ids: z.array(z.string()),
    quote: z.string(),
  }),
  z.object({
    outcome: z.literal("handover"),
    reason: z.enum(HANDOVER_REASONS),
    summary: z.string(),
  }),
  z.object({ outcome: z.literal("declined") }),
  z.object({ outcome: z.literal("paused") }),
  z.object({ outcome: z.literal("unavailable") }),
  z.object({ outcome: z.literal("rejected") }),
]);

const StoredEventSchema = z.object({
  id: z.string(),
  at: z.string(),
  question: z.string(),
  outcome: z.enum(OUTCOMES),
  reason: z.enum([...HANDOVER_REASONS, "customer_said_no"]).optional(),
  answer: z.string().optional(),
  cited_ids: z.array(z.string()).optional(),
  quote: z.string().optional(),
  summary: z.string().optional(),
  feedback: z.union([z.null(), z.literal("yes"), z.literal("no")]),
  done: z.boolean().optional(),
});

/** Turns the reply body from /api/answer into a record. Unknown replies become "unavailable". */
export function eventFromResponse(
  id: string,
  at: string,
  question: string,
  body: unknown,
): ChatEvent {
  const base = { id, at, question, feedback: null };
  const parsed = ResponseSchema.safeParse(body);
  if (!parsed.success) return { ...base, outcome: "unavailable" };
  const r = parsed.data;
  if (r.outcome === "answered") {
    return {
      ...base,
      outcome: "answered",
      answer: r.answer,
      cited_ids: r.cited_ids,
      quote: r.quote,
    };
  }
  if (r.outcome === "handover") {
    return { ...base, outcome: "handover", reason: r.reason, summary: r.summary };
  }
  return { ...base, outcome: r.outcome };
}

export function addEvent(events: ChatEvent[], event: ChatEvent): ChatEvent[] {
  return [...events, event];
}

/**
 * Records Yes or No, only on an answered question and only once. Otherwise the
 * same list comes back unchanged. No turns it into a handover with the reason
 * customer_said_no and keeps the original answer.
 */
export function setFeedback(
  events: ChatEvent[],
  id: string,
  feedback: "yes" | "no",
): ChatEvent[] {
  const target = events.find((e) => e.id === id);
  if (!target || target.outcome !== "answered" || target.feedback !== null) {
    return events;
  }
  const updated: ChatEvent =
    feedback === "yes"
      ? { ...target, feedback: "yes" }
      : {
          ...target,
          outcome: "handover",
          reason: "customer_said_no",
          summary: target.question,
          feedback: "no",
        };
  return events.map((e) => (e === target ? updated : e));
}

/** The team marks a handover as handled: only on a handover, only once. Otherwise the same list comes back. */
export function markDone(events: ChatEvent[], id: string): ChatEvent[] {
  const target = events.find((e) => e.id === id);
  if (!target || target.outcome !== "handover" || target.done === true) {
    return events;
  }
  return events.map((e) => (e === target ? { ...target, done: true } : e));
}

/** Newest first; for the same time, the one recorded later comes first. */
export function newestFirst(events: ChatEvent[]): ChatEvent[] {
  return events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => b.event.at.localeCompare(a.event.at) || b.index - a.index)
    .map(({ event }) => event);
}

const sameLocalDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** Questions sent on the local date of `now`, whatever their outcome. */
export function questionsToday(events: ChatEvent[], now: Date): number {
  return events.filter((e) => sameLocalDay(new Date(e.at), now)).length;
}

export function questionsLeft(events: ChatEvent[], now: Date): number {
  return Math.max(0, DAILY_CAP - questionsToday(events, now));
}

export function capReached(events: ChatEvent[], now: Date): boolean {
  return questionsLeft(events, now) === 0;
}

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function parseStored(raw: string | null): ChatEvent[] {
  if (raw === null) return [];
  const json: unknown = JSON.parse(raw);
  if (!Array.isArray(json)) return [];
  return json.flatMap((item) => {
    const parsed = StoredEventSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

/**
 * Keeps the record in browser storage. Every storage read and write is wrapped
 * in try/catch; when storage fails, the record lives in memory only.
 */
export function createEventStore(getStorage: () => StorageLike | undefined) {
  let memory: ChatEvent[] | null = null;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  function read(): ChatEvent[] {
    try {
      return parseStored(getStorage()?.getItem(STORAGE_KEY) ?? null);
    } catch {
      return [];
    }
  }

  return {
    /** The current record. The same list comes back until something changes. */
    load(): ChatEvent[] {
      memory ??= read();
      return memory;
    },
    save(events: ChatEvent[]) {
      memory = events;
      try {
        getStorage()?.setItem(STORAGE_KEY, JSON.stringify(events));
      } catch {
        // Memory only.
      }
      notify();
    },
    clearAll() {
      memory = [];
      try {
        getStorage()?.removeItem(STORAGE_KEY);
      } catch {
        // Memory only.
      }
      notify();
    },
    /** Reads storage again, for example after another tab changed it. */
    reload() {
      memory = null;
      notify();
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type EventStore = ReturnType<typeof createEventStore>;
