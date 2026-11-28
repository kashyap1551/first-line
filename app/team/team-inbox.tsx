"use client";

import { useState } from "react";
import { markDone, type ChatEvent } from "@/lib/chat-store";
import { INBOX, inbox, teamReason } from "@/lib/team-inbox";
import { formatTime, store, useEvents } from "../components/use-events";

// The decisions and wording live in lib/ (tested). This file only draws them.

function Card({ event }: { event: ChatEvent }) {
  const saidNo = event.reason === "customer_said_no";
  const summary = event.summary?.trim();
  return (
    <li className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-indigo-800">
          {event.reason ? teamReason(event.reason) : "Handed over"}
        </p>
        <time dateTime={event.at} className="text-xs text-zinc-500">
          {formatTime(event.at)}
        </time>
      </div>
      <p className="mt-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
        Customer&apos;s question
      </p>
      <p className="whitespace-pre-wrap text-zinc-900">{event.question}</p>
      {summary && summary !== event.question.trim() && (
        <>
          <p className="mt-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            Summary
          </p>
          <p className="text-sm text-zinc-700">{summary}</p>
        </>
      )}
      {saidNo && event.answer !== undefined && (
        <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-sm">
          <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            FirstLine&apos;s answer (the customer clicked No)
          </p>
          <p className="text-zinc-800">{event.answer}</p>
          {event.quote && (
            <blockquote className="mt-2 border-l-4 border-indigo-300 bg-indigo-50 px-3 py-2 text-zinc-800 italic">
              {event.quote}
            </blockquote>
          )}
        </div>
      )}
      <div className="mt-3">
        {event.done ? (
          <p className="text-sm text-emerald-700">Done</p>
        ) : (
          <button
            type="button"
            onClick={() => store.save(markDone(store.load(), event.id))}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Mark done
          </button>
        )}
      </div>
    </li>
  );
}

export function TeamInbox() {
  const events = useEvents();
  const [show, setShow] = useState<"open" | "done">("open");

  if (events === null) return <p className="text-sm text-zinc-500">Loading…</p>;

  const { open, done } = inbox(events);
  if (open.length + done.length === 0) {
    return <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-zinc-600">{INBOX.empty}</p>;
  }
  const shown = show === "open" ? open : done;

  return (
    <div>
      <div role="group" aria-label="Show handovers" className="mb-4 flex gap-2">
        {(
          [
            ["open", `Open (${open.length})`],
            ["done", `Done (${done.length})`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={show === value}
            onClick={() => setShow(value)}
            className={`rounded-full border px-4 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
              show === value
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-zinc-500">
          {show === "open" ? "No open handovers." : "Nothing marked done yet."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((event) => (
            <Card key={event.id} event={event} />
          ))}
        </ul>
      )}
    </div>
  );
}
