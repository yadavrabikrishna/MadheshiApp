# CONTRIBUTING.md

# Madheshi App — Contribution Guidelines

## 1. Before Starting

Every contributor must read:

1. `AGENTS.md`
2. `CONTRIBUTING.md`
3. `README.md`
4. Relevant architecture and feature documentation

Inspect the current implementation before changing code.

Do not assume that an earlier conversation or an outdated example represents the current codebase.

## 2. Git Branch Strategy

The repository uses two permanent branches:

| Branch | Purpose |
|---|---|
| `main` | Stable, reviewed release versions only |
| `develop` | Main development integration branch |

All development tasks must use temporary branches created from `develop`.

### Approved temporary branch prefixes

| Prefix | Purpose | Example |
|---|---|---|
| `chore/` | Setup, tooling, dependencies, configuration and maintenance | `chore/vector-icons` |
| `feature/` | New features and functionality | `feature/news-screen` |
| `fix/` | Bug fixes and corrections | `fix/date-calculation` |

Use descriptive, lowercase branch names with hyphens.

Do not create additional permanent branches without approval.

## 3. Mandatory Workflow

### Step 1 — Check the repository

```powershell
git status
git branch --show-current
git branch
```

Do not proceed if there are unexpected uncommitted changes or if the current branch is not suitable.

### Step 2 — Update develop

```powershell
git switch develop
git pull origin develop
```

If the repository has no remote configured yet, use the latest local `develop` branch and do not run the pull command.

### Step 3 — Create a task branch

Choose the appropriate prefix.

Examples:

```powershell
git switch -c chore/vector-icons
```

```powershell
git switch -c feature/news-screen
```

```powershell
git switch -c fix/date-calculation
```

Every task branch must originate from `develop`, not from `main` or another unfinished task branch.

### Step 4 — Implement the task

- Work only on the task branch.
- Keep the changes within the assigned scope.
- Follow `AGENTS.md` and the relevant project documentation.
- Do not introduce unapproved architectural changes.
- Do not include unrelated cleanup.

### Step 5 — Test and inspect

Run the relevant tests, linting, type checks, and builds.

Inspect the final changes:

```powershell
git status
git diff
```

Review staged changes before committing:

```powershell
git diff --cached
```

### Step 6 — Commit changes

Use Conventional Commit-style messages.

Examples:

```text
chore: add Ionicons package
chore(android): configure Android navigation support
feat: implement news screen
fix: correct age calculation
refactor: simplify news data mapping
docs: update development instructions
test: add interest calculator tests
```

Stage only the files belonging to the task.

For example:

```powershell
git add package.json package-lock.json
git commit -m "chore: add Ionicons package"
```

### Step 7 — Submit for owner review

The submission must include:

- Task summary.
- Implementation details.
- Files changed.
- Dependencies added or removed.
- Commands and tests executed.
- Build results.
- Known issues or outstanding work.

### Step 8 — Owner review and merge

**Only the project owner may approve and merge completed task branches into `develop`.**

Contributors and AI agents must:

- Not merge their own task branches into `develop`.
- Not merge anything into `main`.
- Not bypass review.
- Not delete a task branch before the owner has reviewed it.

After the owner merges the changes, the owner may delete the temporary branch.

## 4. Release Workflow

The `main` branch is reserved for stable releases.

Only the project owner may:

1. Decide when `develop` is ready for release.
2. Review the release changes.
3. Merge the approved release into `main`.
4. Create version tags and release notes.
5. Publish the release.

Never use `main` as a development branch.

## 5. Commit Message Convention

Use the following format:

```text
<type>(optional-scope): <description>
```

Approved types:

| Type | Usage |
|---|---|
| `feat` | New functionality |
| `fix` | Bug fixes |
| `chore` | Tooling, dependencies and maintenance |
| `docs` | Documentation |
| `refactor` | Code restructuring without intended behavior changes |
| `test` | Adding or updating tests |
| `style` | Formatting or styling changes without behavior changes |
| `perf` | Performance improvements |
| `build` | Build system and build configuration |
| `ci` | Continuous integration configuration |

Keep descriptions concise and meaningful.

## 6. Dependency Rules

- Use npm.
- Commit `package.json` and `package-lock.json` when dependencies change.
- Do not commit `node_modules`.
- Check React Native compatibility before adding native packages.
- Follow official package installation and configuration instructions.
- Avoid redundant dependencies.

## 7. Code and Architecture Rules

Follow the approved technology stack and restrictions documented in `AGENTS.md`.

Important project conventions:

- React Native CLI and TypeScript.
- React Native StyleSheet.
- React Navigation.
- Redux Toolkit and RTK Query.
- npm.
- V1 uses the existing Madheshi.com WordPress REST API for public news.
- V1 has no separate FastAPI backend or PostgreSQL database; calculations run locally and SQLite provides local persistence.

Do not introduce unapproved alternatives or change architectural decisions without owner approval.

## 8. Security and Repository Hygiene

Never commit credentials, API secrets, private signing keys, local environment files, or machine-specific generated configuration.

Check `.gitignore` before staging files.

Do not commit build outputs, dependency directories, caches, or temporary files unless explicitly required.

## 9. Review Checklist

Before submitting a task for review, verify:

- [ ] The correct task branch was created from `develop`.
- [ ] Changes are limited to the assigned task.
- [ ] Existing architecture and documentation were respected.
- [ ] No unrelated user changes were included.
- [ ] No secrets or local-only files were committed.
- [ ] Relevant tests were run.
- [ ] Relevant linting and type checks were run.
- [ ] Android build/run was checked when applicable.
- [ ] Commit messages are meaningful.
- [ ] Changed files and implementation are documented.
- [ ] Known issues and incomplete work are reported.
- [ ] The task branch has not been merged into `develop` or `main`.

## 10. Final Authority

The project owner controls:

- Architecture decisions.
- Feature scope.
- Dependency approval when architecture is affected.
- Review and acceptance of contributions.
- Merging into `develop`.
- Releases and merging into `main`.

All contributors must leave completed work available for owner review.