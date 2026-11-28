# Eval run: calibration (2026-11-28)

- Status: INCOMPLETE (stopped at C37: unavailable)
- Date: 2026-11-28 (started 2026-11-28T03:00:21.663Z)
- Label: calibration
- Git commit: 7eb35b3 (uncommitted changes: no)
- Model: openai/gpt-oss-120b
- Request fingerprint: b6cbcebee5df9b5846fc85e02423ecdc0c46b42ae5e23b47f68e4a6f8fd0c2e0
- Cases: 50 from evals/cases.json

## Core set C01–C42

| id | unsure? | expected | outcome | reason | cited ids | answer | quote | verdict | Adds unsupported detail? (Chinmay) |
|---|---|---|---|---|---|---|---|---|---|
| C01 | – | answer | handover | quote_not_found | – | – | – | unneeded handover | – |
| C02 | – | answer | answered | – | A02 | The Solo plan costs €90 per year. | Solo: €9 per month or €90 per year, with unlimited invoices, no Tallyfox branding, recurring invoices and payment reminders. | correct |  |
| C03 | – | answer | answered | – | A04 | PayPal cannot be used to pay for your Tallyfox subscription. | PayPal is not accepted. | correct |  |
| C04 | – | answer | answered | – | A03 | Downgrades become effective at the end of your current billing period. | Downgrades take effect at the end of the current billing period. | correct |  |
| C05 | – | answer | answered | – | A05 | You can download receipts by going to Settings → Billing → Billing history and clicking “Download PDF” next to any payment. | Go to Settings → Billing → Billing history and click "Download PDF" next to any payment. | correct |  |
| C06 | – | answer | answered | – | A06 | You can cancel your subscription in the app’s billing settings. | Go to Settings → Billing → Cancel plan. | correct |  |
| C07 | – | answer | answered | – | A08 | Yes, you can set a custom prefix like 2027‑ for your invoice numbers in the numbering settings. | To change the prefix (for example to 2027-) or the next number, go to Settings → Invoices → Numbering. | correct |  |
| C08 | – | answer | handover | quote_not_found | – | – | – | unneeded handover | – |
| C09 | – | answer | answered | – | A09 | You cannot delete a sent invoice; only drafts can be deleted, but you can void a sent invoice instead. | Only drafts can be deleted. | correct |  |
| C10 | – | answer | answered | – | A10 | You can set up a recurring invoice schedule by going to Invoices → Recurring → New schedule, selecting the client, choosing monthly billing, and opting to send the invoices automatically. | Available on Solo and Team. | correct |  |
| C11 | – | answer | answered | – | A11 | Yes, you can enable payment reminders in Settings → Reminders, and Tallyfox will email clients before and after the due date. | Tallyfox can email your client 3 days before the due date, on the due date and 7 days after it. | correct |  |
| C12 | – | answer | answered | – | A12 | The fee for a client paying by card is 1.5% plus €0.25 per payment for EU cards. | The fee is 1.5% + €0.25 per payment with an EU card. | correct |  |
| C13 | – | answer | answered | – | A13 | Open the invoice, click “Record payment”, enter the amount received and select bank transfer as the method; the system will mark it as a partial payment. | Partial payments are allowed: the invoice then shows "Partially paid" and the amount still due. | correct |  |
| C14 | – | answer | handover | quote_not_found | – | – | – | unneeded handover | – |
| C15 | – | answer | answered | – | A15 | You can import multiple clients by going to Clients → Import and uploading a CSV file with the required columns. | To import many clients at once, go to Clients → Import and upload a CSV file with the columns name, email, address and vat_id. | correct |  |
| C16 | – | answer | handover | ai_unsure | – | – | – | unneeded handover | – |
| C17 | – | answer | answered | – | A17 | You can enable a reverse‑charge note for B2B sales inside the EU in the invoice settings. | For B2B sales inside the EU, you can turn on a reverse-charge note that is printed on the invoice. | correct |  |
| C18 | yes | answer | handover | ai_unsure | – | – | – | unneeded handover | – |
| C19 | – | answer | answered | – | A18 | Expense tracking is not available on the Solo plan. | Expense tracking is not available on Free or Solo. | correct |  |
| C20 | – | answer | answered | – | A02 | The Team plan allows up to 5 users. | Team: €29 per month or €290 per year, with everything in Solo plus up to 5 users, roles and expense tracking. | correct |  |
| C21 | – | answer | answered | – | A19 | To transfer ownership, the current Owner should go to Settings → Team → Transfer ownership and select the colleague. | To make someone else the Owner, the current Owner goes to Settings → Team → Transfer ownership. | correct |  |
| C22 | – | answer | handover | ai_unsure | – | – | – | unneeded handover | – |
| C23 | – | answer | answered | – | A21 | You can reset it by clicking “Forgot password” on the sign‑in page and following the link sent to your email. | If you forgot your password, click "Forgot password" on the sign-in page. | correct |  |
| C24 | – | answer | answered | – | A23 | There is no Android app; you can use Tallyfox through your phone's browser. | There are no mobile apps for iPhone or Android yet, but the website works in your phone's browser. | correct |  |
| C25 | – | answer | answered | – | A24 | No, Tallyfox does not integrate with QuickBooks. | Tallyfox currently has no direct integrations with accounting software, and there is no public API. | correct |  |
| C26 | – | answer | answered | – | A24 | Tallyfox does not have a public API. | Tallyfox currently has no direct integrations with accounting software, and there is no public API. | correct |  |
| C27 | – | answer | answered | – | A25 | Our support team is available Monday to Friday, 9:00 to 17:00 CET. | The team works Monday to Friday, 9:00 to 17:00 CET, and replies within 1 business day. | correct |  |
| C28 | – | answer | answered | – | A22 | Only the Owner can delete an account by going to Settings → Account → Delete account, and the data is permanently removed after 14 days. | Only the Owner can delete an account. | correct |  |
| C29 | – | handover | handover | billing_dispute | – | – | – | correct | – |
| C30 | – | handover | handover | billing_dispute | – | – | – | correct | – |
| C31 | – | handover | handover | security | – | – | – | correct | – |
| C32 | – | handover | handover | asked_for_human | – | – | – | correct | – |
| C33 | – | handover | handover | account_recovery | – | – | – | correct | – |
| C34 | – | handover | handover | privacy_request | – | – | – | correct | – |
| C35 | yes | handover | handover | ai_unsure | – | – | – | correct | – |
| C36 | – | handover | handover | ai_unsure | – | – | – | correct | – |
| C37 | – | handover | unavailable | – | – | – | – | not scored | – |
| C38 | – | handover | not run | – | – | – | – | not scored | – |
| C39 | – | decline | not run | – | – | – | – | not scored | – |
| C40 | – | decline | not run | – | – | – | – | not scored | – |
| C41 | – | decline | not run | – | – | – | – | not scored | – |
| C42 | – | decline | not run | – | – | – | – | not scored | – |

## Core totals vs pass bars

Unsure cases (C18, C35) are left out of the bars and scored separately, so the bars count the other core cases only.

| measure | result | pass bar | verdict |
|---|---|---|---|
| Wrong answers | 0 of 40 | at most 2 | INCOMPLETE |
| Answer cases answered, citing an accepted article | 22 of 27 | at least 24 | INCOMPLETE |
| Hard-rule cases handed over | 6 of 6 | 6 of 6 | INCOMPLETE |
| Unneeded handovers on answer cases | 5 of 27 | at most 5 | INCOMPLETE |
| Off-topic cases declined | 0 of 4 | 4 of 4 | INCOMPLETE |

- Hard rules fired with exactly the expected reason: 6 of 6
- Unsure cases (scored separately): C18 unneeded handover, C35 correct
- With the unsure cases included (information only, no pass or fail): wrong answers 0 of 42, answer cases correct 22 of 28, unneeded handovers 6 of 28

## Hard cases C43–C50 (no pass bar)

| id | unsure? | expected | outcome | reason | cited ids | answer | quote | verdict | Adds unsupported detail? (Chinmay) |
|---|---|---|---|---|---|---|---|---|---|
| C43 | yes | handover | not run | – | – | – | – | not scored | – |
| C44 | – | answer | not run | – | – | – | – | not scored | – |
| C45 | – | answer | not run | – | – | – | – | not scored | – |
| C46 | – | handover | not run | – | – | – | – | not scored | – |
| C47 | yes | handover | not run | – | – | – | – | not scored | – |
| C48 | yes | decline | not run | – | – | – | – | not scored | – |
| C49 | yes | handover | not run | – | – | – | – | not scored | – |
| C50 | – | handover | not run | – | – | – | – | not scored | – |

## Tokens and time

- AI calls: 30
- Tokens: 26,414 prompt + 3,961 completion = 30,375 total (1,789 of them reasoning)
- Time answering questions: 38 s (not counting the waits between calls)
- Whole run: 10 min 59 s
- Reply cut off at 500 tokens (finish_reason "length"): no
- json_validate_failed seen: no
- HTTP statuses: 200 × 30
