import { describe, expect, it } from "vitest";
import { articles } from "../lib/help-centre";
import { isWholeSentence, splitSentences } from "../lib/quote";

const body = (id: string) => articles.find((a) => a.id === id)!.body;

describe("splitting an article into sentences", () => {
  it("A12 is 5 sentences; '1.5%' and '€0.25' do not split", () => {
    // Counted by hand from content/help-center.md.
    expect(splitSentences(body("A12"))).toEqual([
      "Tallyfox Pay lets your clients pay an invoice by card from the invoice link.",
      "The fee is 1.5% + €0.25 per payment with an EU card.",
      "Money is paid out to your bank account 2 business days after the payment.",
      "Tallyfox Pay accepts payments in EUR and GBP only.",
      "To set it up, go to Settings → Payments; you will need to verify your identity before your first payout.",
    ]);
  });

  it("A07 is 4 sentences; 'invoices@tallyfox.example' does not split", () => {
    expect(splitSentences(body("A07"))).toEqual([
      "Go to Invoices → New invoice.",
      "Choose a client, add line items with a description, quantity and price, and set a due date.",
      'Click "Send by email" to send it from invoices@tallyfox.example with a payment link, or click "Download PDF" to send it yourself.',
      "Unsent invoices are saved as drafts.",
    ]);
  });

  it("splits after ! and ? too, and keeps a last sentence with no mark", () => {
    expect(splitSentences("Yes! Really?  Fine.\nNo mark")).toEqual([
      "Yes!",
      "Really?",
      "Fine.",
      "No mark",
    ]);
  });

  it("every help-centre sentence starts with a capital letter, digit or quote mark", () => {
    // Guards against a split in the middle of a sentence, such as after "e.g.".
    for (const article of articles) {
      for (const sentence of splitSentences(article.body)) {
        expect(sentence, `${article.id}: ${sentence}`).toMatch(/^[A-Z0-9"(]/);
      }
    }
  });
});

describe("a quote must be one whole sentence", () => {
  const A04 = body("A04");
  const A06 = body("A06");

  it("a whole sentence passes", () => {
    expect(isWholeSentence("PayPal is not accepted.", A04)).toBe(true);
  });

  it("a whole sentence without its final full stop passes", () => {
    expect(isWholeSentence("PayPal is not accepted", A04)).toBe(true);
  });

  it("a fragment of a sentence fails", () => {
    expect(isWholeSentence("your account moves to the Free plan.", A06)).toBe(
      false,
    );
  });

  it("two sentences joined fail", () => {
    expect(
      isWholeSentence(
        "Go to Settings → Billing → Cancel plan. You keep your paid features until the end of the current billing period, and then your account moves to the Free plan.",
        A06,
      ),
    ).toBe(false);
  });

  it("extra spaces and line breaks are ignored", () => {
    expect(isWholeSentence("  PayPal  is\nnot accepted. ", A04)).toBe(true);
  });

  it("a different final mark fails", () => {
    expect(isWholeSentence("PayPal is not accepted?", A04)).toBe(false);
  });

  it("an empty quote fails", () => {
    expect(isWholeSentence("", A04)).toBe(false);
    expect(isWholeSentence(" \n ", A04)).toBe(false);
  });
});
