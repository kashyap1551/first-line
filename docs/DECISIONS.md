# Decisions

- 2026-11-26: Product = FirstLine, AI support agent with auditable per-resolution billing. Demo company Tallyfox (fictional).
- 2026-11-26: Resolved = customer clicked Yes. Silent chats shown as unverified, never billed.
- 2026-11-26: Answers must carry an exact quote found word for word in a cited article, else handover (quote_not_found).
- 2026-11-26: AI instructions pinned by a SHA-256 fingerprint checked in tests.
- 2026-11-26: Evals: 1 calibration run, then 2 counted runs on different days; C18 and C35 scored as unsure.
- 2026-11-27: C16 and C22 accepted as known search misses (vocabulary gap: customers say "dollars"/"backup", articles say "USD"/"export"). Not fixed by synonyms tuned to test questions. Expected product behaviour: no supporting article, so needs_human (unneeded handover, the safer error), not a wrong answer. Eval pass bar unchanged (at least 24 of 28).
- 2026-11-27: Search change "words of 6+ letters match on their first 6 letters" was chosen after seeing failures. It will be checked on eval day against held-out questions that are not in the repo.
