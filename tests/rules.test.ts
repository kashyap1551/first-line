import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { matchingRules, matchRule, type HardRule } from "../lib/rules";

type Case = {
  id: string;
  question: string;
  expected: string;
  rule: HardRule | null;
};

const cases: Case[] = JSON.parse(
  readFileSync(new URL("../evals/cases.json", import.meta.url), "utf8"),
).cases;

const ruleCases = cases.filter((c) => c.rule !== null);
const answerCases = cases.filter((c) => c.expected === "answer");
const declineCases = cases.filter((c) => c.expected === "decline");
const aiHandoverCases = cases.filter(
  (c) => c.expected === "handover" && c.rule === null,
);

describe("hard rules on evals/cases.json", () => {
  it("covers 6 rule cases (C29–C34), 28 answer, 4 decline and 4 AI handover cases", () => {
    expect(ruleCases.map((c) => c.id)).toEqual([
      "C29",
      "C30",
      "C31",
      "C32",
      "C33",
      "C34",
    ]);
    expect(answerCases).toHaveLength(28);
    expect(declineCases).toHaveLength(4);
    expect(aiHandoverCases).toHaveLength(4);
  });

  it.each(ruleCases)("$id triggers exactly $rule", ({ question, rule }) => {
    expect(matchingRules(question)).toEqual([rule]);
    expect(matchRule(question)).toBe(rule);
  });

  it.each([...answerCases, ...declineCases, ...aiHandoverCases])(
    "$id triggers no rule",
    ({ question }) => {
      expect(matchingRules(question)).toEqual([]);
      expect(matchRule(question)).toBeNull();
    },
  );
});

describe("added cases", () => {
  it("'refunded' is a billing dispute", () => {
    expect(matchingRules("Can I get last month refunded?")).toEqual([
      "billing_dispute",
    ]);
  });

  it("a lost authenticator app is account recovery, without the word code", () => {
    expect(matchingRules("I lost my authenticator app")).toEqual([
      "account_recovery",
    ]);
  });
});

// Typed out by hand: every word form each rule must catch.
const FORMS: Record<Exclude<HardRule, "account_recovery">, string[]> = {
  billing_dispute: [
    "refund",
    "refunds",
    "refunded",
    "refunding",
    "money back",
    "charge twice",
    "charges twice",
    "charged twice",
    "charging twice",
    "double charge",
    "double charges",
    "double charged",
    "double charging",
    "overcharge",
    "overcharges",
    "overcharged",
    "overcharging",
    "chargeback",
    "chargebacks",
  ],
  security: [
    "hack",
    "hacks",
    "hacked",
    "hacking",
    "someone access",
    "someone accesses",
    "someone accessed",
    "someone accessing",
    "suspicious login",
    "suspicious logins",
    "fraud",
    "frauds",
    "steal",
    "steals",
    "stealing",
    "stole",
    "stolen",
  ],
  asked_for_human: [
    "human",
    "humans",
    "real person",
    "real persons",
    "real people",
    "agent",
    "agents",
    "speak to someone",
    "speaks to someone",
    "speaking to someone",
    "spoke to someone",
    "spoken to someone",
    "talk to someone",
    "talks to someone",
    "talked to someone",
    "talking to someone",
  ],
  privacy_request: [
    "GDPR",
    "personal data you hold",
    "my data request",
    "my data requests",
  ],
  legal_complaint: [
    "lawyer",
    "lawyers",
    "sue",
    "sues",
    "sued",
    "suing",
    "legal action",
    "legal actions",
    "formal complaint",
    "formal complaints",
  ],
};

describe("word forms", () => {
  const rows = Object.entries(FORMS).flatMap(([rule, forms]) =>
    forms.map((form) => ({ rule, form })),
  );

  it.each(rows)("'$form' triggers $rule", ({ rule, form }) => {
    expect(matchingRules(`Well, ${form}.`)).toEqual([rule]);
  });
});

describe("account recovery needs a loss phrase and a two-factor word", () => {
  const losses = [
    "lose",
    "loses",
    "losing",
    "lost",
    "can't get",
    "can’t get",
    "cant get",
    "cannot get",
    "can not get",
    "can't access",
    "can’t access",
    "cant access",
    "cannot access",
    "can not access",
    "no longer have",
    "no longer has",
  ];
  const twoFactorWords = [
    "2FA",
    "two-factor",
    "two factor",
    "authenticator",
    "authenticators",
  ];

  it.each(losses)("loss phrase '%s' with a two-factor word", (loss) => {
    expect(matchingRules(`I ${loss} my 2FA`)).toEqual(["account_recovery"]);
  });

  it.each(twoFactorWords)("two-factor word '%s' with a loss", (word) => {
    expect(matchingRules(`I lost my ${word}`)).toEqual(["account_recovery"]);
  });

  it("a two-factor word alone is not enough", () => {
    expect(matchingRules("How do I turn on two-factor?")).toEqual([]);
  });

  it("a loss phrase alone is not enough", () => {
    expect(matchingRules("I lost my receipt")).toEqual([]);
  });
});

describe("whole words only, in any letter case", () => {
  it("'agent' never matches 'management'", () => {
    expect(matchingRules("Is there a user management page?")).toEqual([]);
  });

  it("'sue' never matches 'issue'", () => {
    expect(matchingRules("I have an issue with an invoice")).toEqual([]);
  });

  it("'charge' alone is not a dispute", () => {
    expect(matchingRules("Can I charge a reverse charge?")).toEqual([]);
  });

  it("ignores letter case", () => {
    expect(matchingRules("REFUND ME")).toEqual(["billing_dispute"]);
  });

  it("matches a phrase across extra spaces and line breaks", () => {
    expect(matchingRules("I want my money \n  back")).toEqual([
      "billing_dispute",
    ]);
  });

  it("lists several rules in SPEC order and uses the first", () => {
    const question = "My lawyer wants a refund";
    expect(matchingRules(question)).toEqual([
      "billing_dispute",
      "legal_complaint",
    ]);
    expect(matchRule(question)).toBe("billing_dispute");
  });
});
