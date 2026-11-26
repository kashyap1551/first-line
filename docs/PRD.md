# FirstLine PRD: sections 1–4 (draft v0.2, 26 Nov 2026)

Status: draft for review by Chinmay. Sections 5–14 come after the open questions in section 4.4 are answered.
Labels: **[V]** = verified in our Nov 2026 market research. **[A]** = assumption we still need to check.

---

## 1. Problem

### 1.1 The painful moment (one person, one moment) [A]
It's Monday, 9:00. Lena is the only support person at a 20-person software company that sells an invoicing app to freelancers. Over the weekend, 40 chats came in. About half ask things the help centre already answers: "Can I pay with PayPal?", "How do I change my invoice numbers?", "Can a client accept an estimate online?" Each one takes her 3 to 5 minutes: read it, find the right article, paste the link, write a friendly line. Meanwhile a customer who was charged twice waits until the afternoon and leaves an angry review.

*This moment is built from market patterns, not from an interview. The numbers (40 chats, half repeats, 3–5 minutes) are guesses until Q3 and Q4 are answered.*

### 1.2 How it's solved today, and what that costs
| Today's fix | What it costs |
|---|---|
| A help centre with a search box | Customers don't read it; they ask in chat anyway. |
| Saved replies (pre-written answers) | It's still a human reading and choosing every message. |
| Hiring more support staff | A salary for work that is mostly repeats. |
| An AI support bot from a big support platform | A per-seat or per-resolution price **[V: vendors are moving to per-resolution pricing]**. Wrong answers that sound confident damage trust **[A]**. It's hard to check what you're billed for **[A]**. |

### 1.3 Why now
- AI models can now read a few help articles and write a short, plain answer for a fraction of a cent. That wasn't cheap or reliable enough a few years ago.
- Pricing "per result" instead of "per seat" became mainstream in 2025–26, and support is one of the most exposed categories **[V]**. Defining a "result" that buyers trust is now a live product problem.
- **The billing gap [V]:** the market leader (Intercom Fin, $0.99 per resolution) counts a chat as resolved when the customer confirms it, *or* when they leave without asking for more help. A chat where the customer goes quiet for 24 hours counts as an "assumed resolution". So a customer who gave up can be billed as a success. Buyers have complained about this on Intercom's own community forum.

### 1.4 How we'd know the problem is real
- **Secondhand signals [V]:** big vendors launched per-resolution pricing, and AI support tools are among the fastest-growing in company spending.
- **Direct evidence (none yet):**
  - Talk to 3 people who do support at a small software company (Q3).
  - Count repeated questions in 2–3 public help centres or community forums.
  - Read public reviews of AI support bots for complaints about wrong answers or confusing bills.

---

## 2. User

### 2.1 First user, narrowly
- **Buyer: a support lead at a small software company.** That means 5–50 employees, 1–3 support staff, an English help centre of 20–100 articles, and customers who ask in a chat widget.
- **End user: that company's customer,** for example a freelancer using the invoicing app who is stuck in the middle of a task.

### 2.2 What they know and don't know
| | Knows | Doesn't know |
|---|---|---|
| Support lead | The product, the common questions, which topics are risky (refunds, security) | How many questions AI could answer safely; what it would cost; how to check the AI isn't inventing answers |
| Customer | Their problem, in their own words ("estimate", "get my money back") | What the article is called, or where it is |

### 2.3 Device and situation
- **Support lead:** on a laptop at work, checking the handover inbox and the monthly bill.
- **Customer:** in a laptop or phone browser, inside the product. They want an answer in under a minute, or a human.

### 2.4 Explicitly NOT the user for now
- **Large companies.** They need user permissions, many languages and integrations.
- **Companies without written help articles.** There's nothing to answer from.
- **Regulated support** such as health, banking or insurance. A wrong answer costs too much.
- **Phone and email support.**
- **Non-English questions.** The policy is still open; see Q1.

---

## 3. Value promise

### 3.1 One sentence
After using FirstLine, a support lead can let AI answer the repeat questions their help articles already cover, without made-up answers, and pay only for the ones customers confirm were solved.

### 3.2 The "oh, that's useful" moment
1. The customer asks "Can a client accept an estimate online?" They get a two-sentence answer with the exact line from the article and a link to it.
2. They type "I was charged twice, refund me". It goes straight to a human with a one-line summary, with no AI guess.
3. The support lead opens the bill and sees that only the confirmed answers are charged.

### 3.3 What FirstLine will NEVER claim or do
- It never answers beyond what the help articles say. If an article doesn't cover the question, it hands over.
- It never decides that a question is solved. The customer decides, with the Yes or No button.
- It never handles refunds, billing disputes, security issues, lost two-factor access, privacy requests or legal complaints. Those always go to a human.
- It never pretends to be a human. The widget is labelled "AI assistant". **[V: the EU AI Act's transparency duty for AI that talks to people applies from 2 Aug 2026.]**
- It never claims "GDPR compliant" or any accuracy beyond the latest measured evaluation score.

---

## 4. Scope

### 4.1 MVP: the smallest version that delivers the promise
1. A help widget on a fake Tallyfox page. Tallyfox is an invented invoicing app with 25 invented articles.
2. Hard rules in plain code that send risky topics to a human without calling the AI.
3. Keyword search that picks the top 3 articles.
4. One AI call that answers only from those 3 articles. It must return the article ID and an exact supporting line, and code checks that line word for word (see 4.5).
5. "Did this solve it?" Yes or No. Only Yes counts as resolved and billed.
6. A support-team inbox with each handover's question, reason and summary.
7. A billing page that counts resolved, unconfirmed, handed-over and off-topic questions, and works out the bill.
8. An evaluation run (`npm run eval`) against the hand-written answer key in `evals/cases.json`.

### 4.2 Non-goals (deliberately left out)
| Left out | Why |
|---|---|
| Uploading your own help docs | Needs upload rules and privacy text first; invented data only for now |
| Humans replying from Slack or email (n8n) | Not needed to prove the promise; week 2 |
| Accounts and login | Visitors play both roles; nothing personal is stored |
| Real payments | The bill is a calculation, not a charge; Vercel Hobby is for non-commercial use |
| Tracking or analytics on visitors | No spying; demo use is never counted as real use |
| Email, phone or voice channels | One channel is enough to prove the model |

### 4.3 Later list (parked 26 Nov 2026)
- n8n handover to Slack or email with "send and wait for response". Parked because it's not needed for the core promise.
- Per-IP rate limits using a small store. Parked because a per-browser cap plus the free-tier ceiling is enough for a demo.
- German and mixed-language questions. Parked until Q1 is decided.
- Upload-your-own-docs. Parked until the privacy page and upload rules exist.
- A comparison with per-seat pricing on the billing page. Parked as a nice-to-have.

### 4.4 Open questions
| # | Question | Owner | Decide by |
|---|---|---|---|
| Q1 | Non-English questions: hand over, decline, or try to answer? | Chinmay | 27 Nov (before Day 2) |
| Q2 | ~~Is "resolved = customer clicked Yes" the definition?~~ **Decided 26 Nov:** yes. Silent chats are shown as "unverified" and never billed. | Chinmay | Done |
| Q3 | Who are 3 people who do support at a small software company that I can ask this week? | Chinmay | 2 Dec |
| Q4 | Are the moment's numbers (40 chats, half repeats, 3–5 min each) close to reality? | Chinmay, from Q3 | 2 Dec |
| Q5 | Is the €0.50 per resolution assumption reasonable to a support lead? | Chinmay, from Q3 | 2 Dec |
| Q6 | Groq processing country, and is Zero Data Retention turned on? | Builder checks, Chinmay records | 2 Dec (Day 6) |
| Q7 | Does a non-commercial portfolio site in Germany need an Impressum (legal notice page)? | Chinmay | 2 Dec |
| Q8 | Do the names "FirstLine" and "Tallyfox" clash with real products? | Chinmay | 1 Dec |

### 4.5 Gaps the framework found in SPEC v1 (now in SPEC v1.1)
1. **Evidence check.** The AI must also return one exact supporting line, and code checks it appears word for word in the cited article. If it doesn't, the question goes to a human with the reason `quote_not_found`.
2. **Pinning.** A fingerprint (hash) of the AI instructions is stored, and a test fails if the instructions change without the fingerprint being updated on purpose.
3. **Eval runs.** One calibration run first (practice, not counted), then two counted runs on different days with identical settings.
4. **Hard cases.** Add test cases for very short input, very long input, messy formatting, a German question, a mixed-language question and a hidden-instruction trap. Their expected results depend on Q1.
5. **Unsure items.** Mark C18 (VAT rate) and C35 (editing a past receipt) as "unsure" and score them separately.
