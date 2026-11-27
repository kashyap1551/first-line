// Hard rules from docs/SPEC.md: questions that always go to a human, with no AI call.
// Every word form is written out by hand. \b marks a word edge, so "agent"
// never matches "management" and "sue" never matches "issue".

export type HardRule =
  | "billing_dispute"
  | "security"
  | "asked_for_human"
  | "account_recovery"
  | "privacy_request"
  | "legal_complaint";

// Any run of spaces or line breaks between the words of a phrase.
const _ = String.raw`\s+`;
// "can't" (straight or curly apostrophe), "cant", "cannot", "can not".
const CANT = String.raw`can(?:['’]?t|not|\s+not)`;

const anyOf = (...parts: string[]) =>
  new RegExp(String.raw`\b(?:${parts.join("|")})\b`, "i");

const LOSS = anyOf(
  "lose",
  "loses",
  "losing",
  "lost",
  `${CANT}${_}get`,
  `${CANT}${_}access`,
  `no${_}longer${_}ha(?:ve|s)`,
);
const TWO_FACTOR = anyOf(
  "2fa",
  String.raw`two(?:-|\s+)factor`,
  "authenticators?",
);

// In SPEC order. When several rules match, the first one is used.
const RULES: { rule: HardRule; test: (question: string) => boolean }[] = [
  {
    rule: "billing_dispute",
    test: (q) =>
      anyOf(
        "refund(?:s|ed|ing)?",
        `money${_}back`,
        `charg(?:e|es|ed|ing)${_}twice`,
        `double${_}charg(?:e|es|ed|ing)`,
        "overcharg(?:e|es|ed|ing)",
        "chargebacks?",
      ).test(q),
  },
  {
    rule: "security",
    test: (q) =>
      anyOf(
        "hack(?:s|ed|ing)?",
        `someone${_}access(?:es|ed|ing)?`,
        `suspicious${_}logins?`,
        "frauds?",
        "steal(?:s|ing)?",
        "stole",
        "stolen",
      ).test(q),
  },
  {
    rule: "asked_for_human",
    test: (q) =>
      anyOf(
        "humans?",
        `real${_}(?:persons?|people)`,
        "agents?",
        `(?:speak|speaks|speaking|spoke|spoken)${_}to${_}someone`,
        `(?:talk|talks|talked|talking)${_}to${_}someone`,
      ).test(q),
  },
  {
    rule: "account_recovery",
    test: (q) => LOSS.test(q) && TWO_FACTOR.test(q),
  },
  {
    rule: "privacy_request",
    test: (q) =>
      anyOf(
        "gdpr",
        `personal${_}data${_}you${_}hold`,
        `my${_}data${_}requests?`,
      ).test(q),
  },
  {
    rule: "legal_complaint",
    test: (q) =>
      anyOf(
        "lawyers?",
        "sue",
        "sues",
        "sued",
        "suing",
        `legal${_}actions?`,
        `formal${_}complaints?`,
      ).test(q),
  },
];

/** Every hard rule the question matches, in SPEC order. */
export function matchingRules(question: string): HardRule[] {
  return RULES.filter(({ test }) => test(question)).map(({ rule }) => rule);
}

/** The first hard rule the question matches, or null. */
export function matchRule(question: string): HardRule | null {
  return matchingRules(question)[0] ?? null;
}
