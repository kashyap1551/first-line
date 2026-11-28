# Handoff

## Start here next session
1. Read CLAUDE.md, then this file, then docs/DECISIONS.md.
2. Day 2 (answer step) is done and merged (PR #2). Day 3 (`/demo` widget) is built on branch `demo-widget`, committed, NOT pushed.
3. Next: Chinmay's manual browser test of `/demo` with real AI calls (his own list). Then, after his go, push `demo-widget` and open a pull request. Then Day 4: `/team` inbox and `/team/billing`.

## Where we stopped
- **Date:** 2026-11-28
- **Branch:** `demo-widget` (from `main` at `64dde8b`, the merge of PR #2). `day2-answer-step` was deleted locally and on origin.
- **Commit:** "demo widget: help page, chat, feedback, daily cap" (this note). NOT pushed.
- **Real AI calls today on this branch:** none by Claude. The dev check fetched only `/` and `/demo` (both 200); `/api/answer` was never called.
- **Deliberate breaks done:** removing the `quote_not_found` demo note made "reason quote_not_found has a demo note" fail; letting setFeedback run twice made "works only once: a second click changes nothing" fail. Both restored.

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
- **Checks:** `npm test`: 367 passed, 2 expected failures (C16, C22 known search misses). `npm run lint`, `npx tsc --noEmit` and `npm run build` pass.

## What's next
1. **Chinmay:** manual browser test of `/demo` (real AI calls). Day 3 is done when a full question → answer → Yes/No loop works in the browser.
2. **Day 4:** `/team` inbox (handovers with question, reason, summary, "Mark done") and `/team/billing` (resolved, unconfirmed, handed over, off-topic, the bill, the billing-rule switch). Both read the same browser record (`lib/chat-store.ts`). Done when counts match a hand-counted 10-question session.

## Day 2b checks (results 2026-11-28)
- **JSON schema response format:** not tried today; decide before the Day 5 calibration run. Keep the zod check either way.
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
