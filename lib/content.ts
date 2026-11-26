export type Article = {
  id: string;
  title: string;
  category: string;
  body: string;
};

const HEADING = /^## (A\d+) \| (.+)$/;
const CATEGORY = /^Category: (.+)$/;

/** Splits the help centre file into articles. Text before the first article is ignored. */
export function parseArticles(markdown: string): Article[] {
  const lines = markdown.split(/\r?\n/);
  const starts = lines.flatMap((line, i) => (HEADING.test(line) ? [i] : []));

  return starts.map((start, n) => {
    const [, id, title] = HEADING.exec(lines[start])!;
    const end = starts[n + 1] ?? lines.length;
    const category = CATEGORY.exec(lines[start + 1] ?? "");
    if (!category) {
      throw new Error(`Article ${id} has no Category line under its title`);
    }
    return {
      id,
      title: title.trim(),
      category: category[1].trim(),
      body: lines.slice(start + 2, end).join("\n").trim(),
    };
  });
}
