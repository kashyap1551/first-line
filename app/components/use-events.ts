"use client";

import { useSyncExternalStore } from "react";
import { STORAGE_KEY, createEventStore } from "@/lib/chat-store";

// One record of demo questions, shared by /demo, /team and /team/billing.

export const store = createEventStore(() => window.localStorage);

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

/** The record, or null while the page is drawn on the server (no browser storage there). */
export const useEvents = () => useSyncExternalStore(subscribe, store.load, () => null);

/** A date and time in the visitor's own format. Only call it in the browser. */
export const formatTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
