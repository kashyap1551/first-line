// The exact request body sent to Groq. Pinned: tests/request.test.ts checks the
// SHA-256 of this body for one fixed example against REQUEST_FINGERPRINT. Any
// change to the model, settings, block layout or AI instructions fails that test
// until the fingerprint is updated on purpose and logged in docs/DECISIONS.md.

/** Same model as Career Co-pilot. */
export const GROQ_MODEL = "openai/gpt-oss-120b";
/** Fixed so eval runs can be repeated. Groq treats it as best effort. */
export const GROQ_SEED = 20261127;

export const REQUEST_FINGERPRINT =
  "b6cbcebee5df9b5846fc85e02423ecdc0c46b42ae5e23b47f68e4a6f8fd0c2e0";

export function buildGroqRequest(system: string, user: string) {
  return {
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
    max_completion_tokens: 500,
    seed: GROQ_SEED,
    // Keeps hidden reasoning short so it can't use up the 500 tokens.
    reasoning_effort: "low",
    include_reasoning: false,
  };
}
