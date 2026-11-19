# Madheshi App — Documentation and AI Handoff Status

> Maintained by contributors and AI agents. Update only with verified repository state.

## Repository baseline
- Repository: yadavrabikrishna/MadheshiApp
- Integration branch: develop
- Current audited develop commit: e0c9a60b732cf937fc86b641c6b1ba79b9ffabad
- Release: V1
- Stack: React Native CLI + TypeScript, StyleSheet, React Navigation, Redux Toolkit + RTK Query, npm.
- V1 boundaries: Madheshi.com WordPress REST API for news; SQLite for local persistence; calculators run on-device; no separate FastAPI/PostgreSQL backend.
- Decimal arithmetic: decimal.js 10.6.0 is now included in the current dependency baseline.

## Current repository state (audited 2026-11-19)
- Calculator navigation/preferences and dynamic localized header work have been integrated in develop.
- Calculator component folders exist for Simple/Compound Interest, AD/BS Age, Terai/Hill-Mountain Land, and Basic Calculator; the calculator views remain the next application implementation work.
- Current calculator navigation and preference behavior are described in docs/PROJECT_STRUCTURE.md.
- This status file is for cross-agent handoff, not a substitute for inspecting the current code, Git status, issue, or PR.

## Documentation infrastructure
- PR #16: https://github.com/yadavrabikrishna/MadheshiApp/pull/16
- Branch: chore/notion-docs-sync
- PR remains open and unmerged; owner review is required.
- The PR adds CLAUDE.md, PROJECT_STATUS.md, docs/notion/README.md, three initial Notion snapshots, a GitHub Actions workflow, and a Notion API export script.
- The sync workflow requires the repository Actions secret NOTION_TOKEN, with read-content access to all three approved Notion pages.
- Workflow design: scheduled every 30 minutes and manually triggerable; opens/updates a PR against develop; does not auto-merge.
- Generated files under docs/notion/ must not be edited manually. Update the Notion source, then sync.

## Source-of-truth boundaries
- Notion: approved V1 scope, functional requirements, calculation rules, architecture boundaries and test checklist.
- GitHub: source code, agent instructions, contribution workflow, project structure, current development handoff, automation.
- docs/notion/*.md: generated snapshots of the controlling Notion pages, not independent specifications.

## Outstanding documentation validation
1. Review PR #16 changes and check whether the GitHub Actions workflow can access all three Notion pages using NOTION_TOKEN.
2. Run the workflow manually and inspect the three generated Markdown files against their Notion sources, including nested content and tables.
3. Confirm that the Notion integration has access to the parent pages and all required source pages.
4. Confirm the age calculator default is interpreted consistently: the Release Scope says it follows the user's selected date preference; do not assume BS-first or AD-first is universally correct.
5. Keep docs/PROJECT_STRUCTURE.md aligned with actual committed source files.

## Session handoff checklist
- Last completed:
- Branch / issue / PR:
- Files changed:
- Checks actually run and results:
- Blockers / owner decisions:
- Next concrete action:

Never report a check as passed unless it was executed and its output reviewed.
