<!-- GENERATED FILE — DO NOT EDIT MANUALLY. Edit the Notion source and sync again. -->
<!-- Notion page ID: 4119628c857d81458e31cdcfd484d031 -->
<!-- Notion last edited: 2026-11-18T03:48:38.058Z -->
<!-- Snapshot created from connected Notion page content during initial bootstrap. -->

# 🛠️ V1. Madheshi App — Development Plan, Architecture Boundaries & Test Checklist

**Source:** [Open in Notion](https://app.notion.com/p/4119628c857d81458e31cdcfd484d031?pvs=204)  
**Notion last edited:** 2026-11-18T03:48:38.058Z

---

- Product: Madheshi App
- Release: V1
- Status: Development baseline
- Purpose: Keep implementation focused, testable and aligned with existing project architecture.

## 1. Architecture Direction

**Approved mobile stack: React Native CLI + TypeScript. Expo-managed workflow and Flutter are not used for this project.**

- Use React Native CLI with directly managed native Android and iOS projects; keep the native `android/` and `ios/` projects under version control.
- Use React Native's built-in `StyleSheet` and reusable style/theme modules. Do not add NativeWind or Tailwind CSS.
- Use React Navigation for the four primary bottom tabs: Home, News, Calculator and Settings (in that order). Inside the Calculator screen, use three horizontal selector buttons for Interest, Age and Land; selecting one changes the displayed calculator content. Implement this selector with ordinary React Native components and local state. Do not add a separate top tab navigator or navigation dependency just for the calculator selector. The shared app header must show two separate icon-only quick actions aligned at the top-right on the main app screens: a sun/moon icon to toggle Light/Dark theme and a language/globe icon to toggle English/Nepali (language codes: en and np). These are not bottom tabs or separate navigation destinations; keep the four-tab structure unchanged. Apply both changes app-wide immediately and persist the selected values in SQLite. Keep the Settings screen as well.
- Use a mutually compatible, explicitly pinned React Native, Node.js, Android Gradle Plugin, Gradle, Kotlin and Android SDK toolchain. Record the selected versions and validate compatibility before upgrades.
- Use npm as the mobile package manager. Commit the generated `package-lock.json` and use npm consistently for dependency installation and scripts; do not mix package managers or retain competing lockfiles.
- Target Android first. Keep iOS compatibility, but do not block V1 Android delivery on iOS-only work.
- Use TypeScript strict mode and feature-oriented source modules.
- Use the existing [Madheshi.com](http://Madheshi.com) WordPress REST API as the editorial source for public news; consume public read-only endpoints directly from the app.
- Do not create a Python/FastAPI backend, PostgreSQL database or separate CMS for V1. The existing WordPress REST API is sufficient for the approved news feature, and the calculators require no server-side computation.
- Use Redux Toolkit for shared in-memory application state and RTK Query for WordPress API requests, remote server state and request caching.
- Use Redux Toolkit and SQLite together with distinct responsibilities: Redux Toolkit is the reactive runtime state layer; SQLite is the durable local persistence layer. On startup, load saved preferences from SQLite and hydrate the Redux preferences state before rendering the app's themed/localized screens. When a preference changes, update Redux immediately for responsive UI, then persist the new value to SQLite. Handle persistence failures without leaving the UI permanently inconsistent; surface or log the failure and reconcile from storage as appropriate.
- Use SQLite through `react-native-nitro-sqlite` 10.3.0 with `react-native-nitro-modules` 0.37.2 as the approved V1 local database driver for structured offline data, including cached news, bookmarks and app preferences. Pin these versions. Nitro SQLite 10.3.0 is ESM-only, so configure Jest to transform this package. Rebuild the native app after installing or changing this native dependency. Redux Toolkit is not a persistence database. Do not add AsyncStorage by default; use SQLite for V1 persistence.
- Use `decimal.js` 10.6.0 as the approved decimal arithmetic library for financial and land-conversion calculations. Pin the exact version in `package.json`/`package-lock.json`. Construct decimal values from validated input strings (not already-rounded JavaScript numbers), keep intermediate values unrounded, and explicitly apply the V1 rounding rules only at the required output boundary. Keep Decimal configuration isolated in a shared calculation utility (prefer a cloned Decimal constructor) rather than mutating global configuration.

Keep the application feature-oriented:

- News
- Interest calculator
- Age calculator
- Land calculator
- Shared app shell, settings, localization, storage and formatting

Do not create backend services for calculations. Calculations and land conversions run locally on the device.

## 2. System Boundaries

### News

- Remote source: [Madheshi.com](http://Madheshi.com) WordPress REST API.
- WordPress is the editorial source of truth.
- App consumes public read endpoints only.
- Do not embed WordPress administrator credentials in the app.
- Cache only the content needed for the agreed offline experience.

### Calculators

- Interest, age and land calculations run locally.
- No login required for basic calculator use.
- No API call is required to calculate or display a result.
- Do not upload personal calculator inputs/results by default.

### Local preferences and storage

- Use SQLite as the persistent local storage layer for V1 structured data.
- Persist language and theme preferences locally in SQLite.
- Store cached news and explicit bookmarks separately; bookmarks must not be removed by automatic cache cleanup.
- Keep Redux Toolkit as the application state layer, not as the persistent database.
- Do not add AsyncStorage by default. The selected SQLite driver is `react-native-nitro-sqlite` 10.3.0 with `react-native-nitro-modules` 0.37.2; retain this pinned baseline unless a verified compatibility issue requires a change.
- Provide safe cache handling and avoid deleting explicitly saved content during cache cleanup.

## 3. Suggested Implementation Order

1. Create a fresh React Native CLI TypeScript project named `MadheshiApp` at `D:\Dev\Projects\Madheshi\MadheshiApp`. The previous project was deleted; do not plan a migration or reuse its project files.
2. Scaffold the React Native CLI TypeScript app using npm; commit `package-lock.json`, then configure and verify the native Android project on an emulator/device.
3. Install and configure the pinned `react-native-nitro-sqlite` 10.3.0 and `react-native-nitro-modules` 0.37.2 dependencies; configure Jest's ESM transform for Nitro SQLite; verify local database creation, migrations/schema initialization and basic read/write behavior. Do not set up Python, FastAPI, PostgreSQL or a separate backend for V1.
4. Establish the app shell and React Navigation bottom tabs for Home, News, Calculator and Settings. Inside Calculator, implement horizontal Interest, Age and Land selector buttons using local component state.
5. Implement and test pure calculation-domain functions independently of UI.
6. Implement Interest Calculator using AD dates only, the approved month/day convention, annual compounding and final-only rounding.
7. Implement Age Calculator using the approved fixed 30/12 borrowing algorithm for AD and BS input.
8. Implement Land Calculator using the verified square-foot conversion registry.
9. Integrate [Madheshi.com](http://Madheshi.com) WordPress news, article details, categories, search and offline states.
10. Complete English/Nepali UI localization and Light/Dark theme persistence.
11. Run Android device-size, offline, regression and release tests.

This is a suggested sequence, not a requirement to rewrite working modules. Reuse existing code when it satisfies this V1 contract.

## 4. Code Organization Principles

- Keep each feature in its own module.
- Keep formulas in pure calculation functions/services, not inside screen widgets.
- Keep land conversion constants in one registry.
- Keep date validation and subtraction logic in reusable functions.
- Keep WordPress API access in a dedicated service/repository.
- Keep UI state separate from domain calculation rules.
- Use Redux Toolkit for shared in-memory application state and RTK Query for WordPress API requests, remote server state and request caching. Do not add Zustand or TanStack Query by default.
- Use SQLite for persistent local data. Keep cached news, bookmarks and preferences in clearly separated tables or data domains; protect bookmarks from automatic cache eviction. Bookmarks store a self-contained article snapshot and original saved timestamp, independent of the evictable news cache. Automatic cache eviction must never delete bookmarks.
- Use Redux Toolkit for active theme/language state and SQLite for their persisted values. Hydrate Redux from SQLite before the main app UI renders; dispatch immediate Redux updates for user changes and persist those changes asynchronously.
- Use component-local React state for state that does not need to be shared.
- Use React Native `StyleSheet`; do not add NativeWind or Tailwind CSS.
- Keep WordPress API access and SQLite data access in dedicated service/repository modules. Keep calculation logic independent of storage and UI.
- Avoid duplicate formulas in multiple screens.
- Do not add a general plugin/abstraction layer without a concrete V1 need.

## 5. Minimum Test Matrix

### News

- Latest feed loads and paginates without duplicate posts.
- Category selection returns the correct posts.
- Article detail renders available content and metadata.
- Missing featured image has a fallback.
- Search handles matches and no-results state.
- Offline mode displays cached content with a clear cached/offline label.
- Network errors show a friendly retry state, not raw exception text.
- Sharing opens/copies the canonical article URL.

### Interest

- Simple and compound modes are distinct and correct.
- Percentage and rupees-per-100 rate entry produce equivalent normalized rates.
- Simple interest does not capitalize after 12 months.
- Compound interest capitalizes only after a completed 12-month period.
- AD-only date cases cover month boundaries, year boundaries, leap-year behavior and clamped month anniversaries.
- Start-exclusive/end-inclusive elapsed-date convention, partial-month proration (remaining days / 30), annual compounding anniversaries and final-only round-half-up currency rounding are tested and documented.
- BS interest-date input is not part of V1.
- Invalid and reversed date ranges are rejected.

### Age

- Same start and end date returns zero.
- Day borrowing always uses 30.
- Month borrowing always uses 12.
- Borrowing cascades correctly from days to months to years.
- Both AD and BS inputs use the same algorithm.
- BS result shows the approximate-accuracy notice.
- Invalid and reversed dates are rejected.

### Land

- Every supported unit converts to its base unit.
- Reverse conversion is correct within display tolerance.
- Terai and Hill unit families remain separate.
- Metric conversions use the exact square-foot base factor.
- Zero, negative, decimal and large inputs are handled as specified.
- Conversion registry has source/verification notes.

### App-wide

- Bottom navigation displays exactly Home, News, Calculator and Settings in that order.
- Selecting Calculator opens its calculator screen with horizontal Interest, Age and Land selector buttons.
- Selecting each button displays the corresponding calculator content without creating extra navigation destinations or requiring a separate top tab navigator.
- The shared app header shows separate theme and language icon actions at the top-right on the main app screens; neither action adds a bottom tab.
- Tapping the theme icon immediately switches between Light and Dark across the app; tapping the language icon immediately switches between English and Nepali across the app.
- Theme and language selections persist in SQLite after app restart.
- English and Nepali UI language selection persists in SQLite.
- Light and Dark theme selection persists in SQLite.
- Cached news and explicit bookmarks persist correctly; cache cleanup never deletes bookmarks.
- Core calculators work in airplane mode.
- No deferred calculator appears in navigation.
- No crashes or layout overflow on supported small and large screens.
- Nepali text and digits render correctly according to the selected formatting policy.

## 6. V1 Release Gate

- [ ] V1 scope reviewed; no unapproved feature additions.
- [x] Framework baseline confirmed: React Native CLI + TypeScript; repository creation remains a setup step.
- [x] Styling baseline confirmed: React Native StyleSheet; no NativeWind or Tailwind CSS.
- [x] State/API baseline confirmed: Redux Toolkit + RTK Query.
- [x] V1 server boundary confirmed: no separate Python backend or PostgreSQL database; news uses the existing public WordPress REST API and calculations run locally.
- [x] Local persistence baseline confirmed: SQLite using `react-native-nitro-sqlite` 10.3.0 + `react-native-nitro-modules` 0.37.2; Redux Toolkit manages application state and RTK Query manages remote API data.
- [ ] Four main features implemented.
- [ ] Interest AD date-counting, partial-period and rounding rules documented and tested.
- [ ] Age algorithm matches the fixed 30-day and 12-month rule.
- [ ] BS age approximate notice is visible.
- [ ] Land conversion factors verified and test vectors pass.
- [ ] News API, pagination, article detail and error states work.
- [ ] Offline calculator behavior verified.
- [ ] Language/theme preferences persist.
- [ ] Manual regression tests pass on target Android devices.
- [ ] Build, signing and release configuration verified.
- [ ] Known limitations are documented in release notes.

## 7. Change Control During V1

- Do not add a new calculator or major feature without an explicit V1 scope decision.
- Fix defects and usability problems within the approved scope.
- If a requirement is unclear, record the exact blocking decision and resolve only that issue; do not expand the product specification.
- Keep calculation rules and conversion factors versioned in code or test fixtures where reproducibility requires it.
- Update these V1 documents only when a real product decision changes or an implementation detail needs to be made authoritative.
- Prefer implementation, tests and working builds over creating additional planning documents.
