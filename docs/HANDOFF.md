# Handoff

## Start here next session
1. Read CLAUDE.md, this file, then docs/DECISIONS.md.
2. Branch `demo-widget` holds the chat widget, team inbox, billing page and eval runner. Pushed, NOT merged.
3. Next, in order:
   a) DONE 28 Nov: the json_validate_failed change (DECISIONS 2026-11-28), built tests first in `7eb35b3`. A 400 json_validate_failed is scored as a handover `ai_invalid_output`; only unavailable (429, 5xx, timeout, network error) stops a run.
   b) DONE 28 Nov, but INCOMPLETE: the calibration run (`npm run eval -- --label calibration`), practice, not counted. It stopped at C37 after an AI call timed out (15 s limit), no retry. Report committed in `3316d71`: `docs/evals/2026-11-28-calibration.md` and `.json`. Nothing was changed because of it; see "Calibration run 2026-11-28" below.
   c) Chinmay pastes the calibration report into the reviewer chat for review. Any change it leads to (code, cases, prompt, or a second calibration run) needs his decision first.
   d) Chinmay's manual browser test of `/demo`, `/team`, `/team/billing`: the MANUAL TEST LIST in `docs/manual-tests.md` (checks D and H–M from the chat test, plus steps 19–27 for the team pages). Results so far: A, B, C, E, F, G passed on 28 Nov.
   e) After his go: pull request for `demo-widget` → `main`.
   f) Counted runs `counted-1` and `counted-2`, on different days.

## Where we stopped
- **Date:** 2026-11-28
- **Branch:** `demo-widget` (from `main` at `64dde8b`, the merge of PR #2). `day2-answer-step` was deleted locally and on origin.
- **Commits on the branch:** `74890d7` demo widget, `8b3318f` team inbox and billing page, `11f92af` eval runner and hard cases, `7eb35b3` eval: score json_validate_failed as a handover, `3316d71` eval: calibration run (practice, not counted), then "docs: end of session (28 Nov)" (this note). Pushed to origin on 2026-11-28 with Chinmay's go. NOT merged; `main` unchanged at `64dde8b`.
- **Real AI calls today on this branch:** only the calibration run: 31 calls sent (30 answered with HTTP 200, 1 timed out at C37), 30,375 tokens recorded for the 30 that answered. The page checks fetched only `/`, `/demo`, `/team` and `/team/billing`; Claude never called `/api/answer`.
- **Deliberate breaks done (all restored):**
  - Removing the `quote_not_found` demo note made "reason quote_not_found has a demo note" fail.
  - Letting setFeedback run twice made "works only once: a second click changes nothing" fail.
  - Counting unconfirmed answers in the FirstLine bill made the two FirstLine-bill tests (50 and 99 cents) fail.
  - Letting markDone run twice made "works only once: a second call changes nothing" fail.
  - Counting a citation outside accepted_ids as correct made "answer case: answered citing A04 and A12 (A12 not accepted)" fail.
  - Letting the eval continue after a 429 made "stops after a 429: no retry, no further calls, report marked INCOMPLETE" fail (checked again after the json_validate_failed change).

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
  - `scripts/eval-runner.ts` (run, stop rules: only unavailable or paused stops a run; writing; arguments), `scripts/eval.ts` (the real run) and `scripts/groq-observer.ts` (records status, finish_reason and tokens per call; never headers or keys).
  - `npm run eval -- --label calibration|counted-1|counted-2 [--cases file] [--out folder]`. Reports go to `docs/evals/<date>-<label>.md` and `.json`.
- **Checks:** `npm test`: 471 passed, 2 expected failures (C16, C22 known search misses). `npm run lint`, `npx tsc --noEmit` and `npm run build` pass.

## What's next
See "Start here next session", steps c) to f). Notes for them:
- Day 3 is done when a full question → answer → Yes/No loop works in the browser. Day 4 is done when the billing page matches a hand-counted 10-question session in the browser (the same session already passes as a unit test).
- Day 5: Chinmay fills in the "Adds unsupported detail?" column by hand. Counted runs need the same fingerprint. A held-out file outside the repo can be used with `--cases`; use `--out` with a folder outside the repo too, so its questions never land in the repo.

## Calibration run 2026-11-28 (practice, not counted): to review
- **Status:** INCOMPLETE, stopped at C37 ("My Tallyfox Pay payout still hasn't arrived after 5 days"): the AI call timed out at the 15 s limit. C38–C50 were not run.
- **Core so far (pass bars not judged because incomplete):** wrong answers 0 of 40; answer cases correct 22 of 27 (bar at least 24); hard-rule cases handed over 6 of 6 (all 6 with exactly the expected rule); unneeded handovers 5 of 27 (bar at most 5); off-topic declined 0 of 4 (none reached).
- **Unneeded handovers:** C01, C08 and C14 as `quote_not_found` (the AI's quote wasn't one whole sentence of a cited article); C16 and C22 as `ai_unsure` (the known search misses).
- **Unsure cases:** C18 unneeded handover (`ai_unsure`), C35 correct.
- **Noticed in the report, not changed:**
  - The report counts 30 AI calls; 31 were sent. A timed-out call returns no reply, so the token counter doesn't see it.
  - A `quote_not_found` handover keeps no record of which article and quote the AI gave, so the report can't show why C01, C08 and C14 failed.
  - All answered cases still need Chinmay's hand score in the "Adds unsupported detail?" column. C23 again says the reset link is "sent to your email", which A21 doesn't say (same as Day 2b).

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
- C44: long questions dilute keyword search (A01 mentions logo but scores below A12/A17/A07). Second search weakness after the vocabulary gap.
- A question is recorded (and counted toward the cap) when its reply arrives. If the tab is closed while waiting, that question is not counted.
