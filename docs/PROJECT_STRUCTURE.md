# Project Structure

Source code lives in `src/`, grouped by responsibility. `App.tsx` only wires the
root together.

```text
App.tsx                      Root: SafeAreaProvider > AppBootstrap > AppRoot
__tests__/                   App-level (integration) tests
docs/                        Project documentation
src/
  app/                       App startup
    AppBootstrap.tsx           Opens storage, hydrates Redux, then renders the app
    AppRoot.tsx                Themed NavigationContainer and StatusBar
  components/                Reusable UI, no business logic
    common/                    Icon, ScreenPlaceholder, SegmentedControl
    header/                    Top-right header controls (theme, language)
  features/                  One folder per feature: Redux slice, selectors, tests
    preferences/               Theme + language state and persistence thunks
  i18n/                      Centralized translations (en, ne) and useTranslation
    resources/                 en.ts defines the keys; ne.ts must match
  navigation/                React Navigation setup and route types
  screens/                   One folder per screen (Home, News, Calculator, Settings)
  storage/                   SQLite: connection, versioned migrations, repositories
  store/                     Redux store factory and typed hooks
  test-utils/                Jest helpers (real SQLite via node:sqlite); not shipped
  theme/                     Color tokens, light/dark themes, navigation theme, hooks
  types/                     Shared domain types and constants
```

## Rules

- **Redux owns live state; SQLite owns durable state.** Components read Redux and
  dispatch thunks. They never call SQLite. A change updates Redux immediately,
  then is written to SQLite asynchronously. A failed write sets an error flag in
  Redux (shown in Settings) instead of being ignored.
- **Storage is behind repositories** (`src/storage`). The native driver is
  imported in exactly one file (`database.ts`). Schema changes are new entries in
  `migrations.ts`; never edit a released migration.
- **Colors come from theme tokens** (`useAppTheme`, `useThemedStyles`), never
  hard-coded hex values in components.
- **Strings come from `src/i18n/resources`.** Add every new key to `en.ts` and
  `ne.ts`; the compiler fails if Nepali is missing one.
- **Icons go through `components/common/Icon`.**
- **Dependencies are injected** into the store (`createAppStore`) so tests can use
  a fake or a Node SQLite database instead of the device driver.
- New features follow the same shape: `features/<name>/` for state, `screens/<Name>/`
  for UI, a storage repository only when data must persist.
