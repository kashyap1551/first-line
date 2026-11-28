/** An error reply from the AI provider. Carries only the HTTP status. */
export class AiHttpError extends Error {
  constructor(readonly status: number) {
    super(`AI request failed with status ${status}`);
    this.name = "AiHttpError";
  }
}

/** The AI provider refused its own reply because it was not valid JSON. */
export class AiInvalidOutputError extends AiHttpError {
  constructor() {
    super(400);
    this.message = "The AI reply was not valid JSON";
    this.name = "AiInvalidOutputError";
  }
}

/**
 * Turns an error reply from Groq into an Error. Only a 400 with the code
 * "json_validate_failed" counts as invalid AI output; everything else is an
 * ordinary failure. The reply's text is never copied into the error, because
 * it can contain the customer's question.
 */
export function groqError(status: number, body: unknown): AiHttpError {
  const code =
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "object" &&
    body.error !== null &&
    "code" in body.error
      ? body.error.code
      : undefined;

  if (status === 400 && code === "json_validate_failed") {
    return new AiInvalidOutputError();
  }
  return new AiHttpError(status);
}

export type AiFailure =
  | { type: "timeout" }
  | { type: "invalid_output"; status: 400 }
  | { type: "rate_limit"; status: 429 }
  | { type: "http_error"; status: number }
  | { type: "error" };

/** The only facts about a failed AI call that may be logged. */
export function failureFacts(error: unknown): AiFailure {
  if (error instanceof AiInvalidOutputError) {
    return { type: "invalid_output", status: 400 };
  }
  if (error instanceof Error && error.name === "TimeoutError") {
    return { type: "timeout" };
  }
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? error.status
      : undefined;
  if (typeof status === "number" && Number.isInteger(status)) {
    if (status === 429) return { type: "rate_limit", status };
    if (status >= 100 && status <= 599) return { type: "http_error", status };
  }
  return { type: "error" };
}
