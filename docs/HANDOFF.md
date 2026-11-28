# Handoff

## Start here next session
1. Read CLAUDE.md, then this file, then docs/DECISIONS.md.
2. Day 2 (answer step) is done and merged (PR #2). Day 3 (`/demo` widget), Day 4 (`/team` inbox, `/team/billing`) and the Day 5 eval runner are built on branch `demo-widget`, committed, NOT pushed.
3. Next: the calibration run, only after Chinmay's "go": `npm run eval -- --label calibration` (about 43 AI calls, about 43,000 tokens, about 15 minutes). Before the first counted run, Chinmay confirms how unsure cases count in the bars (see DECISIONS 2026-11-28).

## Where we stopped
- **Date:** 2026-11-28
- **Branch:** `demo-widget` (from `main` at `64dde8b`, the merge of PR #2). `day2-answer-step` was deleted locally and on origin.
- **Commits:** `74890d7` "demo widget: help page, chat, feedback, daily cap", `8b3318f` "team inbox and billing page", then "eval runner and hard cases" (this note). NOT pushed.
- **Real AI calls on this branch:** none by Claude. The page checks fetched only `/`, `/demo`, `/team` and `/team/billing` (all 200); `/api/answer` was never called. The eval runner was tried only with a fake AI and with `AI_ENABLED=false` on the command line (it refused to start, 0 calls).
- **Deliberate breaks done (all restored):**
  - Removing the `quote_not_found` demo note made "reason quote_not_found has a demo note" fail.
  - Letting setFeedback run twice made "works only once: a second click changes nothing" fail.
  - Counting unconfirmed answers in the FirstLine bill made the two FirstLine-bill tests (50 and 99 cents) fail.
  - Letting markDone run twice made "works only once: a second call changes nothing" fail.
  - Counting a citation outside accepted_ids as correct made "answer case: answered citing A04 and A12 (A12 not accepted)" fail.
  - Letting the eval continue after a 429 made "stops after a 429: no retry, no further calls, report marked INCOMPLETE" fail (and the 400 stop test).

## What works
- **Answer step (Day 2):**
  - `lib/rules.ts`: the 6 hard rules, whole words and phrases, any letter case, word forms written out by hand. C29–C34 each fire exactly their rule; the other 36 cases fire none.
  - `lib/prompt.ts` and `lib/groq-request.ts`: the approved AI instructions and request body, pinned by request fingerprint `b6cbcebee5df9b5846fc85e02423ecdc0c46b42ae5e23b47f68e4a6f8fd0c2e0`. Any change needs a new fingerprint and a line in `docs/DECISIONS.md`.
  - `lib/quote.ts`: the quote must equal one whole sentence of a cited article.
  - `lib/answer.ts`: validate → kill switch → hard rules → top 3 search → one AI call (15 s) → JSON check → language → off-topic → needs_human → source check → quote check. A failed AI call logs only `{ type, status }`.
  - `app/api/answer/route.ts`: `POST { question }`. 400 for a rejected question, 200 otherwise.
  - `scripts/try-real-calls.ts`: up to 7 real calls with token counts (see `docs/runs/2026-11-28-day2b.md` for how to run it).
- **Demo widget (Day 3):**
  - `lib/chat-store.ts`: the browser's record under `firstline:v1:events`. Every storage read and write is in try/catch, with memory as the fallback. Also: addEvent, setFeedback (answered only, once; No → handover `customer_said_no`, keeps the answer), questionsToday / questionsLeft / capReached (20 per local date, every outcome counts), clearAll, and reload when another tab changes it.
  - `lib/chat-messages.ts`: all customer wording (approved 28 Nov), the demo note for every outcome and reason, the counter text and canSend.
  - `lib/help-page.ts`: articles grouped by category (8 categories) and the id → title map.
  - `app/demo/page.tsx` + `app/demo/chat-widget.tsx`: the Tallyfox help page (25 expandable articles with id anchors) and the chat widget, open by default (right on wide screens, on top and full width on phones).
  - `app/page.tsx`: the FirstLine landing page with "Try the demo".
- **Team pages (Day 4):**
  - `lib/chat-store.ts`: also markDone (handover only, once) and the optional `done` flag; older records still load.
  - `lib/billing.ts`: this month's counts (billable, not counted, resolved, unconfirmed, handed over with a breakdown by reason, off-topic), the resolution rate, both bills in whole cents, the unverified amount and share, the unverified list, and the billing-page wording. Tested with Chinmay's hand-counted 10-question session.
  - `lib/team-inbox.ts`: handovers newest first, split into open and done, and the team's wording for every reason.
  - `app/team/page.tsx` (inbox) and `app/team/billing/page.tsx` (billing). `app/components/use-events.ts` is the one shared reader of the browser record; `app/components/site-nav.tsx` is the nav (Customer view · Team inbox · Billing).
- **Eval runner (Day 5):**
  - `evals/cases.json`: core set C01–C42 (C18 and C35 unsure) plus the owner's hard cases C43–C50.
  - `lib/eval-score.ts`: the verdict per case, the leak check, and the core totals against the SPEC pass bars (unsure cases scored separately).
  - `lib/eval-report.ts`: the report (Markdown and JSON), the cost estimate and the one-counted-run-per-day check.
  - `scripts/eval-runner.ts` (run, stop rules, writing, arguments), `scripts/eval.ts` (the real run) and `scripts/groq-observer.ts` (records status, finish_reason and tokens per call; never headers or keys).
  - `npm run eval -- --label calibration|counted-1|counted-2 [--cases file] [--out folder]`. Reports go to `docs/evals/<date>-<label>.md` and `.json`.
- **Checks:** `npm test`: 468 passed, 2 expected failures (C16, C22 known search misses). `npm run lint`, `npx tsc --noEmit` and `npm run build` pass.

## What's next
1. **Chinmay:** manual browser test of `/demo`, `/team` and `/team/billing` (real AI calls). Day 3 is done when a full question → answer → Yes/No loop works in the browser. Day 4 is done when the billing page matches a hand-counted 10-question session in the browser (the same session already passes as a unit test).
2. **Day 5:** the calibration run after Chinmay's go (`npm run eval -- --label calibration`). Then Chinmay fills in the "Adds unsupported detail?" column by hand. Then 2 counted runs on different days (`counted-1`, `counted-2`) with the same fingerprint. A held-out file outside the repo can be used with `--cases`; use `--out` with a folder outside the repo too, so its questions never land in the repo.

## Day 2b checks (results 2026-11-28)
- **JSON schema response format:** decided 2026-11-28: keep json_object (see DECISIONS).
- **500 output tokens:** enough. The largest reply was 116 completion tokens, and finish_reason was "stop" every time (never "length").
- **reasoning_effort / include_reasoning:** reasoning stayed small (4 to 54 tokens per call), and the reply text was only the JSON, with no reasoning mixed in. (We did not check whether Groq sends a separate reasoning field.)
- **json_validate_failed:** never seen; every call returned HTTP 200 with valid JSON. Still unproven whether Groq reports bad JSON as 400 `json_validate_failed`.
- **C16 and C22:** both handed over as `ai_unsure` (needs_human), as expected for the known search misses.
- **C23:** answered from A21 with a whole A21 sentence. But the answer says the link is "sent to your email", which A21 doesn't say. Note for Day 5 hand scoring.
- **C03:** answered from A04 with the whole sentence "PayPal is not accepted."
- **Cost per question:** about 640 to 940 prompt tokens and 40 to 120 completion tokens per AI call. Each call took 0.4 to 0.9 s.

## Later days
- **Day 5:** the eval scores, by hand, whether each answer adds anything not in the articles (no AI judge).
- **Day 6:** guardrails, privacy note, public deploy. (The 20-per-browser daily cap was built early, on Day 3.)

## Open questions
- **PRD Q3, Q4, Q5** (talk to 3 support people; check the numbers and price) due 2 Dec.
- **PRD Q6** (Groq processing country) due 2 Dec. Zero Data Retention was turned on 2026-11-27. **Q7** (Impressum) due 2 Dec. **Q8** (name clashes) due 1 Dec.

## Later
- Article keywords from real customer wording (vocabulary gap). Parked 2026-11-27: needs real search logs.
- Handover summary for language_not_supported: show the AI's English summary plus the original question (when building the inbox).
- A question is recorded (and counted toward the cap) when its reply arrives. If the tab is closed while waiting, that question is not counted.
