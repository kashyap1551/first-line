import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseArticles } from "../lib/content";
import { articles } from "../lib/help-centre";

describe("the help centre built into the code", () => {
  it("is exactly content/help-center.md", () => {
    const onDisk = readFileSync(
      new URL("../content/help-center.md", import.meta.url),
      "utf8",
    );
    expect(articles).toEqual(parseArticles(onDisk));
  });

  it("has the 25 articles A01–A25", () => {
    expect(articles.map((a) => a.id)).toEqual(
      Array.from({ length: 25 }, (_, i) => `A${String(i + 1).padStart(2, "0")}`),
    );
  });
});
