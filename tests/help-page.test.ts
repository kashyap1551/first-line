import { describe, expect, it } from "vitest";
import { articles } from "../lib/help-centre";
import { groupByCategory, titlesById } from "../lib/help-page";

// Hand count from the "Category:" lines in content/help-center.md, with the
// categories in the order they first appear.
const EXPECTED = [
  { category: "Basics", ids: ["A01", "A23", "A24", "A25"] },
  { category: "Billing", ids: ["A02", "A03", "A04", "A05", "A06"] },
  {
    category: "Invoices",
    ids: ["A07", "A08", "A09", "A10", "A11", "A14", "A16", "A17"],
  },
  { category: "Payments", ids: ["A12", "A13"] },
  { category: "Clients", ids: ["A15"] },
  { category: "Expenses", ids: ["A18"] },
  { category: "Team", ids: ["A19"] },
  { category: "Account", ids: ["A20", "A21", "A22"] },
];

describe("help page", () => {
  it("groups the 25 articles into 8 categories, in first-seen order", () => {
    expect(
      groupByCategory(articles).map((g) => ({
        category: g.category,
        ids: g.articles.map((a) => a.id),
      })),
    ).toEqual(EXPECTED);
  });

  it("titlesById maps every id to its title", () => {
    const titles = titlesById(articles);
    expect(Object.keys(titles)).toHaveLength(25);
    expect(titles.A04).toBe("Payment methods for your Tallyfox subscription");
    expect(titles.A21).toBe("Sign-in problems and two-factor authentication");
  });
});
