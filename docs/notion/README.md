# Notion documentation snapshots

Generated Markdown snapshots of the approved Madheshi App V1 Notion specification pages.

## Source of truth
- Product scope and requirements: Notion.
- Code, agent instructions, workflow, and development handoff: GitHub.
- This directory: generated read-only snapshots for agents and local development.

## Synced pages
| Snapshot | Notion source |
|---|---|
| V1_RELEASE_SCOPE.md | [Release Scope & Product Overview](https://www.notion.so/4119628c857d811ab1fbff2b9062d66f) |
| V1_FUNCTIONAL_REQUIREMENTS.md | [Functional Requirements & Calculation Rules](https://www.notion.so/4119628c857d814fb3ebd9946cab3701) |
| V1_DEVELOPMENT_PLAN.md | [Development Plan, Architecture Boundaries & Test Checklist](https://www.notion.so/4119628c857d81458e31cdcfd484d031) |

## Sync
GitHub Actions workflow .github/workflows/notion-docs-sync.yml runs every 30 minutes and can be started manually from **Actions → Notion Docs Sync → Run workflow**. It uses repository secret NOTION_TOKEN, exports the three pages, and opens/updates a PR against develop. It never auto-merges.

## Agent guidance
Read the snapshots before requirements/architecture work. Check their generated timestamps. If stale, ask the owner to sync first. Do not edit snapshots manually; change Notion and sync.

## Troubleshooting
- Integration must have read access to all source pages.
- Secret name must be exactly NOTION_TOKEN.
- Missing access or API errors fail the workflow; existing snapshots are not silently replaced with incomplete content.
