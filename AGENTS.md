# AGENTS.md

# Madheshi App — AI Agent Instructions

## 1. Mandatory Reading

Before inspecting, modifying, creating, deleting, installing, or executing anything in this repository:

1. Read this file (`AGENTS.md`) completely.
2. Read `CONTRIBUTING.md` completely.
3. Read `README.md`.
4. Read the relevant project documentation before working on a specific feature.
5. Inspect the existing implementation before proposing or making changes.

Do not assume that previous conversations, external examples, or generated code accurately describe the current repository state. The checked-out source code and committed documentation are the primary references.

## 2. Project Overview

Madheshi App is a React Native mobile application.

The project is being developed incrementally. Preserve the established architecture and existing implementation unless an approved change is required.

## 3. Approved Technology Stack

### Mobile application

- React Native CLI
- TypeScript
- React Native StyleSheet for styling
- React Navigation for navigation
- Redux Toolkit for application state management
- RTK Query for API data fetching and caching
- npm for JavaScript package management
- `@react-native-vector-icons/ionicons` (Ionicons) for icons
- `@react-navigation/bottom-tabs` and `@react-navigation/native-stack` (with `@react-navigation/elements`)
- `decimal.js` for exact decimal arithmetic in calculators (interest rounding must be exact round-half-up; never use binary floating point for money)
- Jest and React Native Testing Library for testing, where configured

### V1 server boundary

- V1 does not include a separate Python/FastAPI backend or PostgreSQL database.
- News uses the existing public Madheshi.com WordPress REST API as its editorial source.
- Interest, age and land calculations run locally on the device and require no server-side computation.
- Do not introduce a separate backend, database or CMS for V1 without an explicit approved scope change.

### Local database

SQLite is the local persistence layer. The approved driver is:

- `react-native-nitro-sqlite` **10.3.0**
- `react-native-nitro-modules` **0.37.2**

Both are pinned to exact versions in `package.json` (no `^`). Do not loosen, upgrade, or replace them without owner approval.

- Do not add AsyncStorage or another persistence library or SQLite driver.
- Redux Toolkit holds live state; SQLite holds durable data. Do not use SQLite as the UI subscription mechanism.
- Use the async API only (`executeAsync`, `transaction`). The synchronous `execute` throws while the connection is busy.
- Open the database once through the single shared connection in `src/storage/database.ts` (a second default `open` throws). That is the only file that imports the native module.
- Schema changes are new versioned migrations (`PRAGMA user_version`); never edit an already-released migration.
- Writes to a preference are applied in the order requested (see `createPreferencesRepository`); do not bypass that queue.

### Language and theme

- Supported app languages are `en` and `np`. `np` is the approved internal code for Nepali; the label shown to users is "नेपाली".
- For locale-aware formatting, map internal `np` to the standard Nepali locale `ne-NP`.
- Theme: the system color scheme (`useColorScheme`) is only the default when the user has not chosen. The saved choice (SQLite) always overrides it. If saved preferences cannot be loaded, use the system theme and English and show the warning in Settings.
- Strings live in `src/i18n/resources` (`en.ts` defines the keys, `np.ts` must match).

## 4. Architectural Restrictions

The following decisions must be respected:

- Use React Native CLI, not Expo, for this project.
- Use TypeScript for application code.
- Use React Native StyleSheet.
- Do not introduce NativeWind or Tailwind CSS.
- Use React Navigation.
- Use Redux Toolkit and RTK Query.
- Do not introduce Zustand.
- Do not introduce TanStack Query.
- Use npm, not pnpm or Yarn.
- Do not replace an approved library with another library without approval.
- Do not introduce unnecessary dependencies.
- Prefer existing project patterns over creating competing implementations.

For icons, use `@react-native-vector-icons/ionicons` packages when appropriate. Follow the package's current official documentation and the existing project configuration.

## 5. AI Session Continuity and Handoff

The repository must remain the shared source of working context when the owner switches AI accounts, models, or coding agents.

Before substantive work, every agent must:
1. Read `PROJECT_STATUS.md`.
2. Read `docs/AI_HANDOFF.md` and follow its recovery and active-task handoff instructions.
3. Read `docs/notion/README.md` and the relevant generated V1 specification snapshots.
4. Inspect the current branch, `git status`, recent commits, relevant GitHub issue/PR, and the implementation. Treat status and handoff documents as guides, not as proof of current state.
5. If a status or handoff record is stale or contradicts the repository, verify the facts and correct the record before proceeding.

### Mandatory development checkpoints

Handoff maintenance is continuous throughout substantive work; it is not an end-of-session-only activity.

Every agent must update the **Active Task Handoff** section in `docs/AI_HANDOFF.md`:
- At the start of a task, after confirming the actual repository and Git state.
- At meaningful checkpoints during implementation, especially after completing a coherent unit of work or making an important decision.
- After significant changes to files, task scope, implementation approach, validation results, or blockers.
- Before ending a session, handing work to another agent, changing accounts/models, or stopping work for any reason.
- When approaching a provider usage or message limit, if continued interaction is still possible. Do not wait for a warning or attempt to predict the exact limit; checkpoint periodically so a recent recovery point already exists.

Each checkpoint must accurately record:
- Task objective and relevant issue/PR.
- Current branch and latest relevant commit.
- Whether changes are committed, pushed, uncommitted, or untracked; distinguish these states clearly.
- Files changed and concise progress since the previous checkpoint.
- Exact validation commands run and their actual results, including failures or checks not run.
- Decisions, unresolved questions, blockers, and one specific next action.

Do not claim that local uncommitted or unpushed work is available to another agent or machine. Preserve the working tree; never use destructive Git commands to make a handoff appear clean. If work cannot be pushed, document that limitation and the exact local state.

When a task is fully completed and no work remains to hand off, mark the active task as completed or clear the active-task template so it cannot be mistaken for current work. Do not leave stale task details that could mislead the next agent.

### Project status

At the end of substantive work, also update `PROJECT_STATUS.md` with:
- What was completed and what remains at the project level.
- Current branch and relevant issue/PR.
- Files changed.
- Exact tests/checks run and their outcomes.
- Known blockers or owner decisions.
- One clear next action.

`PROJECT_STATUS.md` is the project-level progress summary; `docs/AI_HANDOFF.md` is the detailed, frequently refreshed record for the active or interrupted task. Keep their roles distinct and consistent.

Do not put secrets, access tokens, personal credentials, or private account data in repository handoff files. Do not rely on conversation history as the only record of a decision or task state.

## 6. Development Workflow

Follow the branch workflow in `CONTRIBUTING.md`.

Mandatory rules:

- Never develop directly on `main`.
- Never develop directly on `develop`.
- Create a task-specific branch from the latest `develop`.
- Use only the approved branch prefixes: `chore/`, `feature/`, and `fix/`.
- Keep changes limited to the assigned task.
- Do not merge a task branch into `develop`.
- Do not merge anything into `main`.
- Do not create releases or tags unless explicitly requested.
- Do not push changes to `main`.
- Do not bypass the owner's review and approval process.

The project owner is responsible for reviewing and manually merging completed work into `develop`.

If the required branch cannot be created or the working tree contains unexpected changes, stop and report the situation before proceeding.

## 7. Inspect Before Changing

Before implementation:

1. Check the current branch.
2. Check `git status`.
3. Inspect relevant source files.
4. Inspect `package.json` and `package-lock.json` before changing dependencies.
5. Check existing navigation, state-management, styling, and component patterns.
6. Identify the smallest reasonable set of changes.

Never overwrite existing files or configurations without first inspecting their contents.

Do not discard, reset, or overwrite uncommitted user changes.

## 8. Dependency Management

- Use npm commands.
- Update `package.json` and `package-lock.json` consistently.
- Do not manually edit the lockfile.
- Avoid installing packages that duplicate existing functionality.
- Check compatibility with the installed React Native version.
- Prefer official documentation for native modules.
- Explain any required native rebuild.

Do not modify Android Gradle configuration, native project files, or application permissions unless required by the task.

## 9. Code Quality

- Use TypeScript types and interfaces appropriately.
- Avoid `any` unless there is a documented reason.
- Keep components focused and reusable.
- Separate UI, business logic, state management, and API communication appropriately.
- Avoid duplicated business logic.
- Handle loading, error, empty, and success states.
- Use accessible labels and appropriate touch targets.
- Follow the existing naming and folder conventions.
- Do not add speculative abstractions or unnecessary complexity.

## 10. Testing and Validation

After making changes:

1. Run relevant tests.
2. Run available linting and TypeScript checks.
3. Build or run the Android application when the change affects native or application behavior.
4. Report checks that could not be executed.
5. Do not claim that a test or build passed unless it actually completed successfully.

Do not silently skip failing tests or suppress errors to make a build appear successful.

## 11. Git and Review Restrictions

Before committing:

- Review `git status`.
- Review the diff.
- Ensure unrelated user changes are not included.
- Ensure secrets and local-only files are not staged.

Use meaningful commit messages following the conventions in `CONTRIBUTING.md`.

After completing the task:

- Provide a concise implementation summary.
- List changed and created files.
- List dependencies added or removed.
- Report tests and commands executed.
- Report known limitations and outstanding issues.
- Leave the task branch available for owner review.

Never merge the task branch into `develop` or `main`. Never perform the owner's manual integration step.

## 11. Security

Never commit:

- API secrets or access tokens.
- `.env` files containing credentials.
- Android signing keys or private keystores.
- Production credentials.
- Private certificates.
- Personal access tokens.
- Machine-specific configuration containing sensitive information.

Do not print or expose secrets in logs, documentation, commits, or responses.

## 12. Handling Unclear Requirements

If a task conflicts with the approved architecture, existing documentation, or current implementation:

1. Do not silently choose a different architecture.
2. Explain the conflict.
3. Identify the affected files and decisions.
4. Ask the project owner for approval when the decision materially affects architecture or behavior.

Do not treat an unconfirmed proposal as an approved project decision.