import { describe, expect, it } from "vitest";
import { AiInvalidOutputError, groqError } from "../lib/ai-errors";

const errorBody = (code: string) => ({
  error: {
    code,
    message: "Failed to generate JSON.",
    failed_generation: "SECRET-CUSTOMER-TEXT",
  },
});

describe("sorting error replies from Groq", () => {
  it("400 json_validate_failed means the AI output was invalid", () => {
    const error = groqError(400, errorBody("json_validate_failed"));
    expect(error).toBeInstanceOf(AiInvalidOutputError);
  });

  it.each([
    { name: "400 with another code", status: 400, code: "invalid_request" },
    { name: "429 rate limit", status: 429, code: "rate_limit_exceeded" },
    { name: "500 server error", status: 500, code: "internal_error" },
    { name: "500 with the JSON code", status: 500, code: "json_validate_failed" },
  ])("$name is an ordinary failure", ({ status, code }) => {
    const error = groqError(status, errorBody(code));
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(AiInvalidOutputError);
  });

  it.each([null, undefined, "not json", {}, { error: null }])(
    "a 400 with an unreadable body (%j) is an ordinary failure",
    (body) => {
      const error = groqError(400, body);
      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeInstanceOf(AiInvalidOutputError);
    },
  );

  it("never carries the reply's text in the error", () => {
    for (const code of ["json_validate_failed", "invalid_request"]) {
      const error = groqError(400, errorBody(code));
      expect(`${error.message} ${JSON.stringify(error)}`).not.toContain(
        "SECRET-CUSTOMER-TEXT",
      );
    }
  });
});
