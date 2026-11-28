import type { AnswerResult } from "./answer";
import {
  caseGroup,
  coreTotals,
  leaks,
  verdict,
  type CoreTotals,
  type EvalCase,
  type Verdict,
} from "./eval-score";
import { matchRule } from "./rules";

// Builds the eval report (Markdown and JSON) from a finished or stopped run.
// Plain functions; scripts/eval-runner.ts does the waiting, calling and writing.

export const LABELS = ["calibration", "counted-1", "counted-2"] as const;
export type Label = (typeof LABELS)[number];

/** What the fetch wrapper records about one AI call. Never headers, never the key. */
export type CallFacts = {
  httpStatus: number;
  errorCode?: string;
  finishReason?: string;
  promptTokens?: number;
  completionTokens?: number;
  reasoningTokens?: number;
};

export type CaseRun = {
  id: string;
  result: AnswerResult;
  calls: CallFacts[];
  seconds: number;
};

export type Stop = { id: string; why: string } | null;

export type RunMeta = {
  date: string;
  startedAt: string;
  label: string;
  commit: string;
  dirty: boolean;
  model: string;
  fingerprint: string;
  casesFile: string;
  caseCount: number;
  /** The whole run including waits, filled in by the runner at the end. */
  wallSeconds?: number;
};

export type ReportRow = {
  id: string;
  group: "core" | "hard" | "other";
  unsure: boolean;
  expected: EvalCase["expected"];
  rule: string | null;
  outcome: AnswerResult["outcome"] | "not run";
  reason: string | null;
  cited_ids: string[];
  answer: string | null;
  quote: string | null;
  verdict: Verdict;
  leak: boolean;
  aiCalls: number;
  seconds: number | null;
  finishReason: string | null;
};

export type Usage = {
  aiCalls: number;
  promptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  answeringSeconds: number;
  lengthHits: number;
  jsonValidateFailed: number;
  httpStatuses: Record<string, number>;
};

export type EvalReport = {
  meta: RunMeta;
  status: "COMPLETE" | "INCOMPLETE";
  stop: Stop;
  rows: ReportRow[];
  core: CoreTotals;
  usage: Usage;
};

export const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** About 1,000 tokens and 21 s (20 s wait + the call) per AI call. Hard-rule cases need none. */
export function estimate(cases: EvalCase[]) {
  const aiCalls = cases.filter((c) => matchRule(c.question) === null).length;
  return { aiCalls, tokens: aiCalls * 1000, minutes: Math.round((aiCalls * 21) / 60) };
}

/** A refusal message if this would be a second counted run on the same local date. */
export function countedConflict(existing: string[], date: string, label: string): string | null {
  if (!label.startsWith("counted")) return null;
  const other = existing.find((f) => f.startsWith(`${date}-counted-`) && f.endsWith(".json"));
  return other
    ? `Refusing to start: a counted run already exists for ${date} (${other}). Counted runs must be on different days.`
    : null;
}

export function buildReport(
  meta: RunMeta,
  cases: EvalCase[],
  runs: CaseRun[],
  stop: Stop,
  prompt: string,
): EvalReport {
  const byId = new Map(runs.map((r) => [r.id, r]));
  const results = new Map(cases.map((c) => [c.id, byId.get(c.id)?.result]));

  const rows: ReportRow[] = cases.map((c) => {
    const run = byId.get(c.id);
    const r = run?.result;
    return {
      id: c.id,
      group: caseGroup(c.id),
      unsure: c.unsure === true,
      expected: c.expected,
      rule: c.rule,
      outcome: r ? r.outcome : "not run",
      reason: r?.outcome === "handover" ? r.reason : null,
      cited_ids: r?.outcome === "answered" ? r.cited_ids : [],
      answer: r?.outcome === "answered" ? r.answer : null,
      quote: r?.outcome === "answered" ? r.quote : null,
      verdict: verdict(c, r),
      leak: leaks(r, prompt),
      aiCalls: run?.calls.length ?? 0,
      seconds: run ? Number(run.seconds.toFixed(2)) : null,
      finishReason: run?.calls[0]?.finishReason ?? null,
    };
  });

  const calls = runs.flatMap((r) => r.calls);
  const sum = (pick: (c: CallFacts) => number | undefined) =>
    calls.reduce((total, c) => total + (pick(c) ?? 0), 0);
  const httpStatuses: Record<string, number> = {};
  for (const c of calls) httpStatuses[c.httpStatus] = (httpStatuses[c.httpStatus] ?? 0) + 1;
  const promptTokens = sum((c) => c.promptTokens);
  const completionTokens = sum((c) => c.completionTokens);

  const allRun = cases.every((c) => byId.has(c.id));
  const anyNotScored = rows.some((r) => r.verdict === "not_scored");

  return {
    meta,
    status: stop === null && allRun && !anyNotScored ? "COMPLETE" : "INCOMPLETE",
    stop,
    rows,
    core: coreTotals(cases, results),
    usage: {
      aiCalls: calls.length,
      promptTokens,
      completionTokens,
      reasoningTokens: sum((c) => c.reasoningTokens),
      totalTokens: promptTokens + completionTokens,
      answeringSeconds: Number(runs.reduce((t, r) => t + r.seconds, 0).toFixed(2)),
      lengthHits: calls.filter((c) => c.finishReason === "length").length,
      jsonValidateFailed: calls.filter((c) => c.errorCode === "json_validate_failed").length,
      httpStatuses,
    },
  };
}

const VERDICT_TEXT: Record<Verdict, string> = {
  correct: "correct",
  wrong_answer: "WRONG ANSWER",
  unneeded_handover: "unneeded handover",
  missed: "missed",
  not_scored: "not scored",
};

/** One table cell: no line breaks, no stray pipes, "–" when empty. */
const cell = (text: string | null | undefined) => {
  const t = (text ?? "").replace(/\s+/g, " ").trim().replaceAll("|", "\\|");
  return t === "" ? "–" : t;
};
const num = (n: number) => n.toLocaleString("en-US");
const yesNo = (b: boolean) => (b ? "yes" : "no");

function caseTable(rows: ReportRow[]): string[] {
  const lines = [
    "| id | unsure? | expected | outcome | reason | cited ids | answer | quote | verdict | Adds unsupported detail? (Chinmay) |",
    "|---|---|---|---|---|---|---|---|---|---|",
  ];
  for (const r of rows) {
    const verdictText = VERDICT_TEXT[r.verdict] + (r.leak ? " · LEAK" : "");
    const chinmay = r.outcome === "answered" ? "" : "–";
    const cells = [
      r.id,
      r.unsure ? "yes" : "–",
      r.expected,
      r.outcome,
      cell(r.reason),
      cell(r.cited_ids.join(", ")),
      cell(r.answer),
      cell(r.quote),
      verdictText,
      chinmay,
    ];
    lines.push(`| ${cells.join(" | ")} |`);
  }
  return lines;
}

function duration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m} min ${s} s` : `${s} s`;
}

export function renderMarkdown(report: EvalReport): string {
  const { meta, core, usage } = report;
  const statusText =
    report.status === "COMPLETE"
      ? "COMPLETE"
      : report.stop
        ? `INCOMPLETE (stopped at ${report.stop.id}: ${report.stop.why})`
        : `INCOMPLETE (${report.rows.filter((r) => r.verdict === "not_scored").length} cases not scored)`;

  const out: string[] = [
    `# Eval run: ${meta.label} (${meta.date})`,
    "",
    `- Status: ${statusText}`,
    `- Date: ${meta.date} (started ${meta.startedAt})`,
    `- Label: ${meta.label}`,
    `- Git commit: ${meta.commit} (uncommitted changes: ${yesNo(meta.dirty)})`,
    `- Model: ${meta.model}`,
    `- Request fingerprint: ${meta.fingerprint}`,
    `- Cases: ${meta.caseCount} from ${meta.casesFile}`,
    "",
  ];

  const groups: [ReportRow["group"], string][] = [
    ["core", "Core set C01–C42"],
    ["hard", "Hard cases C43–C50 (no pass bar)"],
    ["other", "Other cases (no pass bar)"],
  ];
  const coreRows = report.rows.filter((r) => r.group === "core");
  if (coreRows.length > 0) {
    out.push(`## ${groups[0][1]}`, "", ...caseTable(coreRows), "");
    out.push(
      "## Core totals vs pass bars",
      "",
      "Unsure cases (C18, C35) are left out of the bars and scored separately, so the bars count the other core cases only.",
      "",
      "| measure | result | pass bar | verdict |",
      "|---|---|---|---|",
    );
    for (const b of core.bars) {
      const v = b.pass === null ? "INCOMPLETE" : b.pass ? "PASS" : "FAIL";
      out.push(`| ${b.label} | ${b.value} of ${b.of} | ${b.bar} | ${v} |`);
    }
    const hardRuleCount = core.bars.find((b) => b.key === "hard_rules")?.of ?? 0;
    const u = core.includingUnsure;
    out.push(
      "",
      `- Hard rules fired with exactly the expected reason: ${core.rulesFired} of ${hardRuleCount}`,
      `- Unsure cases (scored separately): ${
        core.unsure.length === 0
          ? "none"
          : core.unsure.map((x) => `${x.id} ${VERDICT_TEXT[x.verdict]}`).join(", ")
      }`,
      `- With the unsure cases included (information only, no pass or fail): wrong answers ${u.wrongAnswers} of ${u.cases}, answer cases correct ${u.answerCorrect} of ${u.answerCases}, unneeded handovers ${u.unneeded} of ${u.answerCases}`,
      "",
    );
  }
  for (const [group, title] of groups.slice(1)) {
    const rows = report.rows.filter((r) => r.group === group);
    if (rows.length > 0) out.push(`## ${title}`, "", ...caseTable(rows), "");
  }

  const statuses = Object.entries(usage.httpStatuses)
    .map(([status, n]) => `${status} × ${n}`)
    .join(", ");
  out.push(
    "## Tokens and time",
    "",
    `- AI calls: ${usage.aiCalls}`,
    `- Tokens: ${num(usage.promptTokens)} prompt + ${num(usage.completionTokens)} completion = ${num(usage.totalTokens)} total (${num(usage.reasoningTokens)} of them reasoning)`,
    `- Time answering questions: ${duration(usage.answeringSeconds)} (not counting the waits between calls)`,
    ...(meta.wallSeconds !== undefined ? [`- Whole run: ${duration(meta.wallSeconds)}`] : []),
    `- Reply cut off at 500 tokens (finish_reason "length"): ${usage.lengthHits > 0 ? `yes (${usage.lengthHits})` : "no"}`,
    `- json_validate_failed seen: ${usage.jsonValidateFailed > 0 ? `yes (${usage.jsonValidateFailed})` : "no"}`,
    `- HTTP statuses: ${statuses === "" ? "–" : statuses}`,
    "",
  );
  return out.join("\n");
}
