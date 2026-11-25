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
    common/                    Button, FieldError, Icon, MaskedField, ResultActions (Copy / Share / Save
                               Image row, UI only), ScreenPlaceholder, SegmentedControl,
                               SwitchRow, TextField, TopTabs, useKeyboardAwareForm (keyboard
                               inset + scroll-into-view hook)
    header/                    Top-right header controls (theme, language)
  features/                  One folder per feature: Redux slice, selectors, tests
    preferences/               Theme + language state and persistence thunks
    calculators/               Which calculators are enabled + the active one (saved state),
                               calculatorModel.ts = pure navigation/fallback rules
    interestRateConfig/        Per-calculator (Simple / Compound) rate-entry configuration: state,
                               selectors, persistence thunks (model: types/interestRateConfig.ts)
    resultActions/             Copy-to-clipboard for result summaries: clipboard.ts
                               (copyTextToClipboard, verifies by reading back because Android
                               swallows native write errors), useCopyResult.ts (hook: copy +
                               auto-hiding localized feedback), shareImage.ts (captures one view
                               as a PNG with react-native-view-shot and opens the share sheet with
                               react-native-share) and useShareResultImage.ts (hook: ref to the
                               view to capture + share + error-only feedback), saveImage.ts (captures
                               one view and saves it to the Android gallery with
                               @react-native-camera-roll/camera-roll; asks for storage permission
                               only on Android 9 and earlier) and useSaveResultImage.ts (hook:
                               save + success/error feedback); public API via index.ts
    date/                      Shared pure fixed-date arithmetic used by Interest and Age
                               (fixedDate.ts: YYYY/MM/DD validation + fixed 30-day/12-month
                               duration; no calendar rules); public API via index.ts
    age/                       Pure Age calculation (ageCalculator.ts: calculateAge, validation
                               codes, fixed borrowing algorithm via ../date)
    interest/                  Pure Simple Interest calculation engine (no React/Redux/storage):
                               decimal.ts (cloned Decimal, input parsing),
                               rate.ts (rate-mode normalisation), directDuration.ts (direct Years/Months/Days -> fixed
                               duration and neutral dates), configuredRate.ts (saved rate
                               configuration -> monthly % and compounding period), simpleInterest.ts
                               (calculateSimpleInterest); public API via index.ts
  utils/                     Pure helpers: formatMoney (Decimal, half-up, Indian grouping),
                               maskedInput (value/display masks and caret-preserving edits), fillTemplate
  i18n/                      Centralized translations (en, np) and useTranslation
    resources/                 en.ts defines the keys; np.ts must match
  navigation/                React Navigation setup and route types
  screens/                   One folder per screen (Home, News, Calculator, Settings)
    Calculator/                CalculatorScreen builds its navigation from the SAVED calculator
                               settings in Redux and sets the header title (calculatorLabels.ts),
                               CalculatorGroupView = a group's selector (only when 2+ are enabled),
                               + one folder per calculator
      InterestCalculator/        InterestCalculatorView (Simple / Compound selector),
                                 InterestCalculatorForm = the ONE Interest UI used by both types,
                                 interestCalculatorConfig.ts (InterestType, the InterestEngine
                                 boundary and INTEREST_CALCULATOR_CONFIGS: Simple has the Simple
                                 Interest engine, Compound has the Compound engine), interestForm.ts, interestModeText.ts (per-mode title, interest label, share file name)
                                 (engine-injected form reducer), SimpleInterestView and
                                 CompoundInterestView (thin wrappers that pick a config),
                                 SimpleInterestResultCard, error-message mapping,
                                 simpleInterestDisplay.ts = the displayed text shared by the card
                                 and the copied summary, simpleInterestSummary.ts = plain-text summary
      AgeCalculator/             AgeCalculatorView, AdAgeView, BsAgeView
      LandCalculator/            LandCalculatorView, TeraiLandView, HillMountainLandView
      BasicCalculator/           BasicCalculatorView (placeholder; a feature of this app)
    Settings/                  SettingsScreen, CalculatorSettingsScreen (draft until Save),
                               InterestRateSettingsSection (per-calculator rate entry; applies at once)
  storage/                   SQLite: connection, versioned migrations, repositories
  store/                     Redux store factory and typed hooks
  test-utils/                Jest helpers (real SQLite via node:sqlite, fakeClipboard); not shipped
  theme/                     Color tokens, light/dark themes, navigation theme, hooks
  types/                     Shared domain types and constants
```

## Rules

- **Redux owns live state; SQLite owns durable state.** Components read Redux and
  dispatch thunks. They never call SQLite. A change updates Redux immediately,
  then is written to SQLite asynchronously. A failed write sets an error flag in
  Redux (shown in Settings) instead of being ignored.
- **Preference writes are ordered.** The repository runs writes one after another in
  the order requested, so a slow older write can never overwrite a newer selection.
- **Storage is behind repositories** (`src/storage`). The native driver is
  imported in exactly one file (`database.ts`). Schema changes are new entries in
  `migrations.ts`; never edit a released migration.
- **Calculator settings: draft vs saved.** Calculator Settings edits a local draft;
  only Save writes it to Redux (`saveCalculatorSettings`) and then to SQLite, in the
  existing `preferences` table under `calculatorsEnabled` (one JSON row, so the seven
  switches are saved as a unit) and `calculatorActive` (last selected). No migration
  was needed. The Calculator screen only ever reads the saved state, and an all-off
  selection is never saved (Basic Calculator is turned on instead).
- **Colors come from theme tokens** (`useAppTheme`, `useThemedStyles`), never
  hard-coded hex values in components.
- **Strings come from `src/i18n/resources`.** Add every new key to `en.ts` and
  `np.ts`; the compiler fails if Nepali is missing one.
- **Icons go through `components/common/Icon`.**
- **Dependencies are injected** into the store (`createAppStore`) so tests can use
  a fake or a Node SQLite database instead of the device driver.
- New features follow the same shape: `features/<name>/` for state, `screens/<Name>/`
  for UI, a storage repository only when data must persist.
