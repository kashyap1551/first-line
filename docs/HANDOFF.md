# Handoff

## Where we stopped
- **Date:** 2026-11-27
- **Branch:** `day2-answer-step` (from `main` at `3896635`, the merge of PR #1). `day1-content-search` was deleted after its merge.
- **Latest code commit:** `408861a` "day 2a: hard rules, answer logic, prompt (mocked AI)". This note is committed right after it.
- **Pushed:** nothing.
- **Real AI calls made:** none. Every test uses a fake AI.

## What works
- `lib/rules.ts`: the 6 hard rules. Whole words and phrases, any letter case, word forms written out by hand (refund/refunded, hack/hacked …). C29–C34 each trigger exactly their rule; the other 36 cases trigger none.
- `lib/prompt.ts`: the AI instructions, pinned by SHA-256 fingerprint `c9d2c5c5436d29eedb626330a5104aedcac197d20b98982b6d567cf9eaf3456e`. The question and articles go in `<question>` and `<article id="…">` blocks; `<` and `>` inside them are neutralised.
- `lib/answer.ts`: the full order (validate → kill switch → hard rules → top 3 search → one AI call with 15 s limit → JSON check → language → off-topic → needs_human → source check → quote check).
- `lib/ai-errors.ts`: a Groq 400 `json_validate_failed` becomes handover `ai_invalid_output`; every other error becomes "Demo busy, try later".
- `lib/groq.ts`: the real call (plain fetch, `openai/gpt-oss-120b`, temperature 0, 500 output tokens, JSON format, `reasoning_effort: "low"`, `include_reasoning: false`). Not yet run.
- `app/api/answer/route.ts`: `POST { question }`. Returns 400 for a rejected question, 200 otherwise. Logs nothing.
- `npm test`: 246 passed, 2 expected failures (C16, C22 known search misses). `npm run lint`, `npx tsc --noEmit` and `npm run build` pass.

## What's next: Day 2b (only after Chinmay approves the prompt text)
1. Chinmay reads the full text in `lib/prompt.ts` and approves it, or asks for changes. Any change means a new fingerprint and a line in `docs/DECISIONS.md`.
2. Then 3 real calls locally through `/api/answer`, for example C06 (answer), C35 (should be needs_human) and C39 (off-topic).
3. Check during Day 2b:
   - Do `reasoning_effort` and `include_reasoning` work as expected, and is 500 tokens enough?
   - Does Groq really report bad JSON as 400 `json_validate_failed`?
   - C16 and C22 should end as needs_human (see Day 1 watch note).
   - C23 ("I forgot my password") must still be answered from A21.

## Open questions
- **PRD Q3, Q4, Q5** (talk to 3 support people; check the numbers and price) due 2 Dec.
- **PRD Q6** (Groq processing country) due 2 Dec. Zero Data Retention was turned on 2026-11-27. **Q7** (Impressum) due 2 Dec. **Q8** (name clashes) due 1 Dec.

## Later
- Article keywords from real customer wording (vocabulary gap). Parked 2026-11-27: needs real search logs.
- `content/help-center.md` is read at request time from the project folder. Check that it is included when deploying to Vercel (Day 6).
