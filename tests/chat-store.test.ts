import { describe, expect, it, vi } from "vitest";
import {
  DAILY_CAP,
  STORAGE_KEY,
  addEvent,
  capReached,
  createEventStore,
  eventFromResponse,
  markDone,
  questionsLeft,
  questionsToday,
  setFeedback,
  type ChatEvent,
  type StorageLike,
} from "../lib/chat-store";

// All times are built from local dates (new Date(year, monthIndex, day, …)),
// so "today" means the same thing on any machine's time zone.
// Month index 10 = November.
const NOW = new Date(2026, 10, 28, 15, 0);
const at = (day: number, hour: number, minute = 0) =>
  new Date(2026, 10, day, hour, minute).toISOString();

const answered = (id = "e1", day = 28): ChatEvent => ({
  id,
  at: at(day, 10),
  question: "I want to stop my subscription",
  outcome: "answered",
  answer: "Go to Settings → Billing → Cancel plan.",
  cited_ids: ["A06"],
  quote: "Go to Settings → Billing → Cancel plan.",
  feedback: null,
});

const declined = (id: string, day: number, hour: number): ChatEvent => ({
  id,
  at: at(day, hour),
  question: "What's the capital of Australia?",
  outcome: "declined",
  feedback: null,
});

/** A fake localStorage. Each method can be told to throw. */
function fakeStorage(fail: { get?: boolean; set?: boolean; remove?: boolean } = {}) {
  const data = new Map<string, string>();
  const storage: StorageLike = {
    getItem: (key) => {
      if (fail.get) throw new Error("storage blocked");
      return data.get(key) ?? null;
    },
    setItem: (key, value) => {
      if (fail.set) throw new Error("quota exceeded");
      data.set(key, value);
    },
    removeItem: (key) => {
      if (fail.remove) throw new Error("storage blocked");
      data.delete(key);
    },
  };
  return { storage, data };
}

describe("the storage key and cap", () => {
  it("uses the key firstline:v1:events and a cap of 20", () => {
    expect(STORAGE_KEY).toBe("firstline:v1:events");
    expect(DAILY_CAP).toBe(20);
  });
});

describe("addEvent", () => {
  it("adds the event at the end and leaves the old list unchanged", () => {
    const before: ChatEvent[] = [declined("e0", 28, 9)];
    const after = addEvent(before, answered());
    expect(after.map((e) => e.id)).toEqual(["e0", "e1"]);
    expect(before.map((e) => e.id)).toEqual(["e0"]);
  });
});

describe("eventFromResponse: turns the /api/answer reply into a record", () => {
  const make = (body: unknown) =>
    eventFromResponse("x1", at(28, 12), "the question", body);

  it("answered keeps answer, cited ids and quote, with no feedback yet", () => {
    expect(
      make({
        outcome: "answered",
        answer: "No, PayPal is not accepted.",
        cited_ids: ["A04"],
        quote: "PayPal is not accepted.",
      }),
    ).toEqual({
      id: "x1",
      at: at(28, 12),
      question: "the question",
      outcome: "answered",
      answer: "No, PayPal is not accepted.",
      cited_ids: ["A04"],
      quote: "PayPal is not accepted.",
      feedback: null,
    });
  });

  it("handover keeps reason and summary", () => {
    expect(
      make({ outcome: "handover", reason: "billing_dispute", summary: "s" }),
    ).toEqual({
      id: "x1",
      at: at(28, 12),
      question: "the question",
      outcome: "handover",
      reason: "billing_dispute",
      summary: "s",
      feedback: null,
    });
  });

  it("declined, paused, unavailable and rejected keep just the outcome", () => {
    expect(make({ outcome: "declined" }).outcome).toBe("declined");
    expect(make({ outcome: "paused", message: "Demo paused" }).outcome).toBe("paused");
    expect(make({ outcome: "unavailable", message: "m" }).outcome).toBe("unavailable");
    expect(make({ outcome: "rejected", message: "m" }).outcome).toBe("rejected");
  });

  it("anything it doesn't recognise becomes unavailable", () => {
    for (const body of [
      null,
      "text",
      {},
      { outcome: "something" },
      { outcome: "handover", reason: "made_up", summary: "s" },
      { outcome: "answered", answer: "a" },
    ]) {
      expect(make(body)).toEqual({
        id: "x1",
        at: at(28, 12),
        question: "the question",
        outcome: "unavailable",
        feedback: null,
      });
    }
  });
});

describe("setFeedback", () => {
  it("Yes keeps the answer as answered and records yes", () => {
    const [e] = setFeedback([answered()], "e1", "yes");
    expect(e.outcome).toBe("answered");
    expect(e.feedback).toBe("yes");
    expect(e.reason).toBeUndefined();
  });

  it("No turns it into a handover customer_said_no and keeps the original answer", () => {
    const [e] = setFeedback([answered()], "e1", "no");
    expect(e).toEqual({
      ...answered(),
      outcome: "handover",
      reason: "customer_said_no",
      summary: "I want to stop my subscription",
      feedback: "no",
    });
  });

  it("works only once: a second click changes nothing", () => {
    const afterYes = setFeedback([answered()], "e1", "yes");
    expect(setFeedback(afterYes, "e1", "no")).toBe(afterYes);
    expect(afterYes[0].feedback).toBe("yes");

    const afterNo = setFeedback([answered()], "e1", "no");
    expect(setFeedback(afterNo, "e1", "yes")).toBe(afterNo);
    expect(setFeedback(afterNo, "e1", "no")).toBe(afterNo);
  });

  it("is not allowed on anything that wasn't answered", () => {
    const list: ChatEvent[] = [
      declined("d1", 28, 9),
      { ...declined("h1", 28, 9), outcome: "handover", reason: "ai_unsure" },
    ];
    expect(setFeedback(list, "d1", "yes")).toBe(list);
    expect(setFeedback(list, "h1", "no")).toBe(list);
  });

  it("changes nothing for an unknown id", () => {
    const list = [answered()];
    expect(setFeedback(list, "nope", "yes")).toBe(list);
  });

  it("leaves the other events untouched", () => {
    const list = [declined("d1", 28, 9), answered("e1")];
    const after = setFeedback(list, "e1", "yes");
    expect(after[0]).toBe(list[0]);
  });
});

describe("markDone (the team handled a handover)", () => {
  const handover: ChatEvent = {
    id: "h1",
    at: at(28, 10),
    question: "I was charged twice this month, please refund me",
    outcome: "handover",
    reason: "billing_dispute",
    summary: "I was charged twice this month, please refund me",
    feedback: null,
  };

  it("marks a handover as done", () => {
    const [e] = markDone([handover], "h1");
    expect(e).toEqual({ ...handover, done: true });
  });

  it("also works on an answer the customer said No to", () => {
    const [no] = setFeedback([answered()], "e1", "no");
    expect(markDone([no], "e1")[0].done).toBe(true);
  });

  it("works only once: a second call changes nothing", () => {
    const once = markDone([handover], "h1");
    expect(markDone(once, "h1")).toBe(once);
  });

  it("is not allowed on anything that isn't a handover", () => {
    const list = [answered(), declined("d1", 28, 9)];
    expect(markDone(list, "e1")).toBe(list);
    expect(markDone(list, "d1")).toBe(list);
  });

  it("changes nothing for an unknown id and leaves other events untouched", () => {
    const list = [declined("d1", 28, 9), handover];
    expect(markDone(list, "nope")).toBe(list);
    expect(markDone(list, "h1")[0]).toBe(list[0]);
  });
});

describe("questionsToday and the daily cap (local date)", () => {
  // Hand count for NOW = 28 Nov 15:00: 28 Nov 00:00, 12:00 and 23:59 are today (3).
  // 27 Nov 23:59 and 29 Nov 00:00 are not.
  const events: ChatEvent[] = [
    { ...declined("a", 27, 0), at: at(27, 23, 59) },
    declined("b", 28, 0),
    declined("c", 28, 12),
    { ...declined("d", 28, 0), at: at(28, 23, 59) },
    declined("e", 29, 0),
  ];

  it("counts only questions from today's local date", () => {
    expect(questionsToday(events, NOW)).toBe(3);
  });

  it("counts every outcome, including rejected, paused and unavailable", () => {
    const outcomes: ChatEvent["outcome"][] = [
      "answered", "handover", "declined", "unavailable", "paused", "rejected",
    ];
    const list = outcomes.map((outcome, i) => ({
      ...declined(`o${i}`, 28, 9),
      outcome,
    }));
    expect(questionsToday(list, NOW)).toBe(6);
  });

  const today = (n: number) =>
    Array.from({ length: n }, (_, i) => declined(`t${i}`, 28, 9));

  it("19 today: 1 left, not reached", () => {
    expect(questionsLeft(today(19), NOW)).toBe(1);
    expect(capReached(today(19), NOW)).toBe(false);
  });

  it("20 today: 0 left, reached", () => {
    expect(questionsLeft(today(20), NOW)).toBe(0);
    expect(capReached(today(20), NOW)).toBe(true);
  });

  it("25 today: still 0 left, never negative", () => {
    expect(questionsLeft(today(25), NOW)).toBe(0);
  });

  it("20 yesterday and none today: 20 left", () => {
    const yesterday = Array.from({ length: 20 }, (_, i) =>
      declined(`y${i}`, 27, 9),
    );
    expect(questionsLeft(yesterday, NOW)).toBe(20);
    expect(capReached(yesterday, NOW)).toBe(false);
  });

  it("an empty record: 20 left", () => {
    expect(questionsLeft([], NOW)).toBe(20);
  });
});

describe("createEventStore: browser storage, with memory as the fallback", () => {
  it("saves under firstline:v1:events and a fresh store reads it back", () => {
    const { storage, data } = fakeStorage();
    createEventStore(() => storage).save([answered()]);
    expect(JSON.parse(data.get(STORAGE_KEY)!)).toEqual([answered()]);
    expect(createEventStore(() => storage).load()).toEqual([answered()]);
  });

  it("starts empty when nothing is stored", () => {
    const { storage } = fakeStorage();
    expect(createEventStore(() => storage).load()).toEqual([]);
  });

  it("returns the same list each time until something changes", () => {
    const { storage } = fakeStorage();
    const store = createEventStore(() => storage);
    expect(store.load()).toBe(store.load());
  });

  it("reading fails: starts empty, and saving still works in memory", () => {
    const { storage } = fakeStorage({ get: true });
    const store = createEventStore(() => storage);
    expect(store.load()).toEqual([]);
    store.save([answered()]);
    expect(store.load()).toEqual([answered()]);
  });

  it("writing fails: keeps the events in memory, no crash", () => {
    const { storage, data } = fakeStorage({ set: true });
    const store = createEventStore(() => storage);
    expect(() => store.save([answered()])).not.toThrow();
    expect(store.load()).toEqual([answered()]);
    expect(data.has(STORAGE_KEY)).toBe(false);
  });

  it("no storage at all (getting it throws): memory only, no crash", () => {
    const store = createEventStore(() => {
      throw new Error("SecurityError");
    });
    expect(store.load()).toEqual([]);
    expect(() => store.save([answered()])).not.toThrow();
    expect(store.load()).toEqual([answered()]);
    expect(() => store.clearAll()).not.toThrow();
    expect(store.load()).toEqual([]);
  });

  it("broken or foreign stored data is ignored", () => {
    for (const raw of ["{not json", '"text"', '{"a":1}', "null"]) {
      const { storage, data } = fakeStorage();
      data.set(STORAGE_KEY, raw);
      expect(createEventStore(() => storage).load()).toEqual([]);
    }
  });

  it("old events without `done` still load, and done: true is kept", () => {
    const { storage, data } = fakeStorage();
    const old = answered("old"); // stored before `done` existed: no such field
    const handled: ChatEvent = {
      ...answered("h"),
      outcome: "handover",
      reason: "ai_unsure",
      done: true,
    };
    data.set(STORAGE_KEY, JSON.stringify([old, handled]));
    const loaded = createEventStore(() => storage).load();
    expect(loaded).toEqual([old, handled]);
    expect("done" in loaded[0]).toBe(false);
  });

  it("keeps the valid events and drops invalid ones", () => {
    const { storage, data } = fakeStorage();
    data.set(
      STORAGE_KEY,
      JSON.stringify([answered("ok"), { id: "bad" }, 42, answered("ok2")]),
    );
    expect(
      createEventStore(() => storage).load().map((e) => e.id),
    ).toEqual(["ok", "ok2"]);
  });

  it("clearAll empties storage and memory", () => {
    const { storage, data } = fakeStorage();
    const store = createEventStore(() => storage);
    store.save([answered()]);
    store.clearAll();
    expect(data.has(STORAGE_KEY)).toBe(false);
    expect(store.load()).toEqual([]);
    expect(createEventStore(() => storage).load()).toEqual([]);
  });

  it("clearAll still empties memory when removing from storage fails", () => {
    const { storage } = fakeStorage({ remove: true });
    const store = createEventStore(() => storage);
    store.save([answered()]);
    expect(() => store.clearAll()).not.toThrow();
    expect(store.load()).toEqual([]);
  });

  it("reload picks up what another tab saved, and tells listeners", () => {
    const { storage } = fakeStorage();
    const tabA = createEventStore(() => storage);
    const tabB = createEventStore(() => storage);
    expect(tabA.load()).toEqual([]);
    tabB.save([answered()]);
    expect(tabA.load()).toEqual([]); // still the old memory
    const listener = vi.fn();
    tabA.subscribe(listener);
    tabA.reload();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(tabA.load()).toEqual([answered()]);
  });

  it("tells listeners after save and clearAll, and stops after unsubscribe", () => {
    const { storage } = fakeStorage();
    const store = createEventStore(() => storage);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.save([answered()]);
    store.clearAll();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    store.save([answered()]);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
