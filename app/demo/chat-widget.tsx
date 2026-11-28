"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import {
  CAP_REACHED,
  UI,
  canSend,
  charCount,
  questionsLeftText,
  replyFor,
  type BotReply,
} from "@/lib/chat-messages";
import {
  STORAGE_KEY,
  addEvent,
  capReached,
  createEventStore,
  eventFromResponse,
  questionsLeft,
  setFeedback,
  type ChatEvent,
} from "@/lib/chat-store";

// The decisions and wording live in lib/ (tested). This file only draws them.

const store = createEventStore(() => window.localStorage);

function subscribe(onChange: () => void) {
  const unsubscribe = store.subscribe(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) store.reload();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    unsubscribe();
    window.removeEventListener("storage", onStorage);
  };
}

// null while the page is drawn on the server: browser storage isn't there yet.
const useEvents = () =>
  useSyncExternalStore(subscribe, store.load, () => null);

// crypto.randomUUID only exists on https and localhost.
const newId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Opens the cited article on the help page before the link scrolls to it. */
function openArticle(id: string) {
  const el = document.getElementById(id);
  if (el instanceof HTMLDetailsElement) el.open = true;
}

function DemoNote({ children }: { children: string }) {
  return (
    <p className="mt-2 text-xs text-zinc-500">
      <span className="font-medium">{UI.demoNote}:</span> {children}
    </p>
  );
}

function Bubble({ from, children }: { from: "customer" | "bot"; children: React.ReactNode }) {
  return from === "customer" ? (
    <div className="ml-8 self-end rounded-2xl rounded-br-sm bg-indigo-600 px-3 py-2 text-sm whitespace-pre-wrap text-white">
      {children}
    </div>
  ) : (
    <div className="mr-4 self-start rounded-2xl rounded-bl-sm border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900">
      {children}
    </div>
  );
}

function BotMessage({
  reply,
  onFeedback,
}: {
  reply: BotReply;
  onFeedback: (feedback: "yes" | "no") => void;
}) {
  return (
    <>
      <Bubble from="bot">
        <p className="whitespace-pre-wrap">{reply.text}</p>
        {reply.evidence && (
          <div className="mt-3">
            <p className="text-xs font-semibold text-zinc-600">{reply.evidence.label}</p>
            <blockquote className="mt-1 border-l-4 border-indigo-300 bg-indigo-50 px-3 py-2 text-zinc-800 italic">
              {reply.evidence.quote}
            </blockquote>
            <ul className="mt-1 text-xs">
              {reply.evidence.sources.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    onClick={() => openArticle(s.id)}
                    className="text-indigo-700 underline underline-offset-2 hover:text-indigo-900"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {reply.feedback && (
          <div
            role="group"
            aria-label={reply.feedback.question}
            className="mt-3 flex flex-wrap items-center gap-2"
          >
            <span className="text-sm font-medium">{reply.feedback.question}</span>
            {reply.feedback.given === null ? (
              <>
                <button
                  type="button"
                  aria-label={UI.yesLabel}
                  onClick={() => onFeedback("yes")}
                  className="rounded-full border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-indigo-600"
                >
                  {UI.yes}
                </button>
                <button
                  type="button"
                  aria-label={UI.noLabel}
                  onClick={() => onFeedback("no")}
                  className="rounded-full border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-indigo-600"
                >
                  {UI.no}
                </button>
              </>
            ) : (
              <span className="text-sm text-zinc-600">
                {reply.feedback.given === "yes" ? UI.yes : UI.no}
              </span>
            )}
          </div>
        )}
        <DemoNote>{reply.note}</DemoNote>
      </Bubble>
      {reply.followUp && (
        <Bubble from="bot">
          <p>{reply.followUp.text}</p>
          <DemoNote>{reply.followUp.note}</DemoNote>
        </Bubble>
      )}
    </>
  );
}

export function ChatWidget({ titles }: { titles: Record<string, string> }) {
  const events = useEvents();
  const [text, setText] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [open, setOpen] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const counterId = useId();
  const bodyId = useId();

  const loaded = events !== null;
  const list: ChatEvent[] = events ?? [];
  const now = loaded ? new Date() : null;
  const left = now ? questionsLeft(list, now) : null;
  const atCap = now ? capReached(list, now) : false;
  const waiting = pending !== null;
  const sendable = loaded && canSend(text, { capReached: atCap, waiting });

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [list.length, pending]);

  async function send() {
    if (!sendable) return;
    const question = text.trim();
    setText("");
    setPending(question);
    let body: unknown = null;
    try {
      const response = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      body = await response.json().catch(() => null);
    } catch {
      body = null; // shown as "busy"
    }
    const event = eventFromResponse(newId(), new Date().toISOString(), question, body);
    store.save(addEvent(store.load(), event));
    setPending(null);
  }

  return (
    <section
      aria-label={UI.header}
      className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 shadow-lg lg:max-h-[calc(100vh-3rem)]"
    >
      <header className="flex items-start justify-between gap-3 bg-indigo-700 px-4 py-3 text-white">
        <div>
          <h2 className="font-semibold">{UI.header}</h2>
          <p className="text-xs text-indigo-100">{UI.notice}</p>
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 rounded px-2 py-1 text-xs text-indigo-100 underline underline-offset-2 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
        >
          {open ? "Minimise" : "Open chat"}
        </button>
      </header>

      <div id={bodyId} hidden={!open} className="flex min-h-0 flex-1 flex-col">
        <div
          ref={logRef}
          role="log"
          aria-label="Conversation"
          aria-live="polite"
          className="flex min-h-48 flex-1 flex-col gap-3 overflow-y-auto p-4 max-lg:max-h-[60vh]"
        >
          {!loaded && <p className="text-sm text-zinc-500">{UI.loading}</p>}
          {loaded && list.length === 0 && !waiting && (
            <p className="text-sm text-zinc-500">
              Ask anything about Tallyfox, for example &quot;Can I pay with PayPal?&quot;
            </p>
          )}
          {list.map((event) => (
            <div key={event.id} className="flex flex-col gap-3">
              <Bubble from="customer">{event.question}</Bubble>
              <BotMessage
                reply={replyFor(event, titles)}
                onFeedback={(fb) => store.save(setFeedback(store.load(), event.id, fb))}
              />
            </div>
          ))}
          {pending !== null && (
            <div className="flex flex-col gap-3">
              <Bubble from="customer">{pending}</Bubble>
              <p role="status" className="self-start text-sm text-zinc-500 italic">
                {UI.waiting}
              </p>
            </div>
          )}
        </div>

        <form
          className="border-t border-zinc-200 bg-white p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          {atCap && (
            <div role="status" className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p>{CAP_REACHED.text}</p>
              <DemoNote>{CAP_REACHED.note}</DemoNote>
            </div>
          )}
          <label htmlFor={inputId} className="sr-only">
            {UI.inputLabel}
          </label>
          <textarea
            id={inputId}
            value={text}
            rows={3}
            disabled={!loaded || atCap}
            placeholder={UI.placeholder}
            aria-describedby={counterId}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send();
              }
            }}
            className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-2 focus:outline-indigo-200 disabled:bg-zinc-100"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <p id={counterId} className="text-xs text-zinc-500">
              <span className={text.length > 500 ? "font-semibold text-red-700" : ""}>
                {charCount(text)}
              </span>
              {left !== null && <> · {questionsLeftText(left)}</>}
            </p>
            <button
              type="submit"
              disabled={!sendable}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {UI.send}
            </button>
          </div>
          <div className="mt-2 text-xs text-zinc-500">
            {confirmingClear ? (
              <span role="group" aria-label={UI.clear} className="flex items-center gap-2">
                <span>{UI.confirmClear}</span>
                <button
                  type="button"
                  aria-label="Yes, clear demo data"
                  onClick={() => {
                    store.clearAll();
                    setConfirmingClear(false);
                  }}
                  className="underline underline-offset-2 hover:text-zinc-800"
                >
                  {UI.yes}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingClear(false)}
                  className="underline underline-offset-2 hover:text-zinc-800"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingClear(true)}
                className="underline underline-offset-2 hover:text-zinc-800"
              >
                {UI.clear}
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
