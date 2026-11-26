# Handoff

## Where we stopped
- **Date:** 2026-11-27
- **Branch:** `day1-content-search`
- **Latest code commit:** `6ba9bd3` "day 1: content parser + keyword search (26/28, 2 known misses)". This note is committed right after it as "docs: day 1 handoff".
- **`main`:** still at `9e14a06` "scaffold + spec + content + evals". Nothing merged.
- **Pushed:** nothing. The remote `origin` is added but unused.

## What works
- Next.js app scaffolded. `npm run lint` passes. `npm run build` succeeded on 2026-11-27.
- `lib/content.ts` reads the 25 help articles.
- `lib/search.ts` returns up to 3 articles. For 26 of 28 answer cases an accepted article is in the top 3.
- `npm test`: 43 passed, 2 expected failures (the known misses below).

## Known misses (accepted 2026-11-27, see `docs/DECISIONS.md`)
| Case | Question | Wanted | Why it misses |
|---|---|---|---|
| C16 | Can I invoice in US dollars? | A16 | The article says "USD", never "dollar". A16 lands 5th. |
| C22 | How do I get all my invoices out as a backup? | A20 | The article says "export", never "backup". A20 ranks last of 16 matches. |

Both tests use `it.fails`, so the suite turns red if either one starts passing. First search run was 24 of 28; one general change (words of 6+ letters match on their first 6 letters) fixed C11 and C25.

## How search scores (so counts can be checked by hand)
- Lowercase, drop punctuation and stopwords, drop a final "s" on words longer than 3 letters, apply synonyms.
- Words of 6+ letters also match each other if their first 6 letters are the same.
- Each different question word: 2 points if in the title, plus 1 if in the body. Category is ignored.
- Ties go to the lower article id. Articles scoring 0 are never returned.

## What's next
Day 2 from `docs/SPEC.md`: hard rules in code, `/api/answer`, JSON check, citation check (including the exact-quote check). Done when unit tests pass with a mocked AI and 3 real calls work locally. `lib/prompt.ts` needs its SHA-256 fingerprint test.

## Watch on Day 2
- C16 and C22 are expected to end in `needs_human`, but that is not yet tested. For C22 the search still passes A07 to the AI, and A07 mentions "Download PDF". The AI could answer from it, which would count as a wrong answer. Check both with real calls.

## Open questions
- **PRD Q1** (non-English questions: hand over, decline or answer?) is due 27 Nov, before Day 2.
- **PRD Q3, Q4, Q5** (talk to 3 support people; check the numbers and price) due 2 Dec.
- **PRD Q6** (Groq country and Zero Data Retention) due 2 Dec. **Q7** (Impressum) due 2 Dec. **Q8** (name clashes) due 1 Dec.

## Later
- Article keywords from real customer wording (vocabulary gap). Parked 2026-11-27: needs real search logs.
