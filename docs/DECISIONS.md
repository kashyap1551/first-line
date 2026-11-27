# Decisions

- 2026-11-26: Product = FirstLine, AI support agent with auditable per-resolution billing. Demo company Tallyfox (fictional).
- 2026-11-26: Resolved = customer clicked Yes. Silent chats shown as unverified, never billed.
- 2026-11-26: Answers must carry an exact quote found word for word in a cited article, else handover (quote_not_found).
- 2026-11-26: AI instructions pinned by a SHA-256 fingerprint checked in tests.
- 2026-11-26: Evals: 1 calibration run, then 2 counted runs on different days; C18 and C35 scored as unsure.
- 2026-11-27: C16 and C22 accepted as known search misses (vocabulary gap: customers say "dollars"/"backup", articles say "USD"/"export"). Not fixed by synonyms tuned to test questions. Expected product behaviour: no supporting article, so needs_human (unneeded handover, the safer error), not a wrong answer. Eval pass bar unchanged (at least 24 of 28).
- 2026-11-27: Search change "words of 6+ letters match on their first 6 letters" was chosen after seeing failures. It will be checked on eval day against held-out questions that are not in the repo.
- 2026-11-27: PRD Q1 decided: non-English questions are handed to a human (reason language_not_supported). The AI reports the question's language; code decides.
- 2026-11-27: Groq: separate project "first-line" in the existing account; Inference APIs Zero Data Retention enabled on 2026-11-27. Rate limits are shared across the organisation with Career Co-pilot. Processing country still unrecorded (PRD Q6 stays open).
- 2026-11-27: AI failures (error, timeout, rate limit) show "Demo busy, try later", with no automatic retries and no billing.
- 2026-11-27: Hard rule account_recovery = a loss phrase ("lost", "can't get", "cannot access", "no longer have") plus a two-factor word (2FA, two-factor, two factor, authenticator). The word "code" is not required.
- 2026-11-27: Mixed-language questions: code uses the language the AI reports. If it isn't "en", the question is handed to a human.
