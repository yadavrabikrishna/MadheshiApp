/**
 * Calculator preferences and dynamic Calculator navigation, end to end: the real
 * app tree, Redux store, repository and migrations, on a real (Node) SQLite
 * database. A "restart" is a new mount of the app on the SAME database.
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppBootstrap, AppRoot } from '../src/app';
import type { PreferencesRepository } from '../src/storage';
import { runMigrations } from '../src/storage/migrations';
import { createPreferencesRepository } from '../src/storage/preferencesRepository';
import {
  createRawTestDatabase,
  createTestDatabase,
} from '../src/test-utils/createTestDatabase';
import {
  CALCULATOR_IDS,
  type CalculatorId,
  type EnabledCalculators,
} from '../src/types/calculators';

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('../src/storage/database', () => ({
  openDatabase: () => {
    throw new Error('The native database must not be used in tests');
  },
}));

// The first render loads React Navigation and every screen (see App.test.tsx).
jest.setTimeout(60000);

// ---------------------------------------------------------------- test helpers

type User = ReturnType<typeof userEvent.setup>;

function only(...ids: CalculatorId[]): EnabledCalculators {
  return Object.fromEntries(
    CALCULATOR_IDS.map(id => [id, ids.includes(id)]),
  ) as EnabledCalculators;
}

/** A brand-new database; every launch of one "device" shares it. */
function newDevice() {
  const file = createRawTestDatabase();
  const open = async (): Promise<PreferencesRepository> => {
    const db = createTestDatabase(file);
    await runMigrations(db);
    return createPreferencesRepository(db);
  };
  return {
    initializeStorage: open,
    /** Pre-load saved calculator settings, as if the user had saved them earlier. */
    async seed(enabled: EnabledCalculators, active: CalculatorId) {
      await (await open()).saveCalculatorSettings({ enabled, active });
    },
  };
}
type Device = ReturnType<typeof newDevice>;

async function launch(device: Device): Promise<User> {
  const user = userEvent.setup();
  await render(
    <SafeAreaProvider>
      <AppBootstrap initializeStorage={device.initializeStorage}>
        <AppRoot />
      </AppBootstrap>
    </SafeAreaProvider>,
  );
  await screen.findByRole('button', { name: /, tab, 1 of 4/ });
  return user;
}

const bottomTab = (label: string) =>
  screen.getByRole('button', { name: new RegExp(`^${label}, tab`) });

async function openCalculator(user: User) {
  await user.press(bottomTab('Calculator'));
}

// The Interest form has no rate-mode selector (Issue #51); its only radios are
// the duration input choice (Issue #62).
const RATE_MODE_RADIOS: string[] = ['Date range', 'Direct duration'];

async function launchOnCalculator(device: Device = newDevice()): Promise<User> {
  const user = await launch(device);
  await openCalculator(user);
  return user;
}

async function openCalculatorSettings(user: User) {
  await user.press(bottomTab('Settings'));
  await user.press(screen.getByRole('button', { name: 'Calculator Settings' }));
}

const topTabLabels = () =>
  screen.queryAllByRole('tab').map(node => node.props.accessibilityLabel);
const radioLabels = () =>
  screen.queryAllByRole('radio').map(node => node.props.accessibilityLabel);
const topTab = (name: string) => screen.getByRole('tab', { name });
const option = (name: string, selected?: boolean) =>
  screen.getByRole('radio', { name, selected });

const headerTitle = () => {
  const headings = screen.getAllByRole('heading');
  expect(headings).toHaveLength(1);
  return headings[0].props.children as string;
};

const calcSwitch = (name: string) => screen.getByRole('switch', { name });
const switchStates = (names: string[]) =>
  names.map(name => calcSwitch(name).props.value as boolean);
const setSwitch = (name: string, value: boolean) =>
  fireEvent(calcSwitch(name), 'valueChange', value);

const button = (name: string) => screen.getByRole('button', { name });

const EN_NAMES = [
  'Simple Interest',
  'Compound Interest',
  'Age (AD)',
  'Age (BS)',
  'Terai',
  'Hill / Mountain',
  'Basic Calculator',
];

const PLACEHOLDER = {
  simple: 'The simple interest calculator will be implemented in a later task.',
  compound:
    'The compound interest calculator will be implemented in a later task.',
  // Implemented in Issue #65: the BS Age view's approximation notice title.
  ageBs: 'Approximate result',
  basic:
    'The Basic Calculator interface and operations will be implemented in a future update.',
  basicNp:
    'सामान्य क्यालकुलेटरको इन्टरफेस र सञ्चालनहरू भविष्यको अपडेटमा तयार गरिनेछन्।',
};

async function changeLanguage(user: User, label: 'नेपाली' | 'English') {
  await user.press(
    screen.getByRole('button', {
      name: /^(Change language|भाषा परिवर्तन गर्नुहोस्)$/,
    }),
  );
  await user.press(screen.getByRole('radio', { name: label }));
}

afterEach(async () => {
  await cleanup();
});

// ------------------------------------------------------------------------ tests

describe('first-time defaults', () => {
  it('starts with the six specialist calculators on and Basic Calculator off', async () => {
    const user = await launch(newDevice());
    await openCalculatorSettings(user);

    expect(switchStates(EN_NAMES)).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
      false,
    ]);
  });

  it('keeps the existing three-group navigation and selectors, with Basic Calculator absent', async () => {
    await launchOnCalculator();

    expect(topTabLabels()).toEqual(['Interest', 'Age', 'Land']);
    expect(radioLabels()).toEqual([
      'Simple Interest',
      'Compound Interest',
      ...RATE_MODE_RADIOS, // the Simple Interest view's own selector
    ]);
    expect(screen.queryByText('Basic Calculator')).toBeNull();
  });

  it('opens Simple Interest first, the first calculator in the fallback order', async () => {
    await launchOnCalculator();

    expect(headerTitle()).toBe('Simple Interest');
    expect(option('Simple Interest', true)).toBeOnTheScreen();
  });
});

describe('Calculator Settings screen', () => {
  it('has one Calculator Settings entry on Settings that opens the dedicated screen', async () => {
    const user = await launch(newDevice());
    await user.press(bottomTab('Settings'));

    expect(
      screen.getAllByRole('button', { name: 'Calculator Settings' }),
    ).toHaveLength(1);

    await user.press(button('Calculator Settings'));
    expect(
      screen.getByText(
        'Turn calculators on or off. Changes apply when you press Save.',
      ),
    ).toBeOnTheScreen();
  });

  it('groups the six specialists under Interest, Age and Land and shows Basic Calculator separately', async () => {
    const user = await launch(newDevice());
    await openCalculatorSettings(user);

    const headings = screen
      .getAllByRole('header')
      .map(node => node.props.children);
    expect(headings).toEqual([
      'Specialist calculators',
      'Interest',
      'Age',
      'Land',
      'Basic Calculator',
      // The interest rate-entry section (Issue #50) follows the switches.
      'Interest rate entry',
      'Simple Interest',
      'Compound Interest',
    ]);
    expect(screen.getAllByRole('switch')).toHaveLength(7);
    expect(button('Select All')).toBeOnTheScreen();
    expect(button('Deselect All')).toBeOnTheScreen();
    expect(button('Save')).toBeOnTheScreen();
    expect(button('Cancel')).toBeOnTheScreen();
  });

  it('has seven independent switches', async () => {
    const user = await launch(newDevice());
    await openCalculatorSettings(user);

    for (const [index, name] of EN_NAMES.entries()) {
      const before = switchStates(EN_NAMES);
      await setSwitch(name, !before[index]);

      const after = switchStates(EN_NAMES);
      expect(after[index]).toBe(!before[index]);
      expect(after.filter((_, i) => i !== index)).toEqual(
        before.filter((_, i) => i !== index),
      );
    }
  });

  it('Select All turns all seven on and Deselect All turns all seven off', async () => {
    const user = await launch(newDevice());
    await openCalculatorSettings(user);

    await user.press(button('Select All'));
    expect(switchStates(EN_NAMES)).toEqual(Array(7).fill(true));

    await user.press(button('Deselect All'));
    expect(switchStates(EN_NAMES)).toEqual(Array(7).fill(false));
  });

  it('Cancel discards the draft and leaves the saved settings and Calculator untouched', async () => {
    const user = await launchOnCalculator();
    await user.press(topTab('Land'));
    await user.press(option('Hill / Mountain'));

    await openCalculatorSettings(user);
    await user.press(button('Deselect All'));
    await setSwitch('Basic Calculator', true);
    await user.press(button('Cancel'));

    // Back on Settings; reopening shows the SAVED settings.
    await user.press(button('Calculator Settings'));
    expect(switchStates(EN_NAMES)).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
      false,
    ]);
    await user.press(button('Cancel'));

    // Calculator navigation and the active calculator are unchanged.
    await openCalculator(user);
    expect(topTabLabels()).toEqual(['Interest', 'Age', 'Land']);
    expect(headerTitle()).toBe('Land (Hill / Mountain)');
  });

  it('applies nothing before Save', async () => {
    const device = newDevice();
    const user = await launch(device);
    await openCalculatorSettings(user);

    await setSwitch('Terai', false);
    await setSwitch('Hill / Mountain', false);
    await setSwitch('Basic Calculator', true);
    await cleanup(); // leave without saving

    const restarted = await launchOnCalculator(device);
    expect(restarted).toBeDefined();
    expect(topTabLabels()).toEqual(['Interest', 'Age', 'Land']);
  });

  it('Save applies the complete selection to the Calculator navigation and returns', async () => {
    const user = await launch(newDevice());
    await openCalculatorSettings(user);

    await setSwitch('Terai', false);
    await setSwitch('Hill / Mountain', false);
    await setSwitch('Basic Calculator', true);
    await user.press(button('Save'));

    // Back on the Settings tab.
    expect(button('Calculator Settings')).toBeOnTheScreen();

    await openCalculator(user);
    expect(topTabLabels()).toEqual(['Interest', 'Age', 'Basic Calculator']);
  });

  it('enables and activates Basic Calculator when everything is off, and explains why', async () => {
    const user = await launch(newDevice());
    await openCalculatorSettings(user);

    await user.press(button('Deselect All'));
    await user.press(button('Save'));

    const explanation =
      'At least one calculator must remain enabled, so Basic Calculator was turned on automatically.';
    expect(screen.getByText(explanation)).toBeOnTheScreen();
    expect(switchStates(EN_NAMES)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    ]);

    await user.press(button('Cancel'));
    await openCalculator(user);
    expect(topTabLabels()).toEqual([]); // a single calculator: no navigation
    expect(headerTitle()).toBe('Basic Calculator');
    expect(screen.getByText(PLACEHOLDER.basic)).toBeOnTheScreen();
  });

  it('never saves an all-off selection, even after a restart', async () => {
    const device = newDevice();
    const user = await launch(device);
    await openCalculatorSettings(user);
    await user.press(button('Deselect All'));
    await user.press(button('Save'));
    await cleanup();

    const restarted = await launch(device);
    await openCalculatorSettings(restarted);
    expect(switchStates(EN_NAMES)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    ]);
  });

  it('keeps the draft, in both languages, when the app language changes', async () => {
    const user = await launch(newDevice());
    await openCalculatorSettings(user);

    await setSwitch('Simple Interest', false);
    await setSwitch('Age (AD)', false);
    await setSwitch('Basic Calculator', true);
    const draft = switchStates(EN_NAMES);

    await changeLanguage(user, 'नेपाली');
    const NP_NAMES = [
      'घरेलु ब्याज',
      'साहु ब्याज',
      'उमेर (इस्वी संवत)',
      'उमेर (विक्रम संवत)',
      'तराई',
      'पहाड / हिमाल',
      'सामान्य क्यालकुलेटर',
    ];
    expect(switchStates(NP_NAMES)).toEqual(draft);
    expect(button('सुरक्षित गर्नुहोस्')).toBeOnTheScreen();
    expect(button('रद्द गर्नुहोस्')).toBeOnTheScreen();
    expect(button('सबै छनौट गर्नुहोस्')).toBeOnTheScreen();
    expect(button('सबै हटाउनुहोस्')).toBeOnTheScreen();

    await changeLanguage(user, 'English');
    expect(switchStates(EN_NAMES)).toEqual(draft);
  });

  it('shows the explanation in Nepali too', async () => {
    const user = await launch(newDevice());
    await openCalculatorSettings(user);
    await changeLanguage(user, 'नेपाली');

    await user.press(button('सबै हटाउनुहोस्'));
    await user.press(button('सुरक्षित गर्नुहोस्'));

    expect(
      screen.getByText(
        'कम्तीमा एउटा क्यालकुलेटर सक्रिय रहनुपर्छ, त्यसैले सामान्य क्यालकुलेटर स्वतः सक्रिय गरिएको छ।',
      ),
    ).toBeOnTheScreen();
  });
});

describe('dynamic Calculator navigation', () => {
  it('Compound Interest only: rendered directly, with no navigation and no selector', async () => {
    const device = newDevice();
    await device.seed(only('compoundInterest'), 'compoundInterest');
    await launchOnCalculator(device);

    expect(topTabLabels()).toEqual([]);
    // No Simple / Compound selector: only the shared form's rate-entry radios.
    expect(radioLabels()).toEqual(RATE_MODE_RADIOS);
    // The shared form, with Calculate unavailable until the engine exists.
    expect(screen.queryByText(PLACEHOLDER.compound)).toBeNull(); // no \"not implemented\" note
    expect(headerTitle()).toBe('Compound Interest');
  });

  it('Compound Interest + Age (BS): Interest and Age, each rendered directly', async () => {
    const device = newDevice();
    await device.seed(only('compoundInterest', 'ageBs'), 'compoundInterest');
    const user = await launchOnCalculator(device);

    expect(topTabLabels()).toEqual(['Interest', 'Age']);
    expect(radioLabels()).toEqual(RATE_MODE_RADIOS);
    expect(screen.queryByText(PLACEHOLDER.compound)).toBeNull(); // no \"not implemented\" note

    await user.press(topTab('Age'));
    expect(radioLabels()).toEqual([]);
    expect(screen.getByText(PLACEHOLDER.ageBs)).toBeOnTheScreen();
    expect(headerTitle()).toBe('Age (BS)');
  });

  it('Simple + Compound Interest + Terai: Interest keeps its selector, Land has none', async () => {
    const device = newDevice();
    await device.seed(
      only('simpleInterest', 'compoundInterest', 'terai'),
      'simpleInterest',
    );
    const user = await launchOnCalculator(device);

    expect(topTabLabels()).toEqual(['Interest', 'Land']);
    expect(radioLabels()).toEqual([
      'Simple Interest',
      'Compound Interest',
      ...RATE_MODE_RADIOS, // the Simple Interest view's own selector
    ]);

    await user.press(topTab('Land'));
    // No Land type selector; only the Terai view's own input mode and unit
    // selectors.
    expect(radioLabels()).toEqual([
      'Single Unit',
      'Mixed Units',
      'Bigha',
      'Kattha',
      'Dhur',
    ]);
    expect(screen.getByTestId('land-terai-view')).toBeOnTheScreen();
  });

  it('Basic Calculator + Compound Interest: two separate destinations', async () => {
    const device = newDevice();
    await device.seed(only('basic', 'compoundInterest'), 'compoundInterest');
    const user = await launchOnCalculator(device);

    expect(topTabLabels()).toEqual(['Interest', 'Basic Calculator']);
    // Basic Calculator is never inside the Interest selector.
    expect(radioLabels()).toEqual(RATE_MODE_RADIOS);

    await user.press(topTab('Basic Calculator'));
    expect(screen.getByText(PLACEHOLDER.basic)).toBeOnTheScreen();
    expect(radioLabels()).toEqual([]);
    expect(headerTitle()).toBe('Basic Calculator');
  });

  it('all seven: Basic Calculator is a fourth standalone destination after Land', async () => {
    const device = newDevice();
    await device.seed(only(...CALCULATOR_IDS), 'simpleInterest');
    await launchOnCalculator(device);

    expect(topTabLabels()).toEqual([
      'Interest',
      'Age',
      'Land',
      'Basic Calculator',
    ]);
    expect(radioLabels()).toEqual([
      'Simple Interest',
      'Compound Interest',
      ...RATE_MODE_RADIOS, // the Simple Interest view's own selector
    ]);
  });

  it('Basic Calculator only: rendered directly with no navigation', async () => {
    const device = newDevice();
    await device.seed(only('basic'), 'basic');
    await launchOnCalculator(device);

    expect(topTabLabels()).toEqual([]);
    expect(radioLabels()).toEqual([]);
    expect(screen.getByText(PLACEHOLDER.basic)).toBeOnTheScreen();
  });

  it('hides a group selector when only one calculator of the group is enabled', async () => {
    const device = newDevice();
    await device.seed(only('simpleInterest', 'ageAd', 'hillMountain'), 'ageAd');
    const user = await launchOnCalculator(device);

    expect(topTabLabels()).toEqual(['Interest', 'Age', 'Land']);
    for (const tab of ['Interest', 'Age', 'Land']) {
      await user.press(topTab(tab));
      // No group selector; only the Simple Interest view's rate-mode radios.
      expect(radioLabels()).toEqual(tab === 'Interest' ? RATE_MODE_RADIOS : []);
    }
  });

  it('never shows or offers a disabled calculator', async () => {
    const device = newDevice();
    await device.seed(
      only('simpleInterest', 'compoundInterest', 'ageBs', 'terai'),
      'simpleInterest',
    );
    const user = await launchOnCalculator(device);

    await user.press(topTab('Age'));
    expect(screen.queryByText('Age (AD)')).toBeNull();
    expect(screen.queryByText('AD (Gregorian)')).toBeNull();
    await user.press(topTab('Land'));
    expect(screen.queryByText('Hill / Mountain')).toBeNull();
    expect(screen.queryByText('Basic Calculator')).toBeNull();
  });

  it('leaves the bottom navigation unchanged', async () => {
    const device = newDevice();
    await device.seed(only('basic'), 'basic');
    await launchOnCalculator(device);

    expect(
      screen.getAllByRole('button', { name: /, tab, \d of 4/ }),
    ).toHaveLength(4);
    expect(bottomTab('Calculator')).toBeOnTheScreen();
  });

  it('applies a saved change to the Calculator immediately', async () => {
    const user = await launchOnCalculator();
    expect(topTabLabels()).toEqual(['Interest', 'Age', 'Land']);

    await user.press(bottomTab('Settings'));
    await user.press(button('Calculator Settings'));
    await setSwitch('Age (AD)', false);
    await setSwitch('Age (BS)', false);
    await user.press(button('Save'));
    await openCalculator(user);

    expect(topTabLabels()).toEqual(['Interest', 'Land']);
  });
});

describe('persistence, restoration and fallback', () => {
  it('restores the saved settings after a restart', async () => {
    const device = newDevice();
    const user = await launch(device);
    await openCalculatorSettings(user);
    await setSwitch('Terai', false);
    await setSwitch('Basic Calculator', true);
    await user.press(button('Save'));
    await cleanup();

    const restarted = await launch(device);
    await openCalculatorSettings(restarted);
    expect(switchStates(EN_NAMES)).toEqual([
      true,
      true,
      true,
      true,
      false,
      true,
      true,
    ]);
  });

  it('restores the last selected calculator after a restart while it is still enabled', async () => {
    const device = newDevice();
    const user = await launchOnCalculator(device);
    await user.press(topTab('Land'));
    await user.press(option('Hill / Mountain'));
    await cleanup();

    await launchOnCalculator(device);
    expect(headerTitle()).toBe('Land (Hill / Mountain)');
    expect(topTab('Land').props.accessibilityState.selected).toBe(true);
    expect(option('Hill / Mountain', true)).toBeOnTheScreen();
  });

  it('selects the first enabled calculator in order when the saved one is no longer enabled', async () => {
    const device = newDevice();
    await device.seed(only('hillMountain', 'ageBs', 'basic'), 'terai');
    await launchOnCalculator(device);

    expect(headerTitle()).toBe('Age (BS)');
  });

  it('keeps the active calculator when a saved change leaves it enabled', async () => {
    const user = await launchOnCalculator();
    await user.press(topTab('Land'));
    await user.press(option('Hill / Mountain'));

    await openCalculatorSettings(user);
    await setSwitch('Simple Interest', false);
    await user.press(button('Save'));
    await openCalculator(user);

    expect(headerTitle()).toBe('Land (Hill / Mountain)');
  });

  it('falls back to the first enabled calculator when the active one is disabled', async () => {
    const user = await launchOnCalculator();
    await user.press(topTab('Land'));
    await user.press(option('Hill / Mountain'));

    await openCalculatorSettings(user);
    await setSwitch('Hill / Mountain', false);
    await setSwitch('Terai', false);
    await setSwitch('Simple Interest', false);
    await user.press(button('Save'));
    await openCalculator(user);

    expect(headerTitle()).toBe('Compound Interest');
  });

  it('retains Basic Calculator as active when specialists are enabled and Basic stays on', async () => {
    const device = newDevice();
    await device.seed(only('basic'), 'basic');
    const user = await launch(device);

    await openCalculatorSettings(user);
    await setSwitch('Simple Interest', true);
    await setSwitch('Terai', true);
    await user.press(button('Save'));
    await openCalculator(user);

    expect(topTabLabels()).toEqual(['Interest', 'Land', 'Basic Calculator']);
    expect(headerTitle()).toBe('Basic Calculator');
    expect(topTab('Basic Calculator').props.accessibilityState.selected).toBe(
      true,
    );
  });

  it('the changed language and the active calculator survive each other', async () => {
    const device = newDevice();
    const user = await launchOnCalculator(device);
    await user.press(topTab('Age'));
    await changeLanguage(user, 'नेपाली');
    await cleanup();

    // The saved language is restored too, so the bottom tab is in Nepali.
    const restarted = await launch(device);
    await restarted.press(bottomTab('क्यालकुलेटर'));
    expect(headerTitle()).toBe('उमेर (विक्रम संवत)');
  });
});

describe('dynamic header title', () => {
  async function walkAllSeven(user: User, l: Record<string, string>) {
    const titles: string[] = [];
    await user.press(topTab(l.interest));
    await user.press(option(l.simple));
    titles.push(headerTitle());
    await user.press(option(l.compound));
    titles.push(headerTitle());
    await user.press(topTab(l.age));
    await user.press(option(l.ad));
    titles.push(headerTitle());
    await user.press(option(l.bs));
    titles.push(headerTitle());
    await user.press(topTab(l.land));
    await user.press(option(l.terai));
    titles.push(headerTitle());
    await user.press(option(l.hill));
    titles.push(headerTitle());
    await user.press(topTab(l.basic));
    titles.push(headerTitle());
    return titles;
  }

  const EN = {
    interest: 'Interest',
    age: 'Age',
    land: 'Land',
    basic: 'Basic Calculator',
    simple: 'Simple Interest',
    compound: 'Compound Interest',
    ad: 'AD (Gregorian)',
    bs: 'BS (Bikram Sambat)',
    terai: 'Terai',
    hill: 'Hill / Mountain',
  };
  const NP = {
    interest: 'ब्याज',
    age: 'उमेर',
    land: 'जमिन',
    basic: 'सामान्य क्यालकुलेटर',
    simple: 'घरेलु ब्याज',
    compound: 'साहु ब्याज',
    ad: 'इस्वी संवत',
    bs: 'विक्रम संवत',
    terai: 'तराई',
    hill: 'पहाड / हिमाल',
  };

  async function allSeven(): Promise<User> {
    const device = newDevice();
    await device.seed(only(...CALCULATOR_IDS), 'simpleInterest');
    return launchOnCalculator(device);
  }

  it('names all seven calculators in English', async () => {
    const user = await allSeven();
    expect(await walkAllSeven(user, EN)).toEqual([
      'Simple Interest',
      'Compound Interest',
      'Age (AD)',
      'Age (BS)',
      'Land (Terai)',
      'Land (Hill / Mountain)',
      'Basic Calculator',
    ]);
  });

  it('names all seven calculators in Nepali', async () => {
    const user = await allSeven();
    await changeLanguage(user, 'नेपाली');
    expect(await walkAllSeven(user, NP)).toEqual([
      'घरेलु ब्याज',
      'साहु ब्याज',
      'उमेर (इस्वी संवत)',
      'उमेर (विक्रम संवत)',
      'जमिन (तराई)',
      'जमिन (पहाड / हिमाल)',
      'सामान्य क्यालकुलेटर',
    ]);
  });

  it('re-translates immediately on a language change without resetting the active calculator or tab', async () => {
    const user = await allSeven();
    await user.press(topTab('Land'));
    await user.press(option('Hill / Mountain'));

    await changeLanguage(user, 'नेपाली');
    expect(headerTitle()).toBe('जमिन (पहाड / हिमाल)');
    expect(topTab('जमिन').props.accessibilityState.selected).toBe(true);
    expect(option('पहाड / हिमाल', true)).toBeOnTheScreen();

    await user.press(topTab('सामान्य क्यालकुलेटर'));
    await changeLanguage(user, 'English');
    expect(headerTitle()).toBe('Basic Calculator');
    expect(topTab('Basic Calculator').props.accessibilityState.selected).toBe(
      true,
    );
  });

  it('updates immediately when saving preferences, and when entering and leaving Basic Calculator mode', async () => {
    const user = await launchOnCalculator();
    expect(headerTitle()).toBe('Simple Interest');

    // Disable Interest entirely: the title moves to the next enabled calculator.
    await openCalculatorSettings(user);
    await setSwitch('Simple Interest', false);
    await setSwitch('Compound Interest', false);
    await user.press(button('Save'));
    await openCalculator(user);
    expect(headerTitle()).toBe('Age (AD)');

    // Basic Calculator only: enter Basic mode.
    await openCalculatorSettings(user);
    await user.press(button('Deselect All'));
    await setSwitch('Basic Calculator', true);
    await user.press(button('Save'));
    await openCalculator(user);
    expect(headerTitle()).toBe('Basic Calculator');

    // Leave Basic mode: enable Terai and turn Basic off.
    await openCalculatorSettings(user);
    await setSwitch('Terai', true);
    await setSwitch('Basic Calculator', false);
    await user.press(button('Save'));
    await openCalculator(user);
    expect(headerTitle()).toBe('Land (Terai)');
  });

  it('keeps the existing header controls working', async () => {
    const user = await launchOnCalculator();

    const toggle = () =>
      screen.getByRole('button', { name: /^Switch to (light|dark) theme$/ });
    const before = toggle().props.accessibilityLabel;
    await user.press(toggle());
    expect(toggle().props.accessibilityLabel).not.toBe(before);
    expect(headerTitle()).toBe('Simple Interest');
  });
});

describe('Basic Calculator placeholder', () => {
  it('shows its localized title and a placeholder message, with no keypad', async () => {
    const device = newDevice();
    await device.seed(only('basic'), 'basic');
    const user = await launchOnCalculator(device);

    expect(screen.getByText(PLACEHOLDER.basic)).toBeOnTheScreen();
    // Only the placeholder: no digit or operator buttons of any kind.
    expect(screen.queryByRole('button', { name: /^[0-9+\-×÷=.]$/ })).toBeNull();

    await changeLanguage(user, 'नेपाली');
    expect(screen.getByText(PLACEHOLDER.basicNp)).toBeOnTheScreen();
    expect(headerTitle()).toBe('सामान्य क्यालकुलेटर');
  });
});
