import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiInvalidOutputError } from "../lib/ai-errors";
import { answerQuestion, type CallAi } from "../lib/answer";
import { parseArticles } from "../lib/content";
import { PROMPT } from "../lib/prompt";

// Every AI here is a fake. Nothing in this file touches the network.

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const articles = parseArticles(read("../content/help-center.md"));
const cases: { id: string; question: string }[] = JSON.parse(
  read("../evals/cases.json"),
).cases;
const question = (id: string) => cases.find((c) => c.id === id)!.question;

// Hand count for C06 "I want to stop my subscription" ("stop" counts as
// "cancel"): A06 = 5, A04 = 2, A05 = 2, so those 3 are given to the AI.
// A22 is a real article that is not among them.
const C06 = question("C06");

// Copied by hand from article A06.
const QUOTE =
  "You keep your paid features until the end of the current billing period, and then your account moves to the Free plan.";

const reply = (changes: Record<string, unknown> = {}) =>
  JSON.stringify({
    status: "answered",
    language: "en",
    answer: "Go to Settings → Billing → Cancel plan.",
    cited_ids: ["A06"],
    quote: QUOTE,
    handover_summary: "",
    ...changes,
  });

const fakeAi = (text: string = reply()) => vi.fn<CallAi>(async () => text);

const ask = (
  input: unknown,
  callAi: CallAi,
  aiEnabled: string | undefined = "true",
) => answerQuestion(input, { callAi, articles, aiEnabled });

const handover = (reason: string, summary: string) => ({
  outcome: "handover",
  reason,
  summary,
});

const answered = (quote: string = QUOTE) => ({
  outcome: "answered",
  answer: "Go to Settings → Billing → Cancel plan.",
  cited_ids: ["A06"],
  quote,
});

afterEach(() => {
  vi.useRealTimers();
});

describe("before any AI call", () => {
  it("C29 goes to a human as billing_dispute, 0 AI calls", async () => {
    const ai = fakeAi();
    expect(await ask(question("C29"), ai)).toEqual(
      handover("billing_dispute", question("C29")),
    );
    expect(ai).toHaveBeenCalledTimes(0);
  });

  it.each([
    { name: "an empty question", input: "" },
    { name: "only spaces", input: "   \n  " },
    { name: "501 characters", input: "a".repeat(501) },
    { name: "not text", input: 42 },
    { name: "nothing at all", input: undefined },
  ])("$name is rejected, 0 AI calls", async ({ input }) => {
    const ai = fakeAi();
    expect(await ask(input, ai)).toEqual({
      outcome: "rejected",
      message: "Questions must be 1 to 500 characters.",
    });
    expect(ai).toHaveBeenCalledTimes(0);
  });

  it.each([
    { name: "500 characters", input: "a".repeat(500) },
    { name: "500 characters plus outer spaces", input: `  ${"a".repeat(500)} ` },
  ])("$name is accepted, 1 AI call", async ({ input }) => {
    const ai = fakeAi(reply({ status: "off_topic" }));
    expect(await ask(input, ai)).toEqual({ outcome: "declined" });
    expect(ai).toHaveBeenCalledTimes(1);
  });

  it.each(["false", "TRUE", "1", ""])(
    "AI_ENABLED '%s' means paused, 0 AI calls",
    async (value) => {
      const ai = fakeAi();
      expect(await ask(C06, ai, value)).toEqual({
        outcome: "paused",
        message: "Demo paused",
      });
      expect(ai).toHaveBeenCalledTimes(0);
    },
  );

  it("a missing AI_ENABLED means paused, 0 AI calls", async () => {
    const ai = fakeAi();
    const result = await answerQuestion(C06, {
      callAi: ai,
      articles,
      aiEnabled: undefined,
    });
    expect(result.outcome).toBe("paused");
    expect(ai).toHaveBeenCalledTimes(0);
  });

  it("checks length before the kill switch", async () => {
    const ai = fakeAi();
    expect((await ask("", ai, "false")).outcome).toBe("rejected");
    expect(ai).toHaveBeenCalledTimes(0);
  });

  it("checks the kill switch before the hard rules", async () => {
    const ai = fakeAi();
    expect((await ask(question("C29"), ai, "false")).outcome).toBe("paused");
    expect(ai).toHaveBeenCalledTimes(0);
  });
});

describe("what is sent to the AI", () => {
  it("has the question in the question block and the 3 article ids", async () => {
    const ai = fakeAi();
    await ask(`  ${C06}  `, ai);
    expect(ai).toHaveBeenCalledTimes(1);
    const sent = ai.mock.calls[0][0];
    expect(sent.system).toBe(PROMPT);
    expect(sent.user).toContain(`<question>\n${C06}\n</question>`);
    const ids = [...sent.user.matchAll(/<article id="(A\d+)">/g)].map(
      (m) => m[1],
    );
    expect(ids).toEqual(["A06", "A04", "A05"]);
  });

  it("still makes 1 AI call when search finds no article", async () => {
    const ai = fakeAi(reply({ status: "off_topic" }));
    expect(await ask(question("C39"), ai)).toEqual({ outcome: "declined" });
    expect(ai).toHaveBeenCalledTimes(1);
    expect(ai.mock.calls[0][0].user).not.toContain("<article");
  });
});

describe("a good answer", () => {
  it("C06 with a cited A06 and an exact quote is answered, 1 AI call", async () => {
    const ai = fakeAi();
    expect(await ask(C06, ai)).toEqual(answered());
    expect(ai).toHaveBeenCalledTimes(1);
  });

  it("accepts the language code in capitals", async () => {
    const ai = fakeAi(reply({ language: "EN" }));
    expect(await ask(C06, ai)).toEqual(answered());
    expect(ai).toHaveBeenCalledTimes(1);
  });
});

describe("source check", () => {
  it.each([
    { name: "a cited id not in the top 3", cited_ids: ["A22"] },
    { name: "one good and one unprovided id", cited_ids: ["A06", "A22"] },
    { name: "empty cited_ids", cited_ids: [] },
  ])("$name → no_valid_source", async ({ cited_ids }) => {
    const ai = fakeAi(reply({ cited_ids }));
    expect(await ask(C06, ai)).toEqual(handover("no_valid_source", C06));
    expect(ai).toHaveBeenCalledTimes(1);
  });
});

describe("quote check", () => {
  it.each([
    {
      name: "quote not in the article",
      quote: "You can cancel by phoning our sales office.",
    },
    {
      name: "quote with one changed word",
      quote: QUOTE.replace("Free plan", "Solo plan"),
    },
    {
      name: "quote from an article that was given but not cited",
      quote: "PayPal is not accepted.",
    },
    { name: "quote in different letter case", quote: QUOTE.toUpperCase() },
    { name: "empty quote", quote: "" },
    { name: "quote of only spaces", quote: "  \n " },
  ])("$name → quote_not_found", async ({ quote }) => {
    const ai = fakeAi(reply({ quote }));
    expect(await ask(C06, ai)).toEqual(handover("quote_not_found", C06));
    expect(ai).toHaveBeenCalledTimes(1);
  });

  it("quote matching except extra spaces and line breaks is answered", async () => {
    const spaced = `  You keep   your paid features until the end of the\ncurrent billing period,\r\n and then your account moves to the Free plan. `;
    const ai = fakeAi(reply({ quote: spaced }));
    expect(await ask(C06, ai)).toEqual(answered(spaced));
    expect(ai).toHaveBeenCalledTimes(1);
  });
});

describe("the AI's own verdict", () => {
  it("needs_human → ai_unsure with the AI's summary", async () => {
    const summary = "Customer wants help cancelling.";
    const ai = fakeAi(
      reply({ status: "needs_human", handover_summary: summary }),
    );
    expect(await ask(C06, ai)).toEqual(handover("ai_unsure", summary));
    expect(ai).toHaveBeenCalledTimes(1);
  });

  it("needs_human with an empty summary uses the question", async () => {
    const ai = fakeAi(reply({ status: "needs_human", handover_summary: " " }));
    expect(await ask(C06, ai)).toEqual(handover("ai_unsure", C06));
    expect(ai).toHaveBeenCalledTimes(1);
  });

  it("off_topic → declined", async () => {
    const ai = fakeAi(reply({ status: "off_topic" }));
    expect(await ask(C06, ai)).toEqual({ outcome: "declined" });
    expect(ai).toHaveBeenCalledTimes(1);
  });

  it.each(["answered", "needs_human", "off_topic"])(
    "language 'de' with status %s → language_not_supported",
    async (status) => {
      const ai = fakeAi(reply({ status, language: "de" }));
      expect(await ask(C06, ai)).toEqual(
        handover("language_not_supported", C06),
      );
      expect(ai).toHaveBeenCalledTimes(1);
    },
  );
});

describe("unusable AI output → ai_invalid_output", () => {
  it.each([
    { name: "invalid JSON", text: "Sure! Here is your answer." },
    { name: "empty text", text: "" },
    { name: "JSON that is not an object", text: "[]" },
    { name: "an unknown status", text: reply({ status: "maybe" }) },
    { name: "a missing field", text: reply({ quote: undefined }) },
    { name: "cited_ids not a list", text: reply({ cited_ids: "A06" }) },
    { name: "a language that is not 2 letters", text: reply({ language: "English" }) },
    { name: "answered with an empty answer", text: reply({ answer: "  " }) },
  ])("$name", async ({ text }) => {
    const ai = fakeAi(text);
    expect(await ask(C06, ai)).toEqual(handover("ai_invalid_output", C06));
    expect(ai).toHaveBeenCalledTimes(1);
  });

  it("the provider rejecting invalid JSON, exactly 1 AI call", async () => {
    const ai = vi.fn<CallAi>(async () => {
      throw new AiInvalidOutputError();
    });
    expect(await ask(C06, ai)).toEqual(handover("ai_invalid_output", C06));
    expect(ai).toHaveBeenCalledTimes(1);
  });
});

describe("AI failures → unavailable", () => {
  const busy = { outcome: "unavailable", message: "Demo busy, try later" };

  it("a simulated 429 gives unavailable, exactly 1 AI call", async () => {
    const ai = vi.fn<CallAi>(async () => {
      throw Object.assign(new Error("Rate limit reached"), { status: 429 });
    });
    expect(await ask(C06, ai)).toEqual(busy);
    expect(ai).toHaveBeenCalledTimes(1);
  });

  it("no reply within 15 seconds gives unavailable, exactly 1 AI call", async () => {
    vi.useFakeTimers();
    const ai = vi.fn<CallAi>(() => new Promise<string>(() => {}));
    let result: unknown;
    const pending = ask(C06, ai).then((r) => {
      result = r;
    });

    await vi.advanceTimersByTimeAsync(14_999);
    expect(result).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    await pending;

    expect(result).toEqual(busy);
    expect(ai.mock.calls[0][0].signal.aborted).toBe(true);
    expect(ai).toHaveBeenCalledTimes(1);
  });
});
