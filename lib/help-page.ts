import type { Article } from "./content";

export type CategoryGroup = { category: string; articles: Article[] };

/** Groups articles by category, keeping the order in which categories first appear. */
export function groupByCategory(articles: Article[]): CategoryGroup[] {
  const groups: CategoryGroup[] = [];
  for (const article of articles) {
    let group = groups.find((g) => g.category === article.category);
    if (!group) {
      group = { category: article.category, articles: [] };
      groups.push(group);
    }
    group.articles.push(article);
  }
  return groups;
}

export function titlesById(articles: Article[]): Record<string, string> {
  return Object.fromEntries(articles.map((a) => [a.id, a.title]));
}
