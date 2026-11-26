import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseArticles, type Article } from "../lib/content";
import { search, SYNONYMS, tokenize } from "../lib/search";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const article = (id: string, title: string, body: string): Article => ({
  id,
  title,
  category: "Test",
  body,
});

describe("how text is split into words", () => {
  it("lowercases and strips punctuation", () => {
    expect(tokenize("Invoice, SENT!")).toEqual(["invoice", "sent"]);
  });

  it("drops stopwords", () => {
    expect(tokenize("What is the fee?")).toEqual(["fee"]);
  });

  it("strips a trailing s only on words longer than 3 letters", () => {
    expect(tokenize("clients pays gas")).toEqual(["client", "pay", "gas"]);
  });

  it("maps a synonym to the help centre word", () => {
    expect(tokenize("estimates")).toEqual(["quote"]);
  });

  it("has at most 20 synonym pairs", () => {
    expect(Object.keys(SYNONYMS).length).toBeLessThanOrEqual(20);
  });
});

describe("ranking", () => {
  it("a title match counts double", () => {
    const articles = [
      article("T01", "Alpha", "Zebra"),
      article("T02", "Zebra", "Alpha"),
    ];
    const [first, second] = search("zebra", articles);
    expect(first.id).toBe("T02");
    expect(second.id).toBe("T01");
    expect(first.score).toBe(2 * second.score);
  });

  it("matches related word forms that share their first 6 letters", () => {
    const articles = [
      article("T01", "Reminders", "Nothing"),
      article("T02", "Other", "Integration"),
    ];
    expect(search("remind", articles)).toEqual([{ id: "T01", score: 2 }]);
    expect(search("integrate", articles)).toEqual([{ id: "T02", score: 1 }]);
  });

  it("does not match words that only share a shorter start", () => {
    const articles = [article("T01", "Contain", "Planet")];
    // "contact" and "contain" share 5 letters; "plan" is under 6 letters.
    expect(search("contact plan", articles)).toEqual([]);
  });

  it("returns at most 3 articles, best first, ties by id", () => {
    const articles = [
      article("T01", "Other", "Nothing"),
      article("T02", "Other", "Zebra"),
      article("T03", "Zebra", "Nothing"),
      article("T04", "Zebra", "Zebra"),
      article("T05", "Other", "Zebra"),
    ];
    expect(search("zebra", articles).map((r) => r.id)).toEqual([
      "T04",
      "T03",
      "T02",
    ]);
  });

  it("never returns an article that matches nothing", () => {
    const articles = [
      article("T01", "Other", "Nothing"),
      article("T02", "Other", "Zebra"),
    ];
    expect(search("zebra", articles).map((r) => r.id)).toEqual(["T02"]);
    expect(search("giraffe", articles)).toEqual([]);
  });
});

describe("answer cases from evals/cases.json", () => {
  type Case = {
    id: string;
    question: string;
    expected: string;
    accepted_ids: string[];
  };
  const articles = parseArticles(read("../content/help-center.md"));
  const cases: Case[] = JSON.parse(read("../evals/cases.json")).cases;
  const answerCases = cases.filter((c) => c.expected === "answer");

  // Accepted on 2026-11-27 (see docs/DECISIONS.md). it.fails keeps them visible
  // and turns the suite red if either one ever starts passing.
  const knownMisses: Record<string, string> = {
    C16: "C16 known miss: customer says dollars, article says USD",
    C22: "C22 known miss: customer says backup, article says export",
  };

  const expectAcceptedInTop3 = ({ question, accepted_ids }: Case) => {
    const top = search(question, articles);
    const found = top.some((r) => accepted_ids.includes(r.id));
    const got = top.map((r) => `${r.id}=${r.score}`).join(", ");
    expect(found, `wanted ${accepted_ids.join("/")}, got ${got}`).toBe(true);
  };

  it("there are 28 answer cases", () => {
    expect(answerCases).toHaveLength(28);
  });

  it.each(answerCases.filter((c) => !Object.hasOwn(knownMisses, c.id)))(
    "$id: an accepted article is in the top 3",
    expectAcceptedInTop3,
  );

  for (const [id, name] of Object.entries(knownMisses)) {
    // Looked up outside the test, so a missing case cannot count as a "miss".
    const known = answerCases.find((c) => c.id === id);
    if (!known) throw new Error(`Known miss ${id} is not an answer case`);
    it.fails(name, () => expectAcceptedInTop3(known));
  }
});
