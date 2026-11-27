# AI Agent Handoff Guide

## Purpose

This document defines a provider- and agent-independent way to continue Madheshi App development when an AI coding agent, model, account, IDE, or usage allowance becomes unavailable.

The repository is the shared source of truth. A replacement agent must be able to establish the actual project state from committed instructions, Git history, GitHub issues and pull requests, source code, tests, and the handoff notes—without relying on access to the previous agent's conversation.

This process reduces lost context; it does not guarantee that unfinished work is correct or that every AI tool supports the same capabilities.

## Sources of truth

Use these sources in this order for their respective responsibilities:

| Information | Authoritative source |
|---|---|
| Approved V1 scope, product behavior, calculation rules and acceptance criteria | Notion source pages; read their generated snapshots under `docs/notion/` |
| Shared coding rules and approved architecture | `AGENTS.md` |
| Contribution, branch, commit and review workflow | `CONTRIBUTING.md` |
| Current implementation and actual working state | Repository files, Git status, branch and commit history |
| Task scope and acceptance criteria | Relevant GitHub Issue and its comments |
| Proposed implementation and review feedback | Relevant GitHub Pull Request, commits and review comments |
| Cross-task project progress | `PROJECT_STATUS.md` |
| Current task's interruption/resumption details | This file's **Active task handoff** section, when populated |

`CLAUDE.md` is an agent-specific entry point and must remain consistent with the shared instructions in `AGENTS.md`. Other agents should follow `AGENTS.md` and their own tool-specific entry points, if any.

Generated files under `docs/notion/` are read-only snapshots. Do not edit them manually. If they are stale, report that and request/run the approved Notion sync workflow.

## Mandatory rules for every agent

1. Read `AGENTS.md`, `CONTRIBUTING.md`, and `README.md` completely.
2. Read `PROJECT_STATUS.md`, this file, `docs/PROJECT_STRUCTURE.md`, and `docs/notion/README.md`.
3. Read the relevant generated Notion specifications and verify their freshness before requirements or architecture work.
4. Inspect the relevant GitHub Issue and Pull Request, including comments and review feedback.
5. Inspect the actual implementation and tests. Do not assume a previous agent's summary is correct.
6. Check the current branch, working tree, recent commits, and remotes before making changes.
7. Follow the approved architecture, dependency policy, branch naming, and owner-review process in `AGENTS.md` and `CONTRIBUTING.md`.
8. Never discard, reset, overwrite, or silently reformat uncommitted changes that may belong to the owner or another agent.
9. Never merge a task branch into `develop` or `main`. The project owner performs the integration after review.
10. Never place secrets, access tokens, credentials, private keys, personal account data, or sensitive local configuration in this file, `PROJECT_STATUS.md`, commits, issues, or PR descriptions.

If instructions conflict or the actual repository state is unclear, stop before risky changes and report the conflict.

## Normal task workflow

### Starting a task

Before implementation, record or confirm:

- GitHub Issue and its acceptance criteria.
- Task branch and intended base branch.
- Current branch and latest commit.
- Whether the working tree is clean.
- Relevant architecture/specification documents.
- Existing implementation and tests that will be affected.
- Any owner decisions or dependency approvals required.

Create a task-specific branch from the latest `develop`, following `CONTRIBUTING.md`. Do not start from another unfinished task branch unless the owner explicitly approves a dependent-branch strategy.

### Working safely

- Keep changes scoped to the assigned issue.
- Prefer small, coherent changes that can be reviewed independently.
- Run relevant tests and checks after meaningful changes.
- Review `git diff` and `git status` before committing.
- Commit only coherent, verified work; do not create a commit just to preserve broken or unverified code.
- Push checkpoints when appropriate and permitted, so progress is not confined to one local machine.
- Do not force-push or rewrite shared branch history unless the owner explicitly approves it.
- Keep the task handoff current when meaningful progress is made, especially before a long-running operation or when a session may end.

### Ending a task or session

Before handing work to another agent or ending a substantive session:

1. Inspect `git status` and the complete diff.
2. Record the current branch and latest commit.
3. Identify which changes are committed and pushed, and which remain local/uncommitted.
4. Record the exact checks run and their actual results.
5. Record known failures, unresolved questions, and risks.
6. Update the **Active task handoff** section below with the next concrete action.
7. Update `PROJECT_STATUS.md` at the end of substantive work, following `AGENTS.md`.
8. Push the task branch when appropriate and permitted. Confirm the push succeeded; do not claim remote backup otherwise.

If there is no active interrupted task, set the handoff status to **No active handoff** and clear stale task-specific details rather than leaving misleading instructions.

## Recovery procedure when switching agents or providers

Use this procedure when an agent reaches a message/usage limit, crashes, loses its session, or is replaced by another tool.

### 1. Establish repository state before continuing

Run these commands from the repository root (PowerShell examples):

```powershell
git status --short --branch
git branch --show-current
git branch --list
git log -8 --oneline --decorate
git remote -v
```

If the working tree contains changes, inspect them before doing anything else:

```powershell
git diff
git diff --cached
git status
```

Do not run `git reset`, `git clean`, `git checkout -- .`, `git restore .`, or destructive stash operations as a generic recovery step. These can destroy unfinished work.

### 2. Read the handoff and verify it

Read the **Active task handoff** section below and the latest `PROJECT_STATUS.md` entry.

Treat both as navigation aids, not unquestionable facts. Verify their claims against:

- The current branch and commit history.
- The actual working tree and changed files.
- The relevant GitHub Issue and PR.
- The source code and tests.
- The most recent test/build output available.

If the previous agent stopped before updating the handoff, reconstruct the state from Git and the repository. Do not invent missing progress or assume that the last described step succeeded.

### 3. Decide how to proceed

- **Changes committed and pushed:** continue from the verified remote branch and latest commit.
- **Changes committed but not pushed:** inspect the commit and branch, then push only if the branch and remote are correct and the owner workflow permits it.
- **Changes uncommitted:** preserve them. Inspect and test before editing; do not overwrite them.
- **Changes exist only on another machine:** they cannot be recovered from GitHub unless they were pushed or otherwise backed up. Ask the owner to provide the machine/worktree or a patch; do not pretend the remote branch contains them.
- **Branch or task identity is uncertain:** stop and ask the owner rather than guessing.
- **The previous agent's work fails checks:** report the failure and diagnose it before adding more changes.

### 4. Continue with a fresh verification

Before implementing the next step, run the smallest relevant checks to establish a baseline. Then continue from the verified next action in the handoff. Re-run all required checks before submitting or updating the PR.

## Active task handoff

> This section is for a currently interrupted task, not a permanent project history. Update it when a task is interrupted or handed to another agent. Clear it when the task is complete or no task is active.

**Handoff status:** Issue #77 (reusable configurable land calculator UI) implemented, committed and pushed; no PR (not requested); awaiting owner review

**Last updated:** 2026-11-27

**Task**

- GitHub Issue: #77 (extract the reusable, configuration-driven land calculator UI). Next, NOT started: #78 (Hill / Mountain calculator screen).
- Pull Request: none yet (not requested)
- Objective: Terai uses a shared configurable calculator; Hill / Mountain configuration is ready but not enabled.

**Repository state**

- Branch: `refactor/shared-land-calculator-ui`
- Base branch: `develop` @ `6cf7d51` (includes #76 / PR #79)
- Latest commit: the branch head, `refactor(land): extract reusable calculator UI`
- Working tree: clean after the commit
- Remote push status: pushed to `origin/refactor/shared-land-calculator-ui`

**Progress**

- Completed and verified: `landFamilyConfig.ts`, `LandCalculator.tsx`, `LandResultCard.tsx`, `landDisplay.ts` (renamed from the Terai-named files), `TeraiLandView.tsx` as a thin wrapper, `land.hill.*` strings (en + np), and tests. The view uses the generic `convert` / `convertMixed` API; Mixed Units and Next/Done navigation work for any number of fields.
- In progress: none.
- Not started: #78 (wire `HILL_LAND_CONFIG` into the Land tab in place of `HillMountainLandView`); on-device testing.

**Changed files**

- Committed: `src/screens/Calculator/LandCalculator/{LandCalculator.tsx,LandResultCard.tsx,landDisplay.ts,landFamilyConfig.ts,TeraiLandView.tsx}` (two renamed), tests `LandCalculator.test.tsx`, `landFamilyConfig.test.ts`, `landDisplay.test.ts`, updated `TeraiLandView.test.tsx`, `src/i18n/resources/en.ts` and `np.ts`, `PROJECT_STATUS.md`, this file.
- Uncommitted: none.
- Untracked: none.

**Validation**

- Commands run: `npx tsc --noEmit`, `npm run lint`, `npx prettier --check src __tests__`, `npx jest --runInBand`.
- Results: all passed (56 suites / 1427 tests).
- Not run: Android build / on-device.

**Known problems and decisions**

- Errors/blockers: none.
- Decisions: the Terai-named string keys (`land.terai.*`, `land.mixed.hint`, `land.quickRef.*`) are kept to avoid churn; Hill uses new `land.hill.*` keys; `land.terai.calculate` and `land.mixed.placeholder` are shared by both configs. The Terai compatibility wrappers in the service are now unused by the UI and can be removed in #78 if desired.
- Constraints that must not be changed: registry factors, no new dependencies, `docs/notion/` untouched, no route/tab added.

**Next action**

- Exact next step: owner review; then #78 on a new branch from `develop`: render `<LandCalculator config={HILL_LAND_CONFIG} />` from `HillMountainLandView` and check the four-field row on a narrow Android screen.

**Handoff notes**

- Terai device checks from the previous task still apply (both modes, keyboard Next/Done, Nepali digits, themes, Copy/Share/Save).

## Handoff quality checklist

Before transferring a task, confirm:

- [ ] The task and GitHub Issue/PR are identified.
- [ ] The current branch and latest commit are recorded.
- [ ] Committed, uncommitted, and untracked changes are distinguished.
- [ ] The remote push status is verified.
- [ ] Completed work is separated from attempted or unverified work.
- [ ] Test commands and actual results are recorded.
- [ ] Known failures, blockers, and owner decisions are recorded.
- [ ] The next action is specific and safe.
- [ ] No secrets or sensitive information are included.
- [ ] `PROJECT_STATUS.md` reflects verified project-level progress.

## Important limitation

A handoff file cannot recover unsaved work from a closed or unavailable machine, restore a lost local working tree, or transfer one provider's private conversation history to another provider. Durable progress must be saved in the repository and, when appropriate, pushed to the task branch. The next agent must always verify the actual state before continuing.
