import { newestFirst, type ChatEvent, type Reason } from "./chat-store";

// The billing page's numbers, for the current local month. Money is whole
// cents (integers only); euros appear only when formatting.

export const DEFAULT_PRICE_CENTS = 50;

// Billing page wording approved by Chinmay on 2026-11-28.
export const BILLING = {
  title: "Billing: this month",
  subtitle: "Tallyfox (fictional) · from this browser's demo data",
  tiles: {
    resolved: "Resolved (billed)",
    unconfirmed: "Unconfirmed (silent)",
    handedOver: "Handed over",
    offTopic: "Off-topic",
    notCounted: "Not counted",
  },
  priceLabel: "Price per resolution",
  priceHint: "Our assumption to test, not a market price",
  confirmedOnly: "Confirmed only (FirstLine)",
  silenceCounts: "Silence counts too (market default)",
  marketNote:
    "In the market rule, a chat counts as resolved if the customer doesn't ask for more help within 24 hours. This demo counts silent chats straight away.",
} as const;

export type BillingSummary = {
  /** Customer questions: answered + handover + declined. */
  billable: number;
  /** Unavailable, paused and rejected: system or input problems, not customer questions. */
  notCounted: number;
  /** Answered and the customer clicked Yes. The only thing FirstLine bills. */
  resolved: number;
  /** Answered, no Yes or No (silent). */
  unconfirmed: number;
  /** Every handover, including customer_said_no. */
  handedOver: number;
  byReason: Partial<Record<Reason, number>>;
  offTopic: number;
  /** resolved ÷ (billable − offTopic) as a whole percent; null when that is 0. */
  resolutionRate: number | null;
  firstLineBillCents: number;
  /** "Silence counts too": (resolved + unconfirmed) × price. */
  marketBillCents: number;
  unverifiedCents: number;
  /** unverifiedCents ÷ marketBillCents as a whole percent; null when the market bill is 0. */
  unverifiedShare: number | null;
  /** The silent answers, newest first. */
  unverified: ChatEvent[];
};

const sameLocalMonth = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

/** A whole percent, rounded to the nearest; null when there is nothing to divide by. */
const percent = (part: number, whole: number) =>
  whole === 0 ? null : Math.round((part * 100) / whole);

export function billingSummary(
  events: ChatEvent[],
  now: Date,
  priceCents: number,
): BillingSummary {
  const month = events.filter((e) => sameLocalMonth(new Date(e.at), now));

  let resolved = 0;
  let offTopic = 0;
  let notCounted = 0;
  const silent: ChatEvent[] = [];
  const handovers: ChatEvent[] = [];
  for (const e of month) {
    if (e.outcome === "answered") {
      if (e.feedback === "yes") resolved++;
      else silent.push(e);
    } else if (e.outcome === "handover") {
      handovers.push(e);
    } else if (e.outcome === "declined") {
      offTopic++;
    } else {
      notCounted++;
    }
  }

  const byReason: Partial<Record<Reason, number>> = {};
  for (const e of handovers) {
    if (e.reason) byReason[e.reason] = (byReason[e.reason] ?? 0) + 1;
  }

  const unconfirmed = silent.length;
  const handedOver = handovers.length;
  const billable = resolved + unconfirmed + handedOver + offTopic;
  const firstLineBillCents = resolved * priceCents;
  const marketBillCents = (resolved + unconfirmed) * priceCents;
  const unverifiedCents = unconfirmed * priceCents;

  return {
    billable,
    notCounted,
    resolved,
    unconfirmed,
    handedOver,
    byReason,
    offTopic,
    resolutionRate: percent(resolved, billable - offTopic),
    firstLineBillCents,
    marketBillCents,
    unverifiedCents,
    unverifiedShare: percent(unverifiedCents, marketBillCents),
    unverified: newestFirst(silent),
  };
}

export const formatPercent = (value: number | null) =>
  value === null ? "–" : `${value}%`;

export function formatEuro(cents: number): string {
  const euros = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, "0");
  return `€${euros}.${rest}`;
}

/** "0.50", "0,5", "1" → cents. Up to €9999.99, at most 2 decimals; anything else is null. */
export function parseEuroToCents(text: string): number | null {
  const match = /^(\d{1,4})(?:[.,](\d{1,2}))?$/.exec(text.trim());
  if (!match) return null;
  const [, whole, fraction = ""] = match;
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

/** The line under the market bill. */
export const unverifiedLine = (s: BillingSummary) =>
  `${formatEuro(s.unverifiedCents)} of this bill (${formatPercent(s.unverifiedShare)}) is for chats nobody confirmed.`;
