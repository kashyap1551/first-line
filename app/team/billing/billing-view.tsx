"use client";

import { useId, useState } from "react";
import {
  BILLING,
  DEFAULT_PRICE_CENTS,
  billingSummary,
  formatEuro,
  formatPercent,
  parseEuroToCents,
  unverifiedLine,
} from "@/lib/billing";
import type { Reason } from "@/lib/chat-store";
import { teamReason } from "@/lib/team-inbox";
import { formatTime, useEvents } from "../../components/use-events";

// The numbers and wording live in lib/ (tested). This file only draws them.

type Rule = "confirmed" | "market";

function Tile({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-sm text-zinc-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-900">{value}</p>
      {children}
    </div>
  );
}

export function BillingView() {
  const events = useEvents();
  const [priceText, setPriceText] = useState("0.50");
  const [priceCents, setPriceCents] = useState(DEFAULT_PRICE_CENTS);
  const [rule, setRule] = useState<Rule>("confirmed");
  const priceId = useId();
  const priceHintId = useId();
  const priceErrorId = useId();

  if (events === null) return <p className="text-sm text-zinc-500">Loading…</p>;

  const s = billingSummary(events, new Date(), priceCents);
  const priceValid = parseEuroToCents(priceText) !== null;
  const reasons = Object.entries(s.byReason) as [Reason, number][];
  const price = formatEuro(priceCents);

  const bills = [
    {
      rule: "confirmed" as const,
      label: BILLING.confirmedOnly,
      cents: s.firstLineBillCents,
      formula: `${s.resolved} resolved × ${price}`,
    },
    {
      rule: "market" as const,
      label: BILLING.silenceCounts,
      cents: s.marketBillCents,
      formula: `(${s.resolved} resolved + ${s.unconfirmed} unconfirmed) × ${price}`,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <section aria-label="Counts" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile label={BILLING.tiles.resolved} value={String(s.resolved)} />
        <Tile label={BILLING.tiles.unconfirmed} value={String(s.unconfirmed)} />
        <Tile label={BILLING.tiles.handedOver} value={String(s.handedOver)}>
          {reasons.length > 0 && (
            <ul className="mt-2 text-xs text-zinc-600">
              {reasons.map(([reason, count]) => (
                <li key={reason}>
                  {count} · {teamReason(reason)}
                </li>
              ))}
            </ul>
          )}
        </Tile>
        <Tile label={BILLING.tiles.offTopic} value={String(s.offTopic)} />
        <Tile label={BILLING.tiles.notCounted} value={String(s.notCounted)}>
          <p className="mt-2 text-xs text-zinc-600">Busy, paused or invalid input</p>
        </Tile>
        <Tile label="Resolution rate" value={formatPercent(s.resolutionRate)}>
          <p className="mt-2 text-xs text-zinc-600">
            {s.resolved} resolved of {s.billable - s.offTopic} (off-topic left out)
          </p>
        </Tile>
      </section>

      <section aria-labelledby="bill-heading" className="flex flex-col gap-4">
        <h2 id="bill-heading" className="text-lg font-semibold">
          The bill
        </h2>
        <div>
          <label htmlFor={priceId} className="block text-sm font-medium">
            {BILLING.priceLabel}
          </label>
          <p id={priceHintId} className="text-xs text-zinc-600">
            {BILLING.priceHint}
          </p>
          <div className="mt-1 flex items-center gap-1">
            <span aria-hidden className="text-zinc-600">
              €
            </span>
            <input
              id={priceId}
              type="text"
              inputMode="decimal"
              value={priceText}
              aria-describedby={priceValid ? priceHintId : `${priceHintId} ${priceErrorId}`}
              aria-invalid={!priceValid}
              onChange={(e) => {
                setPriceText(e.target.value);
                const cents = parseEuroToCents(e.target.value);
                if (cents !== null) setPriceCents(cents);
              }}
              className="w-28 rounded-lg border border-zinc-300 px-3 py-1.5 text-zinc-900 focus:border-indigo-500 focus:outline-2 focus:outline-indigo-200 aria-invalid:border-red-500"
            />
          </div>
          {!priceValid && (
            <p id={priceErrorId} className="mt-1 text-xs text-red-700">
              Enter a price from 0 to 9999.99, for example 0.50. The bills still use {price}.
            </p>
          )}
        </div>

        <fieldset>
          <legend className="text-sm font-medium">Billing rule</legend>
          <div className="mt-1 inline-flex rounded-lg border border-zinc-300 bg-white p-1">
            {bills.map((bill) => (
              <label
                key={bill.rule}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-sm has-focus-visible:outline-2 has-focus-visible:outline-indigo-600 ${
                  rule === bill.rule ? "bg-indigo-600 text-white" : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                <input
                  type="radio"
                  name="billing-rule"
                  value={bill.rule}
                  checked={rule === bill.rule}
                  onChange={() => setRule(bill.rule)}
                  className="sr-only"
                />
                {bill.label}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-600">{BILLING.marketNote}</p>
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-2">
          {bills.map((bill) => (
            <div
              key={bill.rule}
              aria-current={rule === bill.rule ? "true" : undefined}
              className={`rounded-xl border bg-white p-4 ${
                rule === bill.rule ? "border-indigo-600 ring-2 ring-indigo-600" : "border-zinc-200 opacity-70"
              }`}
            >
              <p className="text-sm text-zinc-600">{bill.label}</p>
              <p className="mt-1 text-3xl font-semibold">{formatEuro(bill.cents)}</p>
              <p className="mt-1 text-xs text-zinc-500">{bill.formula}</p>
              {bill.rule === "market" && (
                <p className="mt-2 text-sm text-amber-800">{unverifiedLine(s)}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="unverified-heading">
        <h2 id="unverified-heading" className="text-lg font-semibold">
          Unverified chats ({s.unconfirmed})
        </h2>
        <p className="mb-3 text-sm text-zinc-600">Answered, but the customer clicked neither Yes nor No.</p>
        {s.unverified.length === 0 ? (
          <p className="text-sm text-zinc-500">None this month.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {s.unverified.map((e) => (
              <li key={e.id} className="rounded-xl border border-zinc-200 bg-white p-4 text-sm">
                <time dateTime={e.at} className="text-xs text-zinc-500">
                  {formatTime(e.at)}
                </time>
                <p className="mt-1 font-medium text-zinc-900">{e.question}</p>
                <p className="mt-1 text-zinc-700">{e.answer}</p>
                {e.quote && (
                  <blockquote className="mt-2 border-l-4 border-indigo-300 bg-indigo-50 px-3 py-2 text-zinc-800 italic">
                    {e.quote}
                  </blockquote>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
