import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { Article } from "../lib/content";
import {
  buildGroqRequest,
  GROQ_MODEL,
  GROQ_SEED,
  REQUEST_FINGERPRINT,
} from "../lib/groq-request";
import { buildUserMessage, PROMPT } from "../lib/prompt";

// One fixed example. It never changes; only the code that builds the request
// can change the fingerprint.
const EXAMPLE_QUESTION = "How do I pause a recurring invoice?";
const EXAMPLE_ARTICLES: Article[] = [
  {
    id: "T01",
    title: "Fixed test article one",
    category: "Test",
    body: "This is the first fixed sentence. This is the second fixed sentence.",
  },
  {
    id: "T02",
    title: "Fixed test article two",
    category: "Test",
    body: "This article is only here to pin the block layout.",
  },
];

const exampleBody = () =>
  buildGroqRequest(PROMPT, buildUserMessage(EXAMPLE_QUESTION, EXAMPLE_ARTICLES));

describe("the request sent to Groq", () => {
  it("matches its pinned SHA-256 request fingerprint", () => {
    const json = JSON.stringify(exampleBody());
    const actual = createHash("sha256").update(json, "utf8").digest("hex");
    expect(actual).toBe(REQUEST_FINGERPRINT);
  });

  it("has every setting written out, worked out by hand", () => {
    expect(exampleBody()).toEqual({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: PROMPT },
        {
          role: "user",
          content: buildUserMessage(EXAMPLE_QUESTION, EXAMPLE_ARTICLES),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_completion_tokens: 500,
      seed: GROQ_SEED,
      reasoning_effort: "low",
      include_reasoning: false,
    });
  });

  it("uses the Career Co-pilot model and a fixed whole-number seed", () => {
    expect(GROQ_MODEL).toBe("openai/gpt-oss-120b");
    expect(Number.isInteger(GROQ_SEED)).toBe(true);
  });
});
