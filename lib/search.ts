import type { Article } from "./content";

export type SearchResult = { id: string; score: number };

const TITLE_WEIGHT = 2;
const BODY_WEIGHT = 1;
const TOP_N = 3;
// Words this long also match each other if they start with the same letters,
// so "remind" finds "reminder" and "integrate" finds "integration".
const SHARED_START = 6;

// A standard general-purpose English stopword list, including the pieces left
// behind when apostrophes are removed ("what's" becomes "what" and "s").
const STOPWORDS = new Set(
  `i me my myself we our ours ourselves you your yours yourself yourselves
  he him his himself she her hers herself it its itself they them their theirs
  themselves what which who whom this that these those am is are was were be
  been being have has had having do does did doing a an the and but if or
  because as until while of at by for with about against between into through
  during before after above below to from up down in out on off over under
  again further then once here there when where why how all any both each few
  more most other some such no nor not only own same so than too very can will
  just should now could would may might must shall
  s t d ll m o re ve y ain aren couldn didn doesn don hadn hasn haven isn ma
  mightn mustn needn shan shouldn wasn weren won wouldn`.split(/\s+/),
);

// "Word a customer might use" -> "word we match on". Applied to questions and
// articles alike. Written in the form words take after the trailing "s" is gone.
export const SYNONYMS: Record<string, string> = {
  estimate: "quote",
  spreadsheet: "csv",
  bill: "invoice",
  customer: "client",
  remove: "delete",
  erase: "delete",
  stop: "cancel",
  price: "cost",
  fix: "edit",
  modify: "edit",
  login: "sign",
  teammate: "member",
  application: "app",
  phone: "mobile",
};

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word !== "" && !STOPWORDS.has(word))
    .map((word) =>
      word.length > 3 && word.endsWith("s") ? word.slice(0, -1) : word,
    )
    .map((word) => (Object.hasOwn(SYNONYMS, word) ? SYNONYMS[word] : word));
}

function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < SHARED_START || b.length < SHARED_START) return false;
  return a.slice(0, SHARED_START) === b.slice(0, SHARED_START);
}

/** The best-matching articles, highest score first. Articles scoring 0 are left out. */
export function search(question: string, articles: Article[]): SearchResult[] {
  const words = [...new Set(tokenize(question))];

  return articles
    .map(({ id, title, body }) => {
      const titleWords = tokenize(title);
      const bodyWords = tokenize(body);
      const score = words.reduce((sum, word) => {
        const inTitle = titleWords.some((other) => sameWord(word, other));
        const inBody = bodyWords.some((other) => sameWord(word, other));
        return (
          sum + (inTitle ? TITLE_WEIGHT : 0) + (inBody ? BODY_WEIGHT : 0)
        );
      }, 0);
      return { id, score };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, TOP_N);
}
