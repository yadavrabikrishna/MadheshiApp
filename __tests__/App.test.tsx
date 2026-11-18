/**
 * End-to-end preference flow: the real app tree, Redux store, repository and
 * migrations, running on a real (Node) SQLite database instead of the device one.
 *
 * The database is shared by the tests in this file, and they run in order: each
 * "launch" is a fresh mount of <App /> (new Redux store) on the same database,
 * exactly like restarting the app.
 */
import { render, screen, userEvent } from '@testing-library/react-native';

import App from '../App';

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('../src/storage/database', () => {
  const {
    createRawTestDatabase,
    createTestDatabase,
  } = require('../src/test-utils/createTestDatabase');
  const raw = createRawTestDatabase();
  return { openDatabase: () => createTestDatabase(raw) };
});

// The first render loads React Navigation and every screen, which can take well
// over Jest's 5s default on a slower machine (e.g. Windows). Not a hang.
jest.setTimeout(60000);

const TAB_LABELS = {
  en: ['Home', 'News', 'Calculator', 'Settings'],
  ne: ['गृह', 'समाचार', 'क्यालकुलेटर', 'सेटिङ'],
};

async function launch() {
  const user = userEvent.setup();
  await render(<App />);
  // Waits for storage + hydration to finish and the real UI to appear.
  await screen.findByRole('button', { name: /, tab, 1 of 4/ });
  return user;
}

/** React Navigation labels tab buttons like "Home, tab, 1 of 4". */
function tab(label: string) {
  return screen.getByRole('button', { name: new RegExp(`^${label}, tab`) });
}

function expectTabLabels(language: 'en' | 'ne') {
  for (const label of TAB_LABELS[language]) {
    expect(tab(label)).toBeOnTheScreen();
  }
}

describe('preferences, end to end', () => {
  it('first launch: English and the light theme', async () => {
    await launch();
    expectTabLabels('en');
    expect(
      screen.getByRole('button', { name: 'Switch to dark theme' }),
    ).toBeOnTheScreen();
  });

  it('changing the language in the header translates the tabs and Settings immediately', async () => {
    const user = await launch();

    await user.press(screen.getByRole('button', { name: 'Change language' }));
    await user.press(screen.getByRole('radio', { name: 'नेपाली' }));
    expectTabLabels('ne');

    await user.press(tab('सेटिङ'));
    // Both Settings radios are still labelled in their own language.
    expect(
      screen.getByRole('radio', { name: 'नेपाली', selected: true }),
    ).toBeOnTheScreen();
    expect(screen.getByText('देखावट')).toBeOnTheScreen();
  });

  it('after a restart Nepali is still active, and Settings controls the header too', async () => {
    const user = await launch();
    expectTabLabels('ne');

    // The Settings control and the header control stay in sync.
    await user.press(tab('सेटिङ'));
    await user.press(screen.getByRole('radio', { name: 'English' }));
    expectTabLabels('en');
  });

  it('theme: Settings and the header toggle always show the same mode', async () => {
    const user = await launch();
    await user.press(tab('Settings'));

    expect(
      screen.getByRole('radio', { name: 'Light', selected: true }),
    ).toBeOnTheScreen();

    // Header -> Settings
    await user.press(
      screen.getByRole('button', { name: 'Switch to dark theme' }),
    );
    expect(
      screen.getByRole('radio', { name: 'Dark', selected: true }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Switch to light theme' }),
    ).toBeOnTheScreen();

    // Settings -> header
    await user.press(screen.getByRole('radio', { name: 'Light' }));
    expect(
      screen.getByRole('button', { name: 'Switch to dark theme' }),
    ).toBeOnTheScreen();

    // Repeated switching stays consistent.
    for (let i = 0; i < 3; i++) {
      await user.press(screen.getByRole('radio', { name: 'Dark' }));
      await user.press(screen.getByRole('radio', { name: 'Light' }));
    }
    await user.press(screen.getByRole('radio', { name: 'Dark' }));
  });

  it('after a restart the dark theme is restored', async () => {
    await launch();
    expect(
      screen.getByRole('button', { name: 'Switch to light theme' }),
    ).toBeOnTheScreen();
  });
});
