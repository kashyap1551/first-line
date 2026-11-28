// The eval run: every case through the real answer step with the real AI.
//
//   npm run eval -- --label calibration
//   npm run eval -- --label counted-1 [--cases /path/held-out.json] [--out /path/folder]
//
// Waits 20 s before each AI call, stops when the AI is unavailable (no retries) and
// writes <out>/<date>-<label>.md and .json. Never prints or writes the key.

import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { countedConflict, buildReport, estimate, localDate, type RunMeta } from "../lib/eval-report";
import type { EvalCase } from "../lib/eval-score";
import { callGroq } from "../lib/groq";
import { GROQ_MODEL, REQUEST_FINGERPRINT } from "../lib/groq-request";
import { articles } from "../lib/help-centre";
import { PROMPT } from "../lib/prompt";
import { parseEvalArgs, runCases, writeReport } from "./eval-runner";
import { observeGroqCalls } from "./groq-observer";

const WAIT_MS = 20_000;

function git(command: string): string {
  try {
    return execSync(`git ${command}`, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main() {
  const argv = process.argv.slice(1);
  const first = argv.findIndex((a) => a.startsWith("--"));
  const args = parseEvalArgs(first === -1 ? [] : argv.slice(first));
  if ("error" in args) {
    fail(`${args.error}\nUsage: npm run eval -- --label calibration|counted-1|counted-2 [--cases file] [--out folder]`);
  }

  const casesPath = resolve(args.cases);
  if (!existsSync(casesPath)) fail(`Cases file not found: ${args.cases}`);
  const cases: EvalCase[] = JSON.parse(readFileSync(casesPath, "utf8")).cases;
  if (!Array.isArray(cases) || cases.length === 0) fail("The cases file has no \"cases\" list.");

  const now = new Date();
  const meta: RunMeta = {
    date: localDate(now),
    startedAt: now.toISOString(),
    label: args.label,
    commit: git("rev-parse --short HEAD") || "unknown",
    dirty: git("status --porcelain") !== "",
    model: GROQ_MODEL,
    fingerprint: REQUEST_FINGERPRINT,
    casesFile: relative(process.cwd(), casesPath).startsWith("..") ? casesPath : relative(process.cwd(), casesPath),
    caseCount: cases.length,
  };

  console.log(`Eval run: ${meta.label}`);
  console.log(`  date ${meta.date}, commit ${meta.commit}${meta.dirty ? " (uncommitted changes)" : ""}`);
  console.log(`  model ${meta.model}, request fingerprint ${meta.fingerprint}`);
  console.log(`  ${meta.caseCount} cases from ${meta.casesFile}`);
  const cost = estimate(cases);
  console.log(
    `  expected cost: about ${cost.aiCalls} AI calls, about ${cost.tokens.toLocaleString("en-US")} tokens, about ${cost.minutes} minutes`,
  );

  const outDir = resolve(args.out);
  const existing = existsSync(outDir) ? readdirSync(outDir) : [];
  const conflict = countedConflict(existing, meta.date, meta.label);
  if (conflict) fail(conflict);
  if (existing.includes(`${meta.date}-${meta.label}.json`)) {
    console.log(`  note: this replaces the existing ${meta.date}-${meta.label} report`);
  }

  // Yes/no only. Never the values.
  console.log(`  key set: ${Boolean(process.env.GROQ_API_KEY)}, AI_ENABLED is exactly true: ${process.env.AI_ENABLED === "true"}`);
  if (!process.env.GROQ_API_KEY || process.env.AI_ENABLED !== "true") {
    fail("Not starting: the AI is not switched on. No calls made.");
  }

  const observer = observeGroqCalls();
  const started = performance.now();
  let result;
  try {
    result = await runCases({
      cases,
      articles,
      callAi: callGroq,
      takeFacts: observer.takeFacts,
      aiEnabled: process.env.AI_ENABLED,
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      waitMs: WAIT_MS,
      log: (line) => console.log(line),
    });
  } finally {
    observer.restore();
  }
  meta.wallSeconds = Number(((performance.now() - started) / 1000).toFixed(1));

  const report = buildReport(meta, cases, result.runs, result.stop, PROMPT);
  const paths = writeReport(outDir, report);

  console.log(`\nStatus: ${report.status}${result.stop ? ` (stopped at ${result.stop.id}: ${result.stop.why})` : ""}`);
  for (const b of report.core.bars) {
    const v = b.pass === null ? "INCOMPLETE" : b.pass ? "PASS" : "FAIL";
    console.log(`  ${v.padEnd(10)} ${b.label}: ${b.value} of ${b.of} (bar: ${b.bar})`);
  }
  const leaked = report.rows.filter((r) => r.leak).map((r) => r.id);
  if (leaked.length > 0) console.log(`  LEAK in: ${leaked.join(", ")}`);
  console.log(
    `  AI calls ${report.usage.aiCalls}, tokens ${report.usage.totalTokens.toLocaleString("en-US")}, whole run ${meta.wallSeconds} s`,
  );
  console.log(`Wrote ${relative(process.cwd(), paths.md)} and ${relative(process.cwd(), paths.json)}`);
}

await main();
