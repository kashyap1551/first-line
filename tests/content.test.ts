import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseArticles } from "../lib/content";

// Expected values are worked out by hand from content/help-center.md.
const markdown = readFileSync(
  new URL("../content/help-center.md", import.meta.url),
  "utf8",
);

describe("help centre parser", () => {
  const articles = parseArticles(markdown);
  const byId = (id: string) => articles.find((a) => a.id === id);

  it("finds 25 articles", () => {
    expect(articles).toHaveLength(25);
  });

  it("has ids A01 to A25, unique and in order", () => {
    expect(articles.map((a) => a.id)).toEqual([
      "A01", "A02", "A03", "A04", "A05",
      "A06", "A07", "A08", "A09", "A10",
      "A11", "A12", "A13", "A14", "A15",
      "A16", "A17", "A18", "A19", "A20",
      "A21", "A22", "A23", "A24", "A25",
    ]);
  });

  it("A12 title is exactly 'Get paid online with Tallyfox Pay'", () => {
    expect(byId("A12")?.title).toBe("Get paid online with Tallyfox Pay");
  });

  it("A18 category is Expenses", () => {
    expect(byId("A18")?.category).toBe("Expenses");
  });

  it("no article has an empty body", () => {
    const empty = articles.filter((a) => a.body.trim() === "").map((a) => a.id);
    expect(empty).toEqual([]);
  });

  it("stops with an error if an article has no Category line", () => {
    expect(() => parseArticles("## A01 | Title\nBody only.\n")).toThrow(
      /A01.*Category/,
    );
  });
});
