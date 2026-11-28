import { describe, expect, it } from "vitest";
import {
  BILLING,
  DEFAULT_PRICE_CENTS,
  billingSummary,
  formatEuro,
  formatPercent,
  parseEuroToCents,
  unverifiedLine,
} from "../lib/billing";
import type { ChatEvent } from "../lib/chat-store";

// Local dates only (month index 10 = November), so "this month" is the same on any time zone.
const NOW = new Date(2026, 10, 28, 15, 0);
const at = (month: number, day: number, hour = 10) =>
  new Date(2026, month, day, hour).toISOString();

let n = 0;
const ev = (fields: Partial<ChatEvent>, when = at(10, 10)): ChatEvent => ({
  id: `e${++n}`,
  at: when,
  question: `question ${n}`,
  outcome: "answered",
  feedback: null,
  ...fields,
});
const answer = { answer: "an answer", cited_ids: ["A04"], quote: "PayPal is not accepted." };

// Chinmay's hand-counted session: 10 events, all in November 2026.
const SESSION: ChatEvent[] = [
  ev({ ...answer, outcome: "answered", feedback: "yes" }, at(10, 2)), // 1
  ev({ ...answer, outcome: "answered", feedback: "yes" }, at(10, 3)), // 2
  ev({ ...answer, outcome: "answered", feedback: null }, at(10, 4)), // 3
  ev({ ...answer, outcome: "answered", feedback: null }, at(10, 5)), // 4
  ev(
    { ...answer, outcome: "handover", reason: "customer_said_no", summary: "s", feedback: "no" },
    at(10, 6),
  ), // 5
  ev({ outcome: "handover", reason: "billing_dispute", summary: "s" }, at(10, 7)), // 6
  ev({ outcome: "handover", reason: "ai_unsure", summary: "s" }, at(10, 8)), // 7
  ev({ outcome: "declined" }, at(10, 9)), // 8
  ev({ outcome: "unavailable" }, at(10, 10)), // 9
  ev({ outcome: "handover", reason: "language_not_supported", summary: "s" }, at(10, 11)), // 10
];
const LAST_MONTH = ev({ ...answer, outcome: "answered", feedback: "yes" }, at(9, 31, 23));

describe("billing: the hand-counted 10-question session", () => {
  const s = billingSummary([...SESSION, LAST_MONTH], NOW, 50);

  it("counts: billable 9, not counted 1", () => {
    expect(s.billable).toBe(9);
    expect(s.notCounted).toBe(1);
  });

  it("resolved 2, unconfirmed 2, handed over 4, off-topic 1", () => {
    expect(s.resolved).toBe(2);
    expect(s.unconfirmed).toBe(2);
    expect(s.handedOver).toBe(4);
    expect(s.offTopic).toBe(1);
  });

  it("handover breakdown: one each of customer_said_no, billing_dispute, ai_unsure, language_not_supported", () => {
    expect(s.byReason).toEqual({
      customer_said_no: 1,
      billing_dispute: 1,
      ai_unsure: 1,
      language_not_supported: 1,
    });
  });

  it("resolution rate 25% (2 of 8)", () => {
    expect(s.resolutionRate).toBe(25);
    expect(formatPercent(s.resolutionRate)).toBe("25%");
  });

  it("at 50 cents: FirstLine €1.00, market €2.00, unverified €1.00 (50%)", () => {
    expect(s.firstLineBillCents).toBe(100);
    expect(s.marketBillCents).toBe(200);
    expect(s.unverifiedCents).toBe(100);
    expect(s.unverifiedShare).toBe(50);
    expect(formatEuro(s.firstLineBillCents)).toBe("€1.00");
    expect(formatEuro(s.marketBillCents)).toBe("€2.00");
    expect(formatEuro(s.unverifiedCents)).toBe("€1.00");
    expect(formatPercent(s.unverifiedShare)).toBe("50%");
  });

  it("at 99 cents: FirstLine €1.98, market €3.96", () => {
    const at99 = billingSummary(SESSION, NOW, 99);
    expect(formatEuro(at99.firstLineBillCents)).toBe("€1.98");
    expect(formatEuro(at99.marketBillCents)).toBe("€3.96");
    expect(formatEuro(at99.unverifiedCents)).toBe("€1.98");
    expect(formatPercent(at99.unverifiedShare)).toBe("50%");
  });

  it("the unverified list is the 2 silent answers (3 and 4), newest first", () => {
    expect(s.unverified.map((e) => e.id)).toEqual([SESSION[3].id, SESSION[2].id]);
  });

  it("the event from last month is ignored", () => {
    expect(billingSummary(SESSION, NOW, 50)).toEqual(s);
  });
});

describe("billing: edge cases", () => {
  it("an empty month gives zeros and '–'", () => {
    const s = billingSummary([LAST_MONTH], NOW, 50);
    expect(s).toEqual({
      billable: 0,
      notCounted: 0,
      resolved: 0,
      unconfirmed: 0,
      handedOver: 0,
      byReason: {},
      offTopic: 0,
      resolutionRate: null,
      firstLineBillCents: 0,
      marketBillCents: 0,
      unverifiedCents: 0,
      unverifiedShare: null,
      unverified: [],
    });
    expect(formatPercent(s.resolutionRate)).toBe("–");
    expect(formatPercent(s.unverifiedShare)).toBe("–");
  });

  it("only off-topic questions: rate '–' (nothing to divide by)", () => {
    const s = billingSummary([ev({ outcome: "declined" })], NOW, 50);
    expect(s.billable).toBe(1);
    expect(s.resolutionRate).toBeNull();
  });

  it("paused and rejected are not counted either", () => {
    const s = billingSummary([ev({ outcome: "paused" }), ev({ outcome: "rejected" })], NOW, 50);
    expect(s.billable).toBe(0);
    expect(s.notCounted).toBe(2);
  });

  // Hand count: 1 yes + 2 silent. Rate 1/3 = 33.3% → 33%.
  // Market bill (1+2) × 50 = 150 cents; unverified 2 × 50 = 100; 100/150 = 66.7% → 67%.
  it("whole percents round to the nearest: 33% and 67%", () => {
    const s = billingSummary(
      [
        ev({ ...answer, feedback: "yes" }),
        ev({ ...answer }),
        ev({ ...answer }),
      ],
      NOW,
      50,
    );
    expect(formatPercent(s.resolutionRate)).toBe("33%");
    expect(formatPercent(s.unverifiedShare)).toBe("67%");
    expect(formatEuro(s.marketBillCents)).toBe("€1.50");
  });

  it("price 0: bills €0.00 and the unverified share is '–'", () => {
    const s = billingSummary(SESSION, NOW, 0);
    expect(formatEuro(s.firstLineBillCents)).toBe("€0.00");
    expect(formatPercent(s.unverifiedShare)).toBe("–");
  });

  it("the default price is 50 cents", () => {
    expect(DEFAULT_PRICE_CENTS).toBe(50);
  });
});

describe("money in whole cents", () => {
  it("formatEuro", () => {
    expect(formatEuro(0)).toBe("€0.00");
    expect(formatEuro(5)).toBe("€0.05");
    expect(formatEuro(50)).toBe("€0.50");
    expect(formatEuro(198)).toBe("€1.98");
    expect(formatEuro(123456)).toBe("€1234.56");
  });

  it("parseEuroToCents accepts 0 to 9999.99 with a dot or a comma", () => {
    expect(parseEuroToCents("0.50")).toBe(50);
    expect(parseEuroToCents("0.5")).toBe(50);
    expect(parseEuroToCents("1")).toBe(100);
    expect(parseEuroToCents("0,99")).toBe(99);
    expect(parseEuroToCents(" 0.99 ")).toBe(99);
    expect(parseEuroToCents("0")).toBe(0);
    expect(parseEuroToCents("9999.99")).toBe(999999);
  });

  it("parseEuroToCents rejects anything else", () => {
    for (const bad of ["", " ", "abc", "-1", "0.999", "1.2.3", "10000", ".5", "1."]) {
      expect(parseEuroToCents(bad)).toBeNull();
    }
  });
});

describe("billing page wording, exactly as approved", () => {
  it("titles, tiles, price label, switch and note", () => {
    expect(BILLING.title).toBe("Billing: this month");
    expect(BILLING.subtitle).toBe("Tallyfox (fictional) · from this browser's demo data");
    expect(BILLING.tiles).toEqual({
      resolved: "Resolved (billed)",
      unconfirmed: "Unconfirmed (silent)",
      handedOver: "Handed over",
      offTopic: "Off-topic",
      notCounted: "Not counted",
    });
    expect(BILLING.priceLabel).toBe("Price per resolution");
    expect(BILLING.priceHint).toBe("Our assumption to test, not a market price");
    expect(BILLING.confirmedOnly).toBe("Confirmed only (FirstLine)");
    expect(BILLING.silenceCounts).toBe("Silence counts too (market default)");
    expect(BILLING.marketNote).toBe(
      "In the market rule, a chat counts as resolved if the customer doesn't ask for more help within 24 hours. This demo counts silent chats straight away.",
    );
  });

  it("the line under the market bill, for the hand-counted session at 50 cents", () => {
    const s = billingSummary(SESSION, NOW, 50);
    expect(unverifiedLine(s)).toBe("€1.00 of this bill (50%) is for chats nobody confirmed.");
  });

  it("the line for an empty month", () => {
    const s = billingSummary([], NOW, 50);
    expect(unverifiedLine(s)).toBe("€0.00 of this bill (–) is for chats nobody confirmed.");
  });
});
