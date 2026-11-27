/** The AI provider refused its own reply because it was not valid JSON. */
export class AiInvalidOutputError extends Error {
  constructor() {
    super("The AI reply was not valid JSON");
    this.name = "AiInvalidOutputError";
  }
}

/**
 * Turns an error reply from Groq into an Error. Only a 400 with the code
 * "json_validate_failed" counts as invalid AI output; everything else is an
 * ordinary failure. The reply's text is never copied into the error, because
 * it can contain the customer's question.
 */
export function groqError(status: number, body: unknown): Error {
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
  const safeCode =
    typeof code === "string" && /^[a-z0-9_]{1,64}$/.test(code) ? ` (${code})` : "";
  return new Error(`Groq request failed with status ${status}${safeCode}`);
}
