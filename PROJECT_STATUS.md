# Madheshi App — Development Handoff

> Maintained by contributors and AI agents. Keep this concise and based on verified state.

## Project baseline
- Repository: yadavrabikrishna/MadheshiApp
- Integration branch: develop
- Release: V1
- App: React Native CLI + TypeScript
- Approved V1 architecture: local-first mobile app; WordPress REST API for news; SQLite for offline/persistent data; no separate FastAPI/PostgreSQL backend.

## Verified task state (2026-11-18)
- Main Calculator selector: Interest / Age / Land integrated.
- Interest selector: Simple / Compound integrated.
- Age date-system selector: BS / AD integrated; recent commit history places BS first.
- Land selector: open issue #14, Terai / Hill-Mountain options; Terai default. Issue covers selector/placeholders only, not conversion calculations.
- Open issue: #14 — Add Terai and Hill/Mountain selector to Land calculator.
- No open PRs found during the audit.

## Documentation audit findings
- README, AGENTS.md and CONTRIBUTING.md contain outdated separate FastAPI/PostgreSQL backend references; approved V1 Notion specs explicitly prohibit this backend.
- decimal.js is described as approved in docs but is absent from package.json and package-lock.json. Do not claim it is installed; add when calculator implementation requires it.
- docs/PROJECT_STRUCTURE.md describes “top tabs” and component names that need verification against current source.
- Age selector default is not clearly settled in the approved spec. Recent implementation history uses BS first. Confirm the rule in Notion before changing behavior.
- Notion pages are mirrored under docs/notion/ by automation. These are generated snapshots and must not be edited manually.

## Current task
Set up Notion → GitHub specification snapshots and portable agent handoff.

## Next steps
1. Review/merge the Notion sync PR after inspecting its workflow/script.
2. Add/confirm repository secret NOTION_TOKEN; manually run the workflow to validate access.
3. Correct outdated backend statements across repo documentation.
4. Clarify Age default/date-preference requirement in Notion.
5. Verify docs/PROJECT_STRUCTURE.md against actual code.
6. Continue issue #14 using the branch/PR workflow.

## Handoff update template
Record:
- Last completed: concrete verified work.
- Branch/issue/PR: identifiers and links.
- Changed files.
- Checks run: exact command and result.
- Blockers/decisions needed.
- Next action: one concrete task/command.

Do not write vague claims such as “everything done”.
