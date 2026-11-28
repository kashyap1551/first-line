# Handoff

## Start here next session
1. Read CLAUDE.md, then this file, then docs/DECISIONS.md.
2. Chinmay's manual steps before any real AI call: (a) Groq console: set the first-line project's limits below the organisation limits; (b) approve the AI instruction text and request body (fingerprint b6cbcebee5df9b5846fc85e02423ecdc0c46b42ae5e23b47f68e4a6f8fd0c2e0) in his reviewer chat.
3. Then Day 2b: first check that `npm run dev` works with the ?raw help-centre loading, then 3 real calls (C06, C35, C39) and the Day 2b checks listed below.
Branch day2-answer-step is pushed but NOT merged; it merges to main via a pull request only after Day 2b passes and Chinmay says go.

## Where we stopped
- **Date:** 2026-11-28
- **Branch:** `day2-answer-step` (from `main` at `3896635`, the merge of PR #1).
- **Commits today:** `d3c8643` "chore: add Next.js AGENTS.md (written by next dev)", then "day 2b: first real calls (results in docs/runs)" (this note). Not pushed today: origin still has `77f3714`. NOT merged. `main` unchanged (`3896635`).
- **Before the calls:** Chinmay set the Groq project limits and approved the instruction text and request body (both logged in `docs/DECISIONS.md`, 2026-11-28). Fingerprint unchanged.
- **Real AI calls made:** 8 (budget 8): C06 through the real route (`npm run dev` + `POST /api/answer`), then C35, C39, C03, C23, C16, C22 and one German question through `scripts/try-real-calls.ts`. C29 made 0 calls (hard rule). All 9 results matched what was expected; 0 wrong answers. Full table: `docs/runs/2026-11-28-day2b.md`.
- **How to run the script (no new packages):** `node --env-file=.env.local -e "import('vite').then(v => v.runnerImport('./scripts/try-real-calls.ts', { configFile: false }))"`. It makes up to 7 real calls and waits 35 s before each.

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
- **Day 3:** show the quote under every answer. Code checks only the quote, not the answer text.
- **Day 5:** the eval scores, by hand, whether each answer adds anything not in the articles (no AI judge).
- **Day 6:** the per-browser cap of 20 questions a day, before deploying.

## Open questions
- **PRD Q3, Q4, Q5** (talk to 3 support people; check the numbers and price) due 2 Dec.
- **PRD Q6** (Groq processing country) due 2 Dec. Zero Data Retention was turned on 2026-11-27. **Q7** (Impressum) due 2 Dec. **Q8** (name clashes) due 1 Dec.

## Later
- Article keywords from real customer wording (vocabulary gap). Parked 2026-11-27: needs real search logs.
