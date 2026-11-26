# FirstLine

Read `docs/SPEC.md` and `docs/PRD.md` before doing anything.

## Rules for this project
- Tests first. Expected results are worked out by hand and never changed to fit code. evals/cases.json is read-only for you.
- A deliberate break must make a named test fail.
- If a hand count disagrees with the code, stop and report.
- No secrets in any file, commit or output. Never print .env values.
- Commit only when all tests pass. Never push or merge without my explicit "go".
- Report in plain words; I'm a business student, not a coder.
- Mac: sed -i needs a backup suffix; no timeout command; zsh doesn't split unquoted lists; gh is not installed.
- AI only reads text and writes wording; plain code decides and counts.

## Commands
- `npm test` runs the tests.
- `npm run lint` checks code style.
