# Manual browser test list (from the 28 Nov session)

Run `npm run dev` and open http://localhost:3000. Real AI calls: wait about 20 seconds between AI questions (Groq project limit 4,000 tokens per minute, about 1,000 per question). The AI's exact wording can vary.

Chinmay's lettered checks (A–M) refer to his own copy of steps 1–18 below. Status on 28 Nov: A, B, C, E, F, G passed; D and H–M still to do, plus steps 19–27.

## The chat widget (`/demo`)
1. Landing page: "FirstLine", the two lines, a "Try the demo" button that opens `/demo`.
2. `/demo`: "Tallyfox Help Centre" with the badge; 8 category groups (Basics, Billing, Invoices, Payments, Clients, Expenses, Team, Account); clicking a title opens its text. Chat header "Tallyfox support · AI assistant" with the privacy line; under the text box "0/500 · 20 of 20 demo questions left today".
3. Type `Can I pay for Tallyfox with PayPal?` and press Enter (AI): "Checking the help centre…", then the answer, "From the help centre:", the quote "PayPal is not accepted." and the link "Payment methods for your Tallyfox subscription", then "Did this solve it?" Yes/No and a grey demo note. Counter: 19 left. Clicking the link jumps to the article and opens it.
4. Click Yes: "Great, glad that helped." with its own note; the buttons are replaced by "Yes".
5. `I want to stop my subscription` (AI): answered from "Cancel your subscription". Click No: "Sorry about that. I've passed your question… within 1 business day." The answer stays visible; note "You clicked No, so this went to a person and won't be billed."
6. `I was charged twice this month, please refund me`: instant, no AI. "I've passed your question to the Tallyfox team…" with the note "Hard rule: billing disputes and refunds always go to a person (no AI used)."
7. `Can you correct the billing address on the receipt you sent me last March?` (AI): the team message, note "AI couldn't find this in the help articles…".
8. `What's the capital of Australia?` (AI): "I can only help with questions about Tallyfox." with an off-topic note.
9. `Wie kann ich mein Abo kündigen?` (AI): "I can only answer in English for now. I've passed your question to the Tallyfox team." with a non-English note.
10. `Can I talk to a real person?`: instant team message, note "Hard rule: you asked for a person…".
11. Keyboard: Shift+Enter makes a new line, Enter sends. Tab reaches the text box, Send, "Clear demo data" and the Yes/No buttons, each with a visible focus outline.
12. Length (don't send): paste 501 characters; the counter turns red ("501/500"), Send is greyed out, Enter does nothing. Delete one: Send works again. Only spaces: Send stays greyed out.
13. Reload the page: the conversation, the counter and the Yes/No choices are all still there; answered buttons can't be clicked again.
14. "Clear demo data": shows "Are you sure? Yes / Cancel" inside the chat (not a browser pop-up). Cancel keeps everything; Yes empties the chat and the counter goes back to 20.
15. Daily cap (no AI cost): send `I want a refund` repeatedly (each is an instant hard rule). At 0 left the text box is greyed out with "You've reached today's limit of 20 demo questions. Come back tomorrow." Then "Clear demo data" resets it.
16. Phone width (browser developer tools): the chat is on top, full width; the articles are below.
17. "Minimise" folds the chat to its header; "Open chat" brings it back.
18. Two tabs: open `/demo` in a second tab, ask something in the first; the second shows it too and its counter goes down.

## Team pages (`/team`, `/team/billing`)
Start with "Clear demo data". About 8 real AI calls.

19. In `/demo`, in this order:
    1. `Can I pay for Tallyfox with PayPal?` → click Yes
    2. `I forgot my password` → click Yes
    3. `I want to stop my subscription` → no click
    4. `What does the Solo plan cost per year?` → no click
    5. `Where can I download receipts for my Tallyfox subscription?` → click No
    6. `I was charged twice this month, please refund me` (instant, no AI)
    7. `Can you correct the billing address on the receipt you sent me last March?`
    8. `What's the capital of Australia?`
    9. Turn Wi-Fi off, ask `Can a client accept an estimate online?` → "The demo is busy right now…". Turn Wi-Fi back on.
    10. `Wie kann ich mein Abo kündigen?`

    If the AI hands over one of questions 1–5 instead of answering, the numbers below shift; that question then shows in the inbox.
20. `/team`: "Open (4)", newest first: the German question, the receipt-correction question, "charged twice", the receipts question. The receipts card says "Customer clicked No on this answer" and shows FirstLine's answer and its quote.
21. "Mark done" on one card: "Open (3)" and "Done (1)"; the card moves to Done. Reload: it stays done.
22. `/team/billing`: Resolved 2 · Unconfirmed 2 · Handed over 4 (with 4 reason lines) · Off-topic 1 · Not counted 1 · Resolution rate 25%.
23. At 0.50: FirstLine €1.00, market €2.00; under the market bill "€1.00 of this bill (50%) is for chats nobody confirmed."
24. Click "Silence counts too (market default)": the highlight moves to the market bill; both bills stay visible; the 24-hour note is shown.
25. Price: `0.99` gives €1.98 and €3.96; `0,99` gives the same; `abc` shows the red message and the bills keep the last good price.
26. Unverified list: 2 chats (the Solo plan question first, then "stop my subscription"), each with its answer and quote.
27. The nav works on all three pages, with the current page underlined. The team pages look fine at phone width. A second tab on `/team/billing` updates when you answer Yes in `/demo`.
