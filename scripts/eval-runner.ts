import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { answerQuestion, type CallAi } from "../lib/answer";
import type { Article } from "../lib/content";
import {
  LABELS,
  renderMarkdown,
  type CallFacts,
  type CaseRun,
  type EvalReport,
  type Label,
  type Stop,
} from "../lib/eval-report";
import type { EvalCase } from "../lib/eval-score";
import { matchRule } from "../lib/rules";

// The parts of the eval runner that tests can drive with a fake AI.
// scripts/eval.ts wires them to the real Groq call.

export type RunDeps = {
  cases: EvalCase[];
  articles: Article[];
  callAi: CallAi;
  /** The facts recorded for the AI calls since the last time this was called. */
  takeFacts: () => CallFacts[];
  aiEnabled: string | undefined;
  sleep: (ms: number) => Promise<void>;
  waitMs: number;
  log: (line: string) => void;
};

/**
 * Runs every case through the real answer step, in order. Waits before each AI
 * call (hard-rule cases need none). Stops at the first unavailable result,
 * paused result or HTTP error: no retries.
 */
export async function runCases(deps: RunDeps): Promise<{ runs: CaseRun[]; stop: Stop }> {
  const runs: CaseRun[] = [];
  for (const [i, c] of deps.cases.entries()) {
    if (matchRule(c.question) === null) await deps.sleep(deps.waitMs);

    const started = performance.now();
    const result = await answerQuestion(c.question, {
      callAi: deps.callAi,
      articles: deps.articles,
      aiEnabled: deps.aiEnabled,
    });
    const seconds = (performance.now() - started) / 1000;
    const calls = deps.takeFacts();
    runs.push({ id: c.id, result, calls, seconds });

    const detail =
      result.outcome === "answered"
        ? result.cited_ids.join(",")
        : result.outcome === "handover"
          ? result.reason
          : "";
    deps.log(`[${i + 1}/${deps.cases.length}] ${c.id} ${result.outcome} ${detail} (${seconds.toFixed(1)} s)`);

    const failed = calls.find((call) => call.httpStatus !== 200);
    if (result.outcome === "unavailable") {
      return { runs, stop: { id: c.id, why: failed ? `unavailable (HTTP ${failed.httpStatus})` : "unavailable" } };
    }
    if (failed) return { runs, stop: { id: c.id, why: `HTTP ${failed.httpStatus}` } };
    if (result.outcome === "paused") return { runs, stop: { id: c.id, why: "paused" } };
  }
  return { runs, stop: null };
}

/** Writes <date>-<label>.md and .json into dir. */
export function writeReport(dir: string, report: EvalReport) {
  mkdirSync(dir, { recursive: true });
  const base = join(dir, `${report.meta.date}-${report.meta.label}`);
  const md = `${base}.md`;
  const json = `${base}.json`;
  writeFileSync(md, renderMarkdown(report), "utf8");
  writeFileSync(json, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return { md, json };
}

export type EvalArgs = { label: Label; cases: string; out: string };

export function parseEvalArgs(argv: string[]): EvalArgs | { error: string } {
  try {
    const { values } = parseArgs({
      args: argv,
      options: {
        label: { type: "string" },
        cases: { type: "string", default: "evals/cases.json" },
        out: { type: "string", default: "docs/evals" },
      },
      strict: true,
      allowPositionals: false,
    });
    const label = values.label;
    if (!label || !(LABELS as readonly string[]).includes(label)) {
      return { error: `--label must be one of: ${LABELS.join(", ")}` };
    }
    return { label: label as Label, cases: values.cases, out: values.out };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
