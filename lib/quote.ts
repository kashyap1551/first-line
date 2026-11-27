// The quote check: the AI's quote must be one whole sentence of a cited article.

/** Differences in spaces and line breaks are ignored; every other character counts. */
export const squash = (text: string) => text.replace(/\s+/g, " ").trim();

/**
 * Splits text into sentences, after . ! or ? when followed by a space, a line
 * break or the end. So "1.5%", "€0.25" and "invoices@tallyfox.example" stay whole.
 */
export function splitSentences(text: string): string[] {
  return squash(text)
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence !== "");
}

const ENDS_WITH_MARK = /[.!?]$/;

/**
 * True if the quote, after squashing spaces, equals one whole sentence of the
 * body. Only a missing final . ! or ? is allowed.
 */
export function isWholeSentence(quote: string, body: string): boolean {
  const wanted = squash(quote);
  if (wanted === "") return false;
  return splitSentences(body).some(
    (sentence) =>
      sentence === wanted ||
      (!ENDS_WITH_MARK.test(wanted) &&
        ENDS_WITH_MARK.test(sentence) &&
        sentence.slice(0, -1) === wanted),
  );
}
