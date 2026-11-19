# Madheshi App — Documentation and AI Handoff Status

> Maintained by contributors and AI agents. Update only with verified repository state.

## Repository baseline

- Repository: yadavrabikrishna/MadheshiApp
- Integration branch: `develop`
- Audited develop commit: `7b52a93cacae8ca16be3a39bcad3669f79536f06`
- Audit date: 2026-11-19
- Release: V1
- Stack: React Native CLI + TypeScript, React Native StyleSheet, React Navigation, Redux Toolkit + RTK Query, npm.
- V1 boundaries: Madheshi.com WordPress REST API for news; SQLite for local persistence; calculators run on-device; no separate FastAPI/PostgreSQL backend.
- Decimal arithmetic: `decimal.js` is declared as `^10.6.0` in `package.json`. The current `package-lock.json` resolves it to `10.6.0`. The approved Notion specifications have been updated to allow the `^10.6.0` semver range; the generated snapshots in `docs/notion/` still need the next successful Notion sync to reflect that latest edit.

## Current application implementation

- The four primary bottom-navigation destinations (Home, News, Calculator and Settings) are part of the approved app shell.
- Calculator navigation and configuration are integrated: Interest, Age and Land groups; individual calculator enable/disable settings; saved active-calculator selection; Basic Calculator fallback; and a localized header title that follows the active calculator.
- The calculator views/components exist as the implementation starting points, but the actual calculator experiences and calculation-domain behavior remain to be implemented. Do not interpret the presence of a view file or navigation destination as a completed calculator.
- Basic Calculator is currently a placeholder; it does not provide keypad or arithmetic functionality.
- The current calculator navigation, persistence and source layout are described in `docs/PROJECT_STRUCTURE.md`. Always inspect the current implementation before extending it.

## Verified merged work

The following work is merged into `develop`:

- PR #10 — initial calculator navigation for Interest, Age and Land.
- PR #12 — Simple / Compound Interest selection.
- PR #15 — AD / BS Age selection.
- PR #17 — Terai / Hill-Mountain Land selection.
- PR #19 — dynamic localized calculator name in the app header.
- PR #21 — `decimal.js` dependency setup.
- PR #22 — configurable calculators, dynamic navigation and Basic Calculator fallback.
- PR #16 — shared AI handoff instructions and Notion documentation sync infrastructure.
- PR #24 — Notion exporter task-list rendering, exporter tests and GitHub Actions runtime updates.
- PR #23 — generated V1 Notion specification snapshots.

PR #16, #21, #22, #23 and #24 are closed and merged. Verify GitHub directly for any newer issue or PR before starting work.

## Documentation and automation

- `AGENTS.md`: shared instructions for coding agents.
- `CLAUDE.md`: Claude Code entrypoint; it points agents to the shared instructions.
- `CONTRIBUTING.md`: mandatory branch, review and merge workflow.
- `PROJECT_STATUS.md`: cross-agent handoff; keep it aligned with verified repository state.
- `docs/PROJECT_STRUCTURE.md`: current source-code organization and architectural conventions.
- `docs/notion/README.md`: source-of-truth and synchronization rules.
- `docs/notion/V1_*.md`: generated snapshots of the approved Notion pages. Never edit these generated files manually; update Notion and run the sync workflow instead.

Source-of-truth boundaries:

- Notion: approved V1 scope, functional requirements, calculation rules, architecture boundaries and test checklist.
- GitHub: source code, agent instructions, contribution workflow, project structure, current development handoff and automation.
- Generated Notion snapshots: synchronized copies for repository/agent access; they are not independent specifications.

### Verified documentation automation

- PR #16 established the Notion sync workflow, scheduled every 30 minutes and manually triggerable. It opens or updates a PR against `develop`; it does not auto-merge.
- PR #24 updated the workflow actions for the Node 24 runtime and added exporter regression tests.
- Notion Docs Sync run #44485424686 completed successfully on 2026-11-19. It generated the snapshot update submitted as PR #23; PR #23 was subsequently merged into `develop`.
- Notion Exporter Tests runs #44484598523 and #44484592101 completed successfully on 2026-11-19.
- An earlier Notion Docs Sync run (#44478666521) failed before the successful retry (#44480817227). Do not treat that earlier failure as the current workflow state.
- The latest semver-policy edit to the Notion specifications was made after the currently merged snapshots were generated. Confirm that a subsequent sync updates the generated snapshots to show `decimal.js ^10.6.0`.

## Current dependency policy

- Use npm and commit `package-lock.json`.
- `decimal.js`: use the `^10.6.0` range; the lockfile records the resolved install version. Do not require an exact `package.json` pin.
- `react-native-nitro-sqlite` remains pinned to `10.3.0`.
- `react-native-nitro-modules` remains pinned to `0.37.2`.
- Do not reinstall Decimal.js or create another dependency-install task: it is already installed and merged.

## Next application milestone

The next planned feature is implementation of the Simple Interest Calculator experience. Before creating or implementing that feature:

1. Confirm this status update has been reviewed and merged by the project owner.
2. Confirm the generated Notion snapshots have synchronized the latest `^10.6.0` dependency policy.
3. Review the latest V1 Release Scope, Functional Requirements and Development Plan snapshots, especially the approved interest date-counting, partial-period, rate-entry and rounding rules.
4. Review the current Simple Interest navigation/view components, theme and localization patterns, tests, and the prototype reference. Treat the prototype as reference material only; implement the native React Native experience using the existing project architecture.
5. Create a dedicated GitHub issue describing the approved scope, then implement it on a task branch created from the latest `develop`.

Do not assume the Simple Interest UI issue includes Compound Interest, or that a UI task authorizes changing approved calculation rules. Keep the issue's UI and calculation scope explicit.

## Required agent handoff protocol

Before substantive work, every agent must:

1. Read `AGENTS.md`, `CONTRIBUTING.md` and `README.md`.
2. Read this file, `docs/PROJECT_STRUCTURE.md`, `docs/notion/README.md` and the relevant generated V1 specifications.
3. Inspect the current branch, `git status`, recent commits, relevant GitHub issue/PR and actual implementation. Treat this handoff as a guide, not as proof of current state.
4. If this file is stale or contradicts the repository, verify the facts and correct it before proceeding.

At the end of substantive work, update this file with:

- What was completed and what remains.
- Current branch and relevant issue/PR.
- Files changed.
- Exact tests/checks run and their outcomes.
- Known blockers or owner decisions.
- One clear next action.

Never report a check as passed unless it was executed and its output reviewed. Never put secrets, access tokens, personal credentials or private account data in repository handoff files.

## Current handoff

- Last completed: Issue #27 — pure Simple Interest calculation engine in `src/features/interest/` (neutral `YYYY/MM/DD` validation, fixed 30-day/12-month duration, monthly-rate normalisation for both rate modes, Decimal.js simple interest with a cloned constructor) plus unit tests. No UI, Redux, storage, dependency or Compound Interest changes.
- Public API (`src/features/interest`): `calculateSimpleInterest(input)` returns `{ ok: true, value }` or `{ ok: false, errors }`; also `parseNeutralDate`, `calculateFixedDuration`, `isEndBeforeStart`, `fixedDayCount`, `normalizeMonthlyRate`, `parseDecimalInput`, `RATE_ENTRY_MODES`, `CalcDecimal`. Results are exact (unrounded) Decimal values; money display formatting is left to the UI (Issue #26).
- Branch: `feature/simple-interest-calculation-logic` (from `develop` at `00becc7`). Pull request: open against `develop` with `Closes #27`; owner review and manual merge required.
- Files changed: `src/features/interest/{decimal,neutralDate,rate,simpleInterest,index}.ts`, `src/features/interest/__tests__/{neutralDate,rate,simpleInterest}.test.ts`, `docs/PROJECT_STRUCTURE.md`, `PROJECT_STATUS.md`.
- Checks run: `npx tsc --noEmit` (exit 0), `npm run lint` (exit 0), `npm test -- --runInBand` (13 suites, 334 tests passed, including 148 new interest tests). Android build/run not applicable: pure TypeScript, no native, dependency or UI change.
- Owner decisions flagged for review (see PR description): (1) a date range is rejected when the end is earlier as written (year/month/day) or on the fixed 30/12 scale; this only differs from plain ordering for days 31-32; (2) for a start day of 32 and an end day of 01 two or more months later, the single borrow leaves -1 day, so the same elapsed total is re-split into years/months/days (time in months is unaffected).
- Blocker / owner decision: review and merge the Issue #27 PR. Issue #26 (UI) must not start until it is merged.
- Next action: after the Issue #27 PR is merged, implement Issue #26 against the exported API above (request approval before adding any clipboard or image-share dependency).
