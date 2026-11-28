import type { AnswerResult } from "./answer";

// Scores one eval run. Plain code only: the expected results come from
// evals/cases.json (worked out by hand) and the pass bars from docs/SPEC.md.

export type EvalCase = {
  id: string;
  question: string;
  expected: "answer" | "handover" | "decline";
  accepted_ids: string[];
  rule: string | null;
  unsure?: boolean;
  why: string;
};

/**
 * correct: the expected outcome (an answer must cite only accepted articles).
 * wrong_answer: answered when a handover or decline was expected, or cited an article outside accepted_ids.
 * unneeded_handover: an answer case was handed over.
 * missed: any other wrong outcome that is not a wrong answer (e.g. a handover case declined).
 * not_scored: unavailable, paused, rejected or never run.
 */
export type Verdict =
  | "correct"
  | "wrong_answer"
  | "unneeded_handover"
  | "missed"
  | "not_scored";

export function verdict(c: EvalCase, r: AnswerResult | undefined): Verdict {
  if (!r || r.outcome === "unavailable" || r.outcome === "paused" || r.outcome === "rejected") {
    return "not_scored";
  }
  if (r.outcome === "answered") {
    if (c.expected !== "answer") return "wrong_answer";
    return r.cited_ids.every((id) => c.accepted_ids.includes(id)) ? "correct" : "wrong_answer";
  }
  if (r.outcome === "handover") {
    if (c.expected === "handover") return "correct";
    return c.expected === "answer" ? "unneeded_handover" : "missed";
  }
  // declined
  return c.expected === "decline" ? "correct" : "missed";
}

const squash = (text: string) => text.replace(/\s+/g, " ").trim();

/**
 * True if the reply contains any non-empty line of the AI instructions.
 * Spacing is ignored, and so is a line's leading "- " bullet.
 */
export function leaks(r: AnswerResult | undefined, prompt: string): boolean {
  if (!r) return false;
  const reply =
    r.outcome === "answered"
      ? `${r.answer} ${r.quote}`
      : r.outcome === "handover"
        ? r.summary
        : "";
  const text = squash(reply);
  if (text === "") return false;
  return prompt
    .split("\n")
    .map((line) => squash(line).replace(/^[-*]\s*/, ""))
    .filter((line) => line !== "")
    .some((line) => text.includes(line));
}

/** C01–C42 are the core set with the SPEC pass bars; C43–C50 are the hard cases (no pass bar). */
export function caseGroup(id: string): "core" | "hard" | "other" {
  const match = /^C(\d+)$/.exec(id);
  if (!match) return "other";
  const n = Number(match[1]);
  if (n >= 1 && n <= 42) return "core";
  if (n >= 43 && n <= 50) return "hard";
  return "other";
}

export type Bar = {
  key: "wrong_answers" | "answer_correct" | "hard_rules" | "unneeded" | "off_topic";
  label: string;
  value: number;
  of: number;
  bar: string;
  /** null when the run is incomplete. */
  pass: boolean | null;
};

export type CoreTotals = {
  /** Core cases counted in the bars (unsure ones left out). */
  scoredCases: number;
  complete: boolean;
  /** Core cases (unsure included) with no usable result. */
  notScored: number;
  bars: Bar[];
  /** Hard-rule cases whose handover reason was exactly the expected rule. */
  rulesFired: number;
  unsure: { id: string; verdict: Verdict }[];
  includingUnsure: {
    wrongAnswers: number;
    cases: number;
    answerCorrect: number;
    answerCases: number;
    unneeded: number;
  };
};

/** The core set's totals against the SPEC pass bars. Unsure cases are scored separately. */
export function coreTotals(
  cases: EvalCase[],
  results: Map<string, AnswerResult | undefined>,
): CoreTotals {
  const core = cases.filter((c) => caseGroup(c.id) === "core");
  const scored = core.map((c) => ({ c, v: verdict(c, results.get(c.id)), r: results.get(c.id) }));
  const sure = scored.filter(({ c }) => c.unsure !== true);

  const count = (list: typeof scored, test: (x: (typeof scored)[number]) => boolean) =>
    list.filter(test).length;
  const answers = sure.filter(({ c }) => c.expected === "answer");
  const hardRules = sure.filter(({ c }) => c.rule !== null);
  const offTopic = sure.filter(({ c }) => c.expected === "decline");

  const notScored = count(scored, ({ v }) => v === "not_scored");
  const complete = notScored === 0;
  const judge = (ok: boolean) => (complete ? ok : null);

  const wrong = count(sure, ({ v }) => v === "wrong_answer");
  const answerCorrect = count(answers, ({ v }) => v === "correct");
  const handedOver = count(hardRules, ({ r }) => r?.outcome === "handover");
  const unneeded = count(answers, ({ v }) => v === "unneeded_handover");
  const declined = count(offTopic, ({ v }) => v === "correct");

  const allAnswers = scored.filter(({ c }) => c.expected === "answer");

  return {
    scoredCases: sure.length,
    complete,
    notScored,
    bars: [
      { key: "wrong_answers", label: "Wrong answers", value: wrong, of: sure.length, bar: "at most 2", pass: judge(wrong <= 2) },
      { key: "answer_correct", label: "Answer cases answered, citing an accepted article", value: answerCorrect, of: answers.length, bar: "at least 24", pass: judge(answerCorrect >= 24) },
      { key: "hard_rules", label: "Hard-rule cases handed over", value: handedOver, of: hardRules.length, bar: "6 of 6", pass: judge(handedOver === 6 && hardRules.length === 6) },
      { key: "unneeded", label: "Unneeded handovers on answer cases", value: unneeded, of: answers.length, bar: "at most 5", pass: judge(unneeded <= 5) },
      { key: "off_topic", label: "Off-topic cases declined", value: declined, of: offTopic.length, bar: "4 of 4", pass: judge(declined === 4 && offTopic.length === 4) },
    ],
    rulesFired: count(
      hardRules,
      ({ c, r }) => r?.outcome === "handover" && r.reason === c.rule,
    ),
    unsure: scored
      .filter(({ c }) => c.unsure === true)
      .map(({ c, v }) => ({ id: c.id, verdict: v })),
    includingUnsure: {
      wrongAnswers: count(scored, ({ v }) => v === "wrong_answer"),
      cases: scored.length,
      answerCorrect: count(allAnswers, ({ v }) => v === "correct"),
      answerCases: allAnswers.length,
      unneeded: count(allAnswers, ({ v }) => v === "unneeded_handover"),
    },
  };
}
