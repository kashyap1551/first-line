import { describe, expect, it } from "vitest";
import type { HandoverReason } from "../lib/answer";
import {
  CAP_REACHED,
  UI,
  canSend,
  charCount,
  demoNote,
  questionsLeftText,
  replyFor,
  type Outcome,
  type Reason,
} from "../lib/chat-messages";
import { setFeedback, type ChatEvent } from "../lib/chat-store";

// Customer wording copied by hand from Chinmay's approved list (2026-11-28).
const TEAM =
  "I've passed your question to the Tallyfox team. They reply Monday to Friday, 9:00–17:00 CET, within 1 business day.";
const AFTER_NO =
  "Sorry about that. I've passed your question to the Tallyfox team. They reply Monday to Friday, 9:00–17:00 CET, within 1 business day.";
const AFTER_YES = "Great, glad that helped.";
const LANGUAGE =
  "I can only answer in English for now. I've passed your question to the Tallyfox team.";
const DECLINED = "I can only help with questions about Tallyfox.";
const UNAVAILABLE = "The demo is busy right now. Please try again in a minute.";
const PAUSED = "The demo is paused right now.";
const REJECTED = "Please type a question of up to 500 characters.";
const CAP = "You've reached today's limit of 20 demo questions. Come back tomorrow.";

// Every handover reason, written out by hand. The type check below fails if
// lib/answer.ts gains a reason that is missing here.
const HANDOVER_REASONS = [
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
type Missing = Exclude<HandoverReason, (typeof HANDOVER_REASONS)[number]>;
const noneMissing: [Missing] extends [never] ? true : false = true;

const HARD_RULES = [
  "billing_dispute",
  "security",
  "asked_for_human",
  "account_recovery",
  "privacy_request",
  "legal_complaint",
] as const;

const ALL_REASONS: Reason[] = [...HANDOVER_REASONS, "customer_said_no"];
const ALL_OUTCOMES: Outcome[] = [
  "answered", "handover", "declined", "unavailable", "paused", "rejected",
];

const TITLES = { A04: "Payment methods for your Tallyfox subscription" };

const base = { id: "e1", at: "2026-11-28T10:00:00.000Z", question: "q", feedback: null };
const answered: ChatEvent = {
  ...base,
  outcome: "answered",
  answer: "No, PayPal is not accepted.",
  cited_ids: ["A04"],
  quote: "PayPal is not accepted.",
};
const handover = (reason: HandoverReason): ChatEvent => ({
  ...base,
  outcome: "handover",
  reason,
  summary: "s",
});
const only = (outcome: Outcome): ChatEvent => ({ ...base, outcome });

describe("answered", () => {
  it("shows the answer, the quote from the help centre, its article and the question", () => {
    const reply = replyFor(answered, TITLES);
    expect(reply.text).toBe("No, PayPal is not accepted.");
    expect(reply.evidence).toEqual({
      label: "From the help centre:",
      quote: "PayPal is not accepted.",
      sources: [{ id: "A04", title: "Payment methods for your Tallyfox subscription" }],
    });
    expect(reply.feedback).toEqual({ question: "Did this solve it?", given: null });
    expect(reply.followUp).toBeUndefined();
  });

  it("falls back to the article id if a title is unknown", () => {
    const reply = replyFor({ ...answered, cited_ids: ["A04", "A99"] }, TITLES);
    expect(reply.evidence?.sources[1]).toEqual({ id: "A99", title: "A99" });
  });

  it("after Yes: 'Great, glad that helped.'", () => {
    const [event] = setFeedback([answered], "e1", "yes");
    const reply = replyFor(event, TITLES);
    expect(reply.feedback?.given).toBe("yes");
    expect(reply.followUp?.text).toBe(AFTER_YES);
  });

  it("after No: still shows the answer and quote, then the sorry message", () => {
    const [event] = setFeedback([answered], "e1", "no");
    const reply = replyFor(event, TITLES);
    expect(reply.text).toBe("No, PayPal is not accepted.");
    expect(reply.evidence?.quote).toBe("PayPal is not accepted.");
    expect(reply.feedback?.given).toBe("no");
    expect(reply.followUp?.text).toBe(AFTER_NO);
  });
});

describe("everything else uses exactly the approved wording", () => {
  it.each(HANDOVER_REASONS.filter((r) => r !== "language_not_supported"))(
    "handover %s: the team message",
    (reason) => {
      const reply = replyFor(handover(reason), TITLES);
      expect(reply.text).toBe(TEAM);
      expect(reply.evidence).toBeUndefined();
      expect(reply.feedback).toBeUndefined();
    },
  );

  it("handover language_not_supported: English-only message", () => {
    expect(replyFor(handover("language_not_supported"), TITLES).text).toBe(LANGUAGE);
  });

  it("declined, unavailable, paused, rejected", () => {
    expect(replyFor(only("declined"), TITLES).text).toBe(DECLINED);
    expect(replyFor(only("unavailable"), TITLES).text).toBe(UNAVAILABLE);
    expect(replyFor(only("paused"), TITLES).text).toBe(PAUSED);
    expect(replyFor(only("rejected"), TITLES).text).toBe(REJECTED);
  });

  it("daily cap reached", () => {
    expect(CAP_REACHED.text).toBe(CAP);
  });
});

describe("demo notes: every reason and outcome has one", () => {
  it("the reason list above covers every HandoverReason", () => {
    expect(noneMissing).toBe(true);
  });

  it.each(ALL_REASONS)("reason %s has a demo note", (reason) => {
    const note = demoNote("handover", reason);
    expect(typeof note).toBe("string");
    expect(note.trim().length).toBeGreaterThan(0);
  });

  it.each(ALL_OUTCOMES)("outcome %s has a demo note", (outcome) => {
    const note = demoNote(outcome);
    expect(typeof note).toBe("string");
    expect(note.trim().length).toBeGreaterThan(0);
  });

  it("the daily cap has a demo note", () => {
    expect(CAP_REACHED.note.trim().length).toBeGreaterThan(0);
  });

  it.each(HARD_RULES)("hard rule %s says no AI was used", (reason) => {
    expect(demoNote("handover", reason)).toContain("(no AI used)");
  });

  it("each reason has its own note (no copy-paste)", () => {
    const notes = ALL_REASONS.map((r) => demoNote("handover", r));
    expect(new Set(notes).size).toBe(ALL_REASONS.length);
  });

  it("every reply carries its note", () => {
    expect(replyFor(handover("quote_not_found"), TITLES).note).toBe(
      demoNote("handover", "quote_not_found"),
    );
    expect(replyFor(only("declined"), TITLES).note).toBe(demoNote("declined"));
    expect(replyFor(answered, TITLES).note).toBe(demoNote("answered"));
  });

  it("Yes and No each add their own note under the follow-up", () => {
    const yes = replyFor(setFeedback([answered], "e1", "yes")[0], TITLES);
    const no = replyFor(setFeedback([answered], "e1", "no")[0], TITLES);
    expect(yes.followUp?.note.trim().length).toBeGreaterThan(0);
    expect(no.followUp?.note).toBe(demoNote("handover", "customer_said_no"));
    expect(yes.followUp?.note).not.toBe(no.followUp?.note);
  });
});

describe("widget text", () => {
  it("fixed labels", () => {
    expect(UI.header).toBe("Tallyfox support · AI assistant");
    expect(UI.notice).toBe(
      "Demo with a fictional company. Don't type personal information.",
    );
    expect(UI.waiting).toBe("Checking the help centre…");
    expect(UI.clear).toBe("Clear demo data");
    expect(UI.confirmClear).toBe("Are you sure?");
  });

  it("live counter x/500", () => {
    expect(charCount("")).toBe("0/500");
    expect(charCount("hello")).toBe("5/500");
    expect(charCount("a".repeat(501))).toBe("501/500");
  });

  it("questions left today", () => {
    expect(questionsLeftText(20)).toBe("20 of 20 demo questions left today");
    expect(questionsLeftText(1)).toBe("1 of 20 demo questions left today");
    expect(questionsLeftText(0)).toBe("0 of 20 demo questions left today");
  });
});

describe("canSend", () => {
  const open = { capReached: false, waiting: false };

  it("empty or only spaces: no", () => {
    expect(canSend("", open)).toBe(false);
    expect(canSend("   \n ", open)).toBe(false);
  });

  it("1 to 500 characters: yes", () => {
    expect(canSend("a", open)).toBe(true);
    expect(canSend("a".repeat(500), open)).toBe(true);
  });

  it("501 characters: no", () => {
    expect(canSend("a".repeat(501), open)).toBe(false);
  });

  it("cap reached or still waiting: no", () => {
    expect(canSend("hello", { capReached: true, waiting: false })).toBe(false);
    expect(canSend("hello", { capReached: false, waiting: true })).toBe(false);
  });
});
