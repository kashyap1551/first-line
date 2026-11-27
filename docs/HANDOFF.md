# Handoff

## Start here next session
1. Read CLAUDE.md, then this file, then docs/DECISIONS.md.
2. Chinmay's manual steps before any real AI call: (a) Groq console: set the first-line project's limits below the organisation limits; (b) approve the AI instruction text and request body (fingerprint b6cbcebee5df9b5846fc85e02423ecdc0c46b42ae5e23b47f68e4a6f8fd0c2e0) in his reviewer chat.
3. Then Day 2b: first check that `npm run dev` works with the ?raw help-centre loading, then 3 real calls (C06, C35, C39) and the Day 2b checks listed below.
Branch day2-answer-step is pushed but NOT merged; it merges to main via a pull request only after Day 2b passes and Chinmay says go.

## Where we stopped
- **Date:** 2026-11-27
- **Branch:** `day2-answer-step` (from `main` at `3896635`, the merge of PR #1).
- **Latest code commit:** `00c77a4` "day 2a.1: review fixes (whole-sentence quote, request fingerprint, narrower charge rule)". Then `085443b` "docs: day 2a.1 handoff" and "docs: end-of-day handoff (27 Nov)" (this note).
- **Pushed:** `day2-answer-step` pushed to origin on 2026-11-27 and tracking `origin/day2-answer-step`. NOT merged. `main` was not pushed or changed (still `3896635`).
- **Real AI calls made:** none. Every test uses a fake AI.

## What works
- `lib/rules.ts`: the 6 hard rules, whole words and phrases, any letter case, word forms written out by hand. `billing_dispute` no longer fires on "charge twice" / "charges twice". C29–C34 each fire exactly their rule; the other 36 cases fire none.
- `lib/prompt.ts`: the AI instructions (covers all 6 hard-rule topics, the partial-answer rule, one complete sentence as the quote). Question and articles go in `<question>` / `<article id="…">` blocks; `<` and `>` inside them are neutralised.
- `lib/groq-request.ts`: the exact request body (model `openai/gpt-oss-120b`, temperature 0, 500 output tokens, seed 20261127, `reasoning_effort: "low"`, `include_reasoning: false`, JSON format). Pinned by request fingerprint `b6cbcebee5df9b5846fc85e02423ecdc0c46b42ae5e23b47f68e4a6f8fd0c2e0`.
- `lib/quote.ts`: the quote must equal one whole sentence of a cited article (spaces ignored, a missing final mark allowed).
- `lib/answer.ts`: the full order (validate → kill switch → hard rules → top 3 search → one AI call with 15 s limit → JSON check → language → off-topic → needs_human → source check → whole-sentence quote check). A failed AI call logs only `{ type, status }`.
- `lib/help-centre.ts`: the help centre is built into the code at build time (Turbopack `?raw` text rule in `next.config.ts`).
- `app/api/answer/route.ts`: `POST { question }`. 400 for a rejected question, 200 otherwise.
- `npm test`: 281 passed, 2 expected failures (C16, C22 known search misses). `npm run lint`, `npx tsc --noEmit` and `npm run build` pass.

## What's next: Day 2b (only after both steps below)
1. **Chinmay, in the Groq console:** set the "first-line" project's rate limits below the organisation limits, so FirstLine can never use up the shared 200,000 tokens/day that Career Co-pilot needs.
2. **Chinmay:** approve the AI instruction text in `lib/prompt.ts` and the request body. Any change means a new fingerprint and a line in `docs/DECISIONS.md`.
3. Then 3 real calls locally through `/api/answer`, for example C06 (answer), C35 (should be needs_human) and C39 (off-topic).

## Day 2b checks
- Try a JSON schema response format (Career Co-pilot uses it on the same model). Keep the zod check either way.
- Do `reasoning_effort` and `include_reasoning` work as expected, and is 500 tokens enough? Does Groq really report bad JSON as 400 `json_validate_failed`?
- C16 and C22 should end as needs_human. C23 ("I forgot my password") must be answered from A21. C03 must be answered with A04's whole sentence.

## Later days
- **Day 3:** show the quote under every answer. Code checks only the quote, not the answer text.
- **Day 5:** the eval scores, by hand, whether each answer adds anything not in the articles (no AI judge).
- **Day 6:** the per-browser cap of 20 questions a day, before deploying.

## Open questions
- **PRD Q3, Q4, Q5** (talk to 3 support people; check the numbers and price) due 2 Dec.
- **PRD Q6** (Groq processing country) due 2 Dec. Zero Data Retention was turned on 2026-11-27. **Q7** (Impressum) due 2 Dec. **Q8** (name clashes) due 1 Dec.

## Later
- Article keywords from real customer wording (vocabulary gap). Parked 2026-11-27: needs real search logs.
