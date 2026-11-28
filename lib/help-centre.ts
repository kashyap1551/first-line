// The help centre, built into the code at build time ("?raw" loads the file as
// text), so a deployment can never be missing it. next.config.ts has the
// matching Turbopack rule; vitest understands "?raw" on its own.
import markdown from "../content/help-center.md?raw";
import { parseArticles } from "./content";

export const articles = parseArticles(markdown);
