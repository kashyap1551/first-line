import { describe, expect, it } from "vitest";
import type { Reason } from "../lib/chat-messages";
import { HANDOVER_REASONS, type ChatEvent } from "../lib/chat-store";
import { INBOX, inbox, teamReason } from "../lib/team-inbox";

const ALL_REASONS: Reason[] = [...HANDOVER_REASONS, "customer_said_no"];
const HARD_RULES = [
  "billing_dispute",
  "security",
  "asked_for_human",
  "account_recovery",
  "privacy_request",
  "legal_complaint",
] as const;

const ev = (id: string, at: string, fields: Partial<ChatEvent> = {}): ChatEvent => ({
  id,
  at,
  question: `q ${id}`,
  outcome: "handover",
  reason: "ai_unsure",
  summary: "s",
  feedback: null,
  ...fields,
});

describe("team wording for each reason", () => {
  it.each(ALL_REASONS)("%s has a reason line for the team", (reason) => {
    const line = teamReason(reason);
    expect(typeof line).toBe("string");
    expect(line.trim().length).toBeGreaterThan(0);
  });

  it.each(HARD_RULES)("hard rule %s says no AI was used", (reason) => {
    expect(teamReason(reason)).toContain("(no AI used)");
  });

  it("examples from the brief", () => {
    expect(teamReason("billing_dispute")).toBe("Hard rule: billing dispute (no AI used)");
    expect(teamReason("customer_said_no")).toBe("Customer clicked No on this answer");
    expect(teamReason("ai_unsure")).toBe("AI couldn't answer from the help articles");
  });

  it("each reason has its own line", () => {
    expect(new Set(ALL_REASONS.map(teamReason)).size).toBe(ALL_REASONS.length);
  });

  it("titles and the empty state, exactly as approved", () => {
    expect(INBOX.title).toBe("Support team inbox");
    expect(INBOX.subtitle).toBe(
      "Tallyfox (fictional) · questions FirstLine handed to a person, from this browser's demo data",
    );
    expect(INBOX.empty).toBe(
      "No handovers yet. Ask something in the demo that needs a person, e.g. 'I was charged twice'.",
    );
  });
});

describe("inbox: handovers only, newest first, split into open and done", () => {
  const list: ChatEvent[] = [
    ev("old", "2026-11-20T09:00:00.000Z"),
    ev("answered", "2026-11-21T09:00:00.000Z", { outcome: "answered", reason: undefined }),
    ev("declined", "2026-11-22T09:00:00.000Z", { outcome: "declined", reason: undefined }),
    ev("new", "2026-11-25T09:00:00.000Z"),
    ev("doneA", "2026-11-23T09:00:00.000Z", { done: true }),
    ev("said-no", "2026-11-24T09:00:00.000Z", { reason: "customer_said_no", feedback: "no" }),
    ev("doneB", "2026-11-26T09:00:00.000Z", { done: true }),
  ];

  it("open: the 3 not-done handovers, newest first", () => {
    expect(inbox(list).open.map((e) => e.id)).toEqual(["new", "said-no", "old"]);
  });

  it("done: the 2 done handovers, newest first", () => {
    expect(inbox(list).done.map((e) => e.id)).toEqual(["doneB", "doneA"]);
  });

  it("an empty record gives two empty lists", () => {
    expect(inbox([])).toEqual({ open: [], done: [] });
  });

  it("same time: the one recorded later comes first", () => {
    const t = "2026-11-25T09:00:00.000Z";
    expect(inbox([ev("first", t), ev("second", t)]).open.map((e) => e.id)).toEqual([
      "second",
      "first",
    ]);
  });
});
