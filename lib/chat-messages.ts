import {
  DAILY_CAP,
  type ChatEvent,
  type Feedback,
  type Outcome,
  type Reason,
} from "./chat-store";

export type { Outcome, Reason } from "./chat-store";

// Everything the customer reads in the widget. Customer wording approved by
// Chinmay on 2026-11-28 (docs/DECISIONS.md); change it only with his approval.

const MAX_LENGTH = 500;
const TEAM =
  "I've passed your question to the Tallyfox team. They reply Monday to Friday, 9:00–17:00 CET, within 1 business day.";

const WORDING = {
  fromHelpCentre: "From the help centre:",
  askFeedback: "Did this solve it?",
  afterYes: "Great, glad that helped.",
  afterNo: `Sorry about that. ${TEAM}`,
  handover: TEAM,
  languageNotSupported:
    "I can only answer in English for now. I've passed your question to the Tallyfox team.",
  declined: "I can only help with questions about Tallyfox.",
  unavailable: "The demo is busy right now. Please try again in a minute.",
  paused: "The demo is paused right now.",
  rejected: "Please type a question of up to 500 characters.",
  capReached: `You've reached today's limit of ${DAILY_CAP} demo questions. Come back tomorrow.`,
} as const;

export const UI = {
  header: "Tallyfox support · AI assistant",
  notice: "Demo with a fictional company. Don't type personal information.",
  waiting: "Checking the help centre…",
  clear: "Clear demo data",
  confirmClear: "Are you sure?",
  inputLabel: "Your question",
  placeholder: "Ask a question about Tallyfox",
  send: "Send",
  yes: "Yes",
  no: "No",
  yesLabel: "Yes, this solved it",
  noLabel: "No, this didn't solve it",
  demoNote: "Demo note",
  loading: "Loading…",
} as const;

// "Demo notes": a small grey line under every bot reply that says, in plain
// words, what the system decided behind the scenes.
const REASON_NOTES: Record<Reason, string> = {
  billing_dispute:
    "Hard rule: billing disputes and refunds always go to a person (no AI used).",
  security: "Hard rule: possible security problems always go to a person (no AI used).",
  asked_for_human: "Hard rule: you asked for a person, so you get one (no AI used).",
  account_recovery:
    "Hard rule: lost two-factor access always goes to a person (no AI used).",
  privacy_request:
    "Hard rule: privacy and personal-data requests always go to a person (no AI used).",
  legal_complaint: "Hard rule: legal complaints always go to a person (no AI used).",
  ai_invalid_output:
    "The AI's reply wasn't in the expected format, so it went to a person.",
  language_not_supported:
    "Non-English question: FirstLine only answers in English for now, so it went to a person.",
  ai_unsure:
    "AI couldn't find this in the help articles, or it needs someone to check the account, so it went to a person.",
  no_valid_source:
    "The AI didn't cite one of the help articles it was given, so it went to a person.",
  quote_not_found:
    "Quote didn't match an article sentence, so it went to a person.",
  customer_said_no:
    "You clicked No, so this went to a person and won't be billed.",
};

const OUTCOME_NOTES: Record<Outcome, string> = {
  answered:
    "Answered from the help articles. Code checked that the quote is a whole sentence of the cited article. Tallyfox is billed only if the customer clicks Yes.",
  handover: "Handed over to a person.",
  declined: "Off-topic: not about Tallyfox, so the AI declined. Not billed.",
  unavailable:
    "The AI service was busy, slow or unreachable. No retry, nothing billed.",
  paused: "The demo's kill switch is on, so no AI was used.",
  rejected:
    "The question was empty or longer than 500 characters, so it wasn't sent to the AI.",
};

const YES_NOTE =
  "You clicked Yes, so this counts as resolved: the only thing FirstLine bills.";

export const CAP_REACHED = {
  text: WORDING.capReached,
  note: `Daily demo limit: ${DAILY_CAP} questions per browser per day, counted in this browser (no AI used).`,
} as const;

/** The demo note for an outcome, or for a handover reason. */
export function demoNote(outcome: Outcome, reason?: Reason): string {
  if (outcome === "handover" && reason !== undefined) return REASON_NOTES[reason];
  return OUTCOME_NOTES[outcome];
}

export type BotReply = {
  text: string;
  evidence?: {
    label: string;
    quote: string;
    sources: { id: string; title: string }[];
  };
  feedback?: { question: string; given: Feedback };
  followUp?: { text: string; note: string };
  note: string;
};

/** What the customer sees for one question in the record. */
export function replyFor(
  event: ChatEvent,
  titles: Record<string, string>,
): BotReply {
  const wasAnswered =
    event.answer !== undefined &&
    (event.outcome === "answered" || event.reason === "customer_said_no");

  if (wasAnswered) {
    const reply: BotReply = {
      text: event.answer ?? "",
      evidence: {
        label: WORDING.fromHelpCentre,
        quote: event.quote ?? "",
        sources: (event.cited_ids ?? []).map((id) => ({
          id,
          title: titles[id] ?? id,
        })),
      },
      feedback: { question: WORDING.askFeedback, given: event.feedback },
      note: demoNote("answered"),
    };
    if (event.feedback === "yes") {
      reply.followUp = { text: WORDING.afterYes, note: YES_NOTE };
    } else if (event.feedback === "no") {
      reply.followUp = {
        text: WORDING.afterNo,
        note: demoNote("handover", "customer_said_no"),
      };
    }
    return reply;
  }

  const note = demoNote(event.outcome, event.reason);
  switch (event.outcome) {
    case "handover":
      return {
        text:
          event.reason === "language_not_supported"
            ? WORDING.languageNotSupported
            : WORDING.handover,
        note,
      };
    case "declined":
      return { text: WORDING.declined, note };
    case "paused":
      return { text: WORDING.paused, note };
    case "rejected":
      return { text: WORDING.rejected, note };
    case "answered": // answered without an answer text cannot happen; be safe
    case "unavailable":
      return { text: WORDING.unavailable, note: demoNote("unavailable") };
  }
}

export const charCount = (text: string) => `${text.length}/${MAX_LENGTH}`;

export const questionsLeftText = (left: number) =>
  `${left} of ${DAILY_CAP} demo questions left today`;

/** Send is allowed for 1–500 characters (not only spaces), under the cap, when not waiting. */
export function canSend(
  text: string,
  state: { capReached: boolean; waiting: boolean },
): boolean {
  return (
    !state.capReached &&
    !state.waiting &&
    text.trim().length > 0 &&
    text.length <= MAX_LENGTH
  );
}
