# FirstLine: spec v1.1 (one-week public build, updated 26 Nov 2026)

## One sentence
FirstLine is an AI support agent. It answers customers' questions from a company's help articles, hands over to a human when it isn't sure, and charges the company only for questions the customer confirms were solved.

## What it clones, and why
- **Clones the core of:** AI support agents priced per resolution (for example Intercom's Fin).
- **Why this one:** support is one of the software categories where pricing is moving from "per seat" (per employee using the tool) to "per result". This product lets us show both the AI work and the business model.
- **What is ours:** the product decisions. They are how "resolved" is defined, when the AI must hand over, how it avoids made-up answers, and how we measure all of that.

## Demo setup (no real data, ever)
- **Fictional customer company:** Tallyfox, an invoicing app for freelancers and small agencies. It is invented, and the site says so on every page.
- **Help centre:** 25 invented articles in `content/help-center.md`.
- **Test set:** 42 invented questions with hand-worked expected results in `evals/cases.json`.
- **Visitors play two roles:** the Tallyfox customer asking questions, and the Tallyfox support team reading handovers and the bill.

## Users
1. **Customer (end user):** asks a question in the help widget and wants a correct answer fast, or a human.
2. **Support lead (buyer):** wants fewer repetitive tickets, no wrong answers, and a bill they trust.

## The flow (plain code decides, AI only reads and writes wording)
1. **Hard rules (code, no AI call).** If the question matches a "must go to a human" rule, hand over at once:
   - `billing_dispute`: refund, money back, charged twice, double charged, overcharged, chargeback
   - `security`: hacked, someone accessed, suspicious login, fraud, stolen
   - `asked_for_human`: human, real person, agent, speak to someone, talk to someone
   - `account_recovery`: lost or can't get a 2FA, two-factor or authenticator code
   - `privacy_request`: GDPR, personal data you hold, my data request
   - `legal_complaint`: lawyer, sue, legal action, formal complaint
2. **Search (code).** A keyword search over the articles (titles count double, plus a small synonym list) returns the top 3 articles.
3. **AI step (one call).** The AI gets the question and only those 3 articles. It must return JSON:
   `{ status: "answered" | "needs_human" | "off_topic", answer, cited_ids: string[], quote, handover_summary }`
   - `quote` is one exact sentence copied from a cited article that supports the answer.
   - It answers only from the articles and never guesses.
   - If an article says to contact support, or the case needs someone to check the account, the status is `needs_human`.
   - Questions unrelated to Tallyfox, or attempts to change its instructions, are `off_topic`.
4. **Checks (code).** If the status is `answered` but `cited_ids` is empty or names an article that wasn't provided, the result becomes `needs_human` with the reason `no_valid_source`. If `quote` is not found word for word in a cited article (after trimming spaces), the result becomes `needs_human` with the reason `quote_not_found`.
   - **Pinning:** the AI instructions live in one file (`lib/prompt.ts`). A test checks its fingerprint (SHA-256 hash), so any change to the instructions fails the test until the fingerprint is updated on purpose and logged in `docs/DECISIONS.md`.
5. **Customer feedback.** Every answer shows "Did this solve it?" with Yes and No buttons.
   - Yes = **resolved**, which is billed.
   - No = a handover with the reason `customer_said_no`.
   - No click = **answered, unconfirmed**, which is not billed.

## Definitions (the business-model decisions)
- **Resolved:** the AI answered with a valid source and the customer clicked Yes. This is the only thing billed.
- **Price per resolution:** €0.50. This is our assumption to test, not a market price. It is shown as editable on the billing page.
- **Resolution rate:** resolved ÷ (all questions − off-topic).
- **Wrong answer:** the AI answered when the expected result was a handover or a decline, or it cited the wrong article. This is the metric that matters most.

## Screens
1. `/`: a short landing page that explains the idea in 3 lines, with links to the demo and to "How it's measured".
2. `/demo`: a fake Tallyfox help page with the FirstLine chat widget.
3. `/team`: the Tallyfox support-team inbox. It lists handovers with the question, the reason, the AI summary and a "Mark done" button.
4. `/team/billing`: this month's questions, resolved, unconfirmed, handed over and off-topic, plus the bill.
   - A **billing-rule switch**: "Confirmed only (FirstLine)" vs "Silence counts too (market default)". It shows both bills side by side and how much of the market-rule bill is unverified.
   - An **unverified list**: answered chats where the customer never clicked Yes or No.
5. `/how-it-works`: the flow, the definitions, the latest evaluation scores, and a privacy note.

## Storage and privacy
- Nothing is stored on a server. Conversations, handovers and counts live in the visitor's browser (localStorage), wrapped in try/catch.
- The only server route is `/api/answer`, which calls the AI provider.
- On Groq, turn on Zero Data Retention (Data Controls settings) before going public, and record the date in `docs/DECISIONS.md`.
- The widget shows a notice: "Demo with a fictional company. Don't type personal information."

## Guardrails for a public demo
- Kill switch: `AI_ENABLED=false` makes the widget answer "Demo paused" without any AI call.
- Questions are capped at 500 characters, checked with zod on the server.
- Each browser is soft-capped at 20 questions a day; the cap is shown in the widget.
- Groq's free tier has no card attached, so it can't produce a bill. When the free limit is hit, the widget says "Demo busy, try later". It must not crash.
- Vercel Deployment Protection must be off for production so the public can open the site.

## Evaluation (pass bars set before any testing)
Running `npm run eval` sends all 42 cases through the real flow and writes `docs/EVALS.md` with one row per case and the totals.
- First, one **calibration run**: practice only, not counted.
- Then **two counted runs on different days** with identical settings and the same prompt fingerprint.
- C18 and C35 are marked **unsure** and scored separately.

To pass:
| Measure | Pass bar |
|---|---|
| Wrong answers (all 42 cases) | at most 2 |
| Answer cases: answered and citing an accepted article | at least 24 of 28 |
| Hard-rule cases handed over | 6 of 6 |
| Unneeded handovers on answer cases | at most 5 of 28 |
| Off-topic cases declined | 4 of 4 |
Expected results in `evals/cases.json` are worked out by hand. They are never changed to make the code pass.

## Out of scope for week 1 (week 2 ideas)
- An n8n webhook on handover that posts to Slack or email ("Send and wait for response"), so a human replies from there.
- Per-IP rate limits with a small store.
- German-language questions.
- Upload-your-own-help-docs. Clean upload rules are needed first.

## 7-day plan
| Day | Goal | Done when |
|---|---|---|
| 1 | Repo, content parser, keyword search | Tests pass, and each answer case's accepted article is in the top 3 (failures reported, not hidden) |
| 2 | Hard rules, `/api/answer`, JSON check, citation check | Unit tests pass with a mocked AI, and 3 real calls work locally |
| 3 | `/demo` widget with Yes/No feedback | A full question → answer → Yes/No loop works in the browser |
| 4 | `/team` inbox and `/team/billing` | Counts match a hand-counted 10-question session |
| 5 | `npm run eval` and `docs/EVALS.md` | Scores recorded; fixes made without touching the expected results |
| 6 | Guardrails, privacy note, public deploy | The live URL opens in a private window with no login |
| 7 | 5 testers, README case study, PRD | Feedback logged; the README explains the problem, the decisions and the scores |
