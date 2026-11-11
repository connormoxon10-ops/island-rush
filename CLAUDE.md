# Island Rush: working agreements

## Git workflow (owner's standing instructions)
- Work on a `claude/<topic>` branch, never directly on `main`. Current long-running branch: `claude/continue-dev`.
- **Push early and often.** Commit and push after each meaningful change, not just at the end of a feature.
- **Open a pull request for each feature** (one feature per PR, branch from `main`) so the owner can review and merge it.
- **Remind the owner to merge open PRs.** End replies with a one-line list of PRs that are open and awaiting merge, until they are merged.
- Commit messages end with the attribution trailers the session provides (`Co-Authored-By: Claude … <noreply@anthropic.com>` plus the session link).
  PR descriptions end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)` plus the session link.
- Use the `Claude <noreply@anthropic.com>` git identity. Do not put the owner's personal email in commits or any external request.

## Build and test
- `bash build.sh` builds `dist/island-rush.html` (and `dist/test.html`, which is gitignored).
- Tests live in `tests/`; see `README.md` and `package.json` scripts (`test:physics`, `test:regression`, `test:flights`).
- Run the regression suites before opening a PR for gameplay changes.

## Code layout
- `js/*.js` are concatenated alphabetically into one strict-mode IIFE, so top-level identifiers must be unique.
- Workshop physics files (`09_wk*.js`) are pure and also loaded by the node test harness `tests/wkt.js`.
- EVA / space-suit exploration lives in `js/10_wkeva.js` (core) and `js/10_wkevb.js` (surface content).
