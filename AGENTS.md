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

### Backend architecture

The planned backend stack is:

- Python
- FastAPI
- Pydantic
- SQLAlchemy
- Alembic
- PostgreSQL
- OpenAPI / Swagger

The backend may be maintained in a separate repository or project directory. Do not assume its source code exists in this mobile repository.

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

## 5. Development Workflow

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

## 6. Inspect Before Changing

Before implementation:

1. Check the current branch.
2. Check `git status`.
3. Inspect relevant source files.
4. Inspect `package.json` and `package-lock.json` before changing dependencies.
5. Check existing navigation, state-management, styling, and component patterns.
6. Identify the smallest reasonable set of changes.

Never overwrite existing files or configurations without first inspecting their contents.

Do not discard, reset, or overwrite uncommitted user changes.

## 7. Dependency Management

- Use npm commands.
- Update `package.json` and `package-lock.json` consistently.
- Do not manually edit the lockfile.
- Avoid installing packages that duplicate existing functionality.
- Check compatibility with the installed React Native version.
- Prefer official documentation for native modules.
- Explain any required native rebuild.

Do not modify Android Gradle configuration, native project files, or application permissions unless required by the task.

## 8. Code Quality

- Use TypeScript types and interfaces appropriately.
- Avoid `any` unless there is a documented reason.
- Keep components focused and reusable.
- Separate UI, business logic, state management, and API communication appropriately.
- Avoid duplicated business logic.
- Handle loading, error, empty, and success states.
- Use accessible labels and appropriate touch targets.
- Follow the existing naming and folder conventions.
- Do not add speculative abstractions or unnecessary complexity.

## 9. Testing and Validation

After making changes:

1. Run relevant tests.
2. Run available linting and TypeScript checks.
3. Build or run the Android application when the change affects native or application behavior.
4. Report checks that could not be executed.
5. Do not claim that a test or build passed unless it actually completed successfully.

Do not silently skip failing tests or suppress errors to make a build appear successful.

## 10. Git and Review Restrictions

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