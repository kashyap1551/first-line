import { newestFirst, type ChatEvent, type Reason } from "./chat-store";

// The support team's inbox: what FirstLine handed to a person.

export const INBOX = {
  title: "Support team inbox",
  subtitle:
    "Tallyfox (fictional) · questions FirstLine handed to a person, from this browser's demo data",
  empty:
    "No handovers yet. Ask something in the demo that needs a person, e.g. 'I was charged twice'.",
} as const;

// Why it came to the team, in plain words for the support person.
const TEAM_REASONS: Record<Reason, string> = {
  billing_dispute: "Hard rule: billing dispute (no AI used)",
  security: "Hard rule: possible security problem (no AI used)",
  asked_for_human: "Hard rule: customer asked for a person (no AI used)",
  account_recovery: "Hard rule: lost two-factor access (no AI used)",
  privacy_request: "Hard rule: privacy or personal-data request (no AI used)",
  legal_complaint: "Hard rule: legal complaint (no AI used)",
  ai_invalid_output: "AI reply was not in the expected format",
  language_not_supported: "Question not in English",
  ai_unsure: "AI couldn't answer from the help articles",
  no_valid_source: "AI didn't cite a help article it was given",
  quote_not_found: "AI's quote didn't match a sentence in the article",
  customer_said_no: "Customer clicked No on this answer",
};

export const teamReason = (reason: Reason) => TEAM_REASONS[reason];

/** Handovers only, newest first, split into open and done. */
export function inbox(events: ChatEvent[]): { open: ChatEvent[]; done: ChatEvent[] } {
  const handovers = newestFirst(events.filter((e) => e.outcome === "handover"));
  return {
    open: handovers.filter((e) => e.done !== true),
    done: handovers.filter((e) => e.done === true),
  };
}
