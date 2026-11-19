# Madheshi App

Madheshi App is a mobile application project focused on delivering useful information and practical tools for the Madheshi community.

The application is being developed using React Native CLI and TypeScript. V1 uses the existing Madheshi.com WordPress REST API for news, SQLite for local persistence, and on-device calculations; it does not include a separate application backend.

## Project Status

**Active development**

The project is currently under development. Features, architecture decisions, and implementation details may evolve through the owner's review process.

The `develop` branch contains the latest integrated development work. The `main` branch is reserved for stable releases.

## Technology Stack

### Mobile application

| Technology | Purpose |
|---|---|
| React Native CLI | Mobile application framework |
| TypeScript | Application programming language |
| React Native StyleSheet | Component styling |
| React Navigation (bottom tabs, native stack) | Navigation |
| Redux Toolkit | State management |
| RTK Query | API communication and caching |
| Ionicons (`@react-native-vector-icons/ionicons`) | Icons |
| `decimal.js` | Exact decimal arithmetic for calculators |
| npm | Package management |

### V1 server boundary

V1 does not use a separate Python/FastAPI backend or PostgreSQL database. The app reads public editorial content from the existing Madheshi.com WordPress REST API. Calculator operations run locally on the device. SQLite is used for structured local persistence.

### Local database

SQLite stores user preferences (and, in later tasks, the news cache and bookmarks) through the approved driver, pinned to exact versions:

- `react-native-nitro-sqlite` 10.3.0
- `react-native-nitro-modules` 0.37.2

See `AGENTS.md` for the storage rules and `docs/PROJECT_STRUCTURE.md` for the folder layout.

### Languages

The app supports English (`en`) and Nepali (`np`, shown as "नेपाली"). The internal `np` code maps to the standard `ne-NP` locale for locale-aware formatting.

## Current Development Scope

The planned V1 application includes:

- News
- Simple interest calculator
- Compound interest calculator
- Age calculator
- Land calculator

Refer to the current feature and architecture documentation for the approved specifications and implementation status.

## Project Requirements

Before starting, install and configure:

- Node.js
- npm
- Git
- Android Studio
- Android SDK
- Android emulator or a physical Android device
- JDK compatible with the installed React Native version

Use the versions and configuration documented for the current development environment.

## Local Development Setup

### 1. Clone the repository

```powershell
git clone <REPOSITORY_URL>
cd MadheshiApp
```

### 2. Read project documentation

Read these files before making changes:

1. `AGENTS.md`
2. `CONTRIBUTING.md`
3. `README.md`

Also read relevant feature and architecture documentation.

### 3. Install dependencies

```powershell
npm install
```

### 4. Start the Android emulator

Example using the configured local Android SDK:

```powershell
& "D:\Dev\SDK\Android\emulator\emulator.exe" -avd Pixel_10a
```

The SDK path and AVD name above are examples from the original development machine. Other developers must use their own Android SDK and emulator paths.

### 5. Run the application

#### Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# Using npx
npx react-native start --reset-cache
```
#### Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

##### Android

```sh
# Using npm
npm run android

# Using npx
npx react-native run-android --no-packager

npm run android -- --no-packager --active-arch-only

```

##### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.


For other available commands, inspect `package.json`.

## Git Branch Strategy

The repository uses two permanent branches:

- `main`: stable releases only.
- `develop`: development integration branch.

Temporary task branches must be created from `develop`.

Approved branch prefixes:

- `chore/` — setup, tooling and maintenance.
- `feature/` — new functionality.
- `fix/` — bug fixes.

Example:

```powershell
git switch develop
git switch -c feature/news-screen
```

Contributors must not merge their work into `develop` or `main`. Completed changes are submitted for owner review. The project owner performs the merge manually.

Read `CONTRIBUTING.md` for the complete workflow.

## AI Coding Agent Instructions

AI coding agents must read `AGENTS.md` before doing any work.

They must follow the approved architecture, inspect existing code before changing it, create task-specific branches from `develop`, test their changes, and leave completed work for owner review.

AI agents must never merge their work into `develop` or `main`.

## Project Documentation

Project architecture, feature specifications, implementation decisions, and development checklists should be maintained in the project's documentation.

Keep documentation consistent with the actual implementation. Do not mark proposed or unverified decisions as finalized.

## Contribution

Contributions are welcome through the repository's review process.

Read `CONTRIBUTING.md` before creating branches or submitting changes.

## License

The project's license will be specified by the project owner.