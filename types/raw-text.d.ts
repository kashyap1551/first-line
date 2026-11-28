// Files imported with "?raw" arrive as plain text (see lib/help-centre.ts).
declare module "*.md?raw" {
  const text: string;
  export default text;
}
