/**
 * The Hill / Mountain land calculator (Issue #78): the shared calculator with
 * the Hill configuration, driven end to end through the REAL conversion
 * service. Reference values were computed independently with exact rational
 * arithmetic (1 Ropani = 5,476 sq ft = 16 Aana = 64 Paisa = 256 Daam).
 */
import {
  act,
  render,
  screen,
  userEvent,
  within,
} from '@testing-library/react-native';
import { useState } from 'react';
import { Provider } from 'react-redux';

import { setLanguage } from '../../../../features/preferences';
import { en } from '../../../../i18n/resources/en';
import { np } from '../../../../i18n/resources/np';
import type { PreferencesRepository } from '../../../../storage';
import { createAppStore } from '../../../../store';
import { installFakeClipboard } from '../../../../test-utils/fakeClipboard';
import type { CalculatorId } from '../../../../types/calculators';
import { HillMountainLandView } from '../HillMountainLandView';
import { LandCalculatorView } from '../LandCalculatorView';

jest.setTimeout(30000);

type Unit = 'ropani' | 'aana' | 'paisa' | 'daam';
const UNITS: Unit[] = ['ropani', 'aana', 'paisa', 'daam'];
const L = en;

function makeStore() {
  return createAppStore({
    preferencesRepository: {
      saveLanguage: jest.fn().mockResolvedValue(undefined),
      saveTheme: jest.fn().mockResolvedValue(undefined),
      saveInterestRateConfig: jest.fn().mockResolvedValue(undefined),
    } as unknown as PreferencesRepository,
    getSystemTheme: () => 'light',
  });
}
async function launch() {
  const store = makeStore();
  const user = userEvent.setup();
  await render(
    <Provider store={store}>
      <HillMountainLandView />
    </Provider>,
  );
  return { store, user };
}

const mode = (name: string) => screen.getByRole('radio', { name });
const single = () => screen.getByLabelText(L['land.hill.input.label']);
const field = (unit: Unit, labels: Record<string, string> = L) =>
  screen.getByLabelText(labels[`land.unit.${unit}`]);
const calculate = () =>
  screen.getByRole('button', { name: L['land.terai.calculate'] });
const result = () => screen.queryByTestId('land-result');
const row = (group: string, label: string, text: string) =>
  expect(
    within(screen.getByTestId(`land-group-${group}`)).getByLabelText(
      `${label}: ${text}`,
    ),
  ).toBeOnTheScreen();

type Rows = Record<string, string>;
const expectRows = (group: string, rows: Rows) => {
  for (const [label, text] of Object.entries(rows)) {
    row(group, label, text);
  }
};

async function calcSingle(
  user: ReturnType<typeof userEvent.setup>,
  unit: Unit,
  text: string,
) {
  await user.press(mode(L['land.mode.single']));
  await user.press(mode(L[`land.unit.${unit}`]));
  await user.clear(single());
  if (text !== '') {
    await user.type(single(), text);
  }
  await user.press(calculate());
}
async function calcMixed(
  user: ReturnType<typeof userEvent.setup>,
  values: Partial<Record<Unit, string>>,
) {
  await user.press(mode(L['land.mode.mixed']));
  for (const unit of UNITS) {
    await user.clear(field(unit));
    if (values[unit]) {
      await user.type(field(unit), values[unit]);
    }
  }
  await user.press(calculate());
}

describe('Hill / Mountain: Single Unit, every unit (real service)', () => {
  const CASES: {
    unit: Unit;
    terai: Rows;
    hilly: Rows;
    other: Rows;
  }[] = [
    {
      unit: 'ropani',
      terai: { Bigha: '0', Kattha: '1', Dhur: '10.0466' },
      hilly: { Ropani: '1', Aana: '0', Paisa: '0', Daam: '0' },
      other: {
        'Square feet': '5,476',
        'Square metres': '508.737',
        Hectare: '0.0509',
        Acre: '0.1257',
      },
    },
    {
      unit: 'aana',
      terai: { Bigha: '0', Kattha: '0', Dhur: '1.8779' },
      hilly: { Ropani: '0', Aana: '1', Paisa: '0', Daam: '0' },
      other: {
        'Square feet': '342.25',
        'Square metres': '31.7961',
        Hectare: '0.0032',
        Acre: '0.0079',
      },
    },
    {
      unit: 'paisa',
      terai: { Bigha: '0', Kattha: '0', Dhur: '0.4695' },
      hilly: { Ropani: '0', Aana: '0', Paisa: '1', Daam: '0' },
      other: {
        'Square feet': '85.5625',
        'Square metres': '7.949',
        Hectare: '0.0008',
        Acre: '0.002',
      },
    },
    {
      unit: 'daam',
      terai: { Bigha: '0', Kattha: '0', Dhur: '0.1174' },
      hilly: { Ropani: '0', Aana: '0', Paisa: '0', Daam: '1' },
      other: {
        'Square feet': '21.3906',
        'Square metres': '1.9873',
        Hectare: '0.0002',
        Acre: '0.0005',
      },
    },
  ];

  it.each(CASES)('1 $unit gives the independent reference values', async c => {
    const { user } = await launch();
    await calcSingle(user, c.unit, '1');
    expect(
      screen.getByText(`Input: 1 ${L[`land.unit.${c.unit}`]}`),
    ).toBeOnTheScreen();
    expectRows('terai', c.terai);
    expectRows('hilly', c.hilly);
    expectRows('other', c.other);
  });

  it('decimals: 0.5 Ropani = 8 Aana; 1.5 Aana = 1 Aana 2 Paisa', async () => {
    const { user } = await launch();
    await calcSingle(user, 'ropani', '0.5');
    expectRows('hilly', { Ropani: '0', Aana: '8', Paisa: '0', Daam: '0' });
    expectRows('other', { 'Square feet': '2,738' });
    await calcSingle(user, 'aana', '1.5');
    expectRows('hilly', { Ropani: '0', Aana: '1', Paisa: '2', Daam: '0' });
    expectRows('other', { 'Square feet': '513.375' });
  });

  it('carries and rounds: 17 Aana, and 3.99996 Daam becomes 1 Paisa', async () => {
    const { user } = await launch();
    await calcSingle(user, 'aana', '17');
    expectRows('hilly', { Ropani: '1', Aana: '1', Paisa: '0', Daam: '0' });
    await calcSingle(user, 'daam', '3.99996');
    expectRows('hilly', { Ropani: '0', Aana: '0', Paisa: '1', Daam: '0' });
  });

  it('zero is valid; empty, malformed and negative are rejected with inline errors', async () => {
    const { user } = await launch();
    await calcSingle(user, 'ropani', '0');
    expect(result()).not.toBeNull();
    expectRows('other', { 'Square feet': '0' });

    for (const [text, message] of [
      ['', L['land.error.empty']],
      ['abc', L['land.error.malformed']],
      ['1.2.3', L['land.error.malformed']],
      ['-1', L['land.error.negative']],
    ] as const) {
      await calcSingle(user, 'ropani', text);
      expect(result()).toBeNull();
      expect(screen.getByText(new RegExp(message))).toBeOnTheScreen();
    }
  });

  it('a very large value stays exact (no exponent notation)', async () => {
    const { user } = await launch();
    await calcSingle(user, 'ropani', '123456789012345678901234567890');
    // 123456789012345678901234567890 x 5,476 sq ft
    expectRows('other', {
      'Square feet': '676,049,376,631,604,937,663,160,493,765,640',
    });
  });
});

describe('Hill / Mountain: Mixed Units (real service)', () => {
  it('2 Ropani, 3 Aana, 1 Paisa, 2 Daam (independent reference)', async () => {
    const { user } = await launch();
    await calcMixed(user, { ropani: '2', aana: '3', paisa: '1', daam: '2' });
    expect(
      screen.getByText('Input: 2 Ropani, 3 Aana, 1 Paisa, 2 Daam'),
    ).toBeOnTheScreen();
    expectRows('hilly', { Ropani: '2', Aana: '3', Paisa: '1', Daam: '2' });
    expectRows('terai', { Bigha: '0', Kattha: '3', Dhur: '6.4312' });
    expectRows('other', {
      'Square feet': '12,107.0938',
      'Square metres': '1,124.7858',
      Hectare: '0.1125',
      Acre: '0.2779',
    });
  });

  it('blank fields count as zero and are left out of the input line', async () => {
    const { user } = await launch();
    await calcMixed(user, { aana: '16', daam: '' });
    expect(screen.getByText('Input: 16 Aana')).toBeOnTheScreen();
    expectRows('hilly', { Ropani: '1', Aana: '0', Paisa: '0', Daam: '0' });
  });

  it('decimals in any field', async () => {
    const { user } = await launch();
    await calcMixed(user, { ropani: '0.25', aana: '0.5' });
    // 0.25 x 5,476 + 0.5 x 342.25 = 1,540.125 sq ft
    expectRows('other', { 'Square feet': '1,540.125' });
  });

  it('all blank: "at least one value"; all zero is valid', async () => {
    const { user } = await launch();
    await calcMixed(user, {});
    expect(
      screen.getByText(new RegExp(L['land.error.mixedEmpty'])),
    ).toBeOnTheScreen();
    expect(result()).toBeNull();
    await calcMixed(user, { ropani: '0', aana: '0' });
    expect(result()).not.toBeNull();
    expectRows('other', { 'Square feet': '0' });
  });

  it('malformed and negative fields are named; nothing is converted', async () => {
    const { user } = await launch();
    await calcMixed(user, { ropani: '1', aana: 'x', paisa: '-2' });
    expect(
      screen.getByText(
        new RegExp(`${L['land.unit.aana']}: ${L['land.error.malformed']}`),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        new RegExp(`${L['land.unit.paisa']}: ${L['land.error.negative']}`),
      ),
    ).toBeOnTheScreen();
    expect(result()).toBeNull();
  });

  it('a mixed input gives the same result as the equivalent single-unit input', async () => {
    const clipboard = installFakeClipboard();
    const { user } = await launch();
    const body = async () => {
      await user.press(screen.getByRole('button', { name: 'Copy' }));
      // Everything after the title and the input line.
      return clipboard.content?.split('\n').slice(2).join('\n');
    };

    await calcSingle(user, 'daam', '277');
    const single277 = await body();
    await calcMixed(user, { ropani: '1', aana: '1', paisa: '1', daam: '1' });
    expect(await body()).toBe(single277);

    await calcSingle(user, 'ropani', '1');
    const single1 = await body();
    await calcMixed(user, { aana: '16' });
    expect(await body()).toBe(single1);
    await calcMixed(user, { paisa: '64' });
    expect(await body()).toBe(single1);
    await calcMixed(user, { daam: '256' });
    expect(await body()).toBe(single1);
  });
});

describe('Hill / Mountain: result card and actions (real service)', () => {
  it('shows Terai, Hilly, Other Units in that order under the Hill title', async () => {
    const { user } = await launch();
    await calcSingle(user, 'ropani', '1');
    const titles = within(screen.getByTestId('land-result-image'))
      .getAllByRole('header')
      .map(h => h.props.children);
    expect(titles).toEqual([
      L['calculator.title.land.hillMountain'],
      L['land.group.terai'],
      L['land.group.hilly'],
      L['land.group.other'],
    ]);
  });

  it('shows the Hill quick reference below the results, and not the Terai one', async () => {
    const { user } = await launch();
    expect(screen.getByTestId('land-quick-reference')).toBeOnTheScreen();
    expect(screen.getByText(L['land.hill.quickRef.body'])).toBeOnTheScreen();
    expect(screen.queryByText(L['land.quickRef.body'])).toBeNull();
    await calcSingle(user, 'ropani', '1');
    expect(screen.getByText(L['land.hill.quickRef.body'])).toBeOnTheScreen();
  });

  it('Copy sends the complete Hill result, with the Hill title and the input line', async () => {
    const clipboard = installFakeClipboard();
    const { user } = await launch();
    await calcMixed(user, { ropani: '2', aana: '3' });
    await user.press(screen.getByRole('button', { name: 'Copy' }));
    const lines = clipboard.content?.split('\n') ?? [];
    expect(lines.slice(0, 4)).toEqual([
      'Land (Hill / Mountain)',
      'Input: 2 Ropani, 3 Aana',
      '',
      L['land.group.terai'],
    ]);
    expect(lines).toContain(L['land.group.hilly']);
    expect(lines).toContain(L['land.group.other']);
    expect(lines).toContain('Ropani: 2');
    expect(lines).toContain('Square feet: 11,978.75');
  });

  it('offers Copy, Share and Save Image only while a result is shown', async () => {
    const { user } = await launch();
    for (const name of ['Copy', 'Share', 'Save Image']) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
    await calcSingle(user, 'ropani', '1');
    for (const name of ['Copy', 'Share', 'Save Image']) {
      expect(screen.getByRole('button', { name })).toBeOnTheScreen();
    }
    await user.type(single(), '2');
    expect(screen.queryByRole('button', { name: 'Copy' })).toBeNull();
  });

  it('never calculates while typing', async () => {
    const { user } = await launch();
    await user.type(single(), '1');
    expect(result()).toBeNull();
    await user.press(mode(L['land.mode.mixed']));
    await user.type(field('aana'), '3');
    expect(result()).toBeNull();
  });
});

describe('Hill / Mountain: Nepali', () => {
  it('labels, input line, results and copied text use Nepali words and digits', async () => {
    const clipboard = installFakeClipboard();
    const { store, user } = await launch();
    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });
    expect(
      screen.getByRole('radio', { name: np['land.mode.single'] }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('१ रोपनी = १६ आना = ६४ पैसा = २५६ दाम'),
    ).toBeOnTheScreen();

    await user.press(
      screen.getByRole('radio', { name: np['land.mode.mixed'] }),
    );
    await user.type(field('ropani', np), '2');
    await user.type(field('aana', np), '3');
    await user.press(
      screen.getByRole('button', { name: np['land.terai.calculate'] }),
    );
    expect(screen.getByText('इनपुट: २ रोपनी, ३ आना')).toBeOnTheScreen();
    expect(
      screen.getByText(np['calculator.title.land.hillMountain']),
    ).toBeOnTheScreen();
    row('other', 'वर्ग फिट', '११,९७८.७५');
    await user.press(
      screen.getByRole('button', { name: np['resultActions.copy'] }),
    );
    expect(clipboard.content).toContain('इनपुट: २ रोपनी, ३ आना');
    expect(clipboard.content).not.toMatch(/[0-9]/);
  });
});

describe('Land: switching between Terai and Hill / Mountain', () => {
  function Host() {
    const [value, setValue] = useState<CalculatorId>('terai');
    return (
      <LandCalculatorView
        calculators={['terai', 'hillMountain']}
        value={value}
        onChange={setValue}
      />
    );
  }
  const type = (name: string) => screen.getByRole('radio', { name });

  it('does not leak input, errors or results between the families', async () => {
    const user = userEvent.setup();
    await render(
      <Provider store={makeStore()}>
        <Host />
      </Provider>,
    );

    // Terai: a result.
    expect(screen.getByTestId('land-terai-view')).toBeOnTheScreen();
    await user.type(screen.getByLabelText(L['land.terai.input.label']), '1');
    await user.press(calculate());
    expect(screen.getByText('Land (Terai)')).toBeOnTheScreen();

    // Hill / Mountain: starts clean (no input, no result), with its own units.
    await user.press(type('Hill / Mountain'));
    expect(screen.getByTestId('land-hill-view')).toBeOnTheScreen();
    expect(screen.queryByTestId('land-terai-view')).toBeNull();
    expect(single().props.value).toBe('');
    expect(result()).toBeNull();
    expect(screen.queryByText('Land (Terai)')).toBeNull();
    expect(
      screen.queryByRole('radio', { name: L['land.unit.bigha'] }),
    ).toBeNull();
    // An error here...
    await user.press(calculate());
    expect(
      screen.getByText(new RegExp(L['land.error.empty'])),
    ).toBeOnTheScreen();
    await user.type(single(), '1');
    await user.press(calculate());
    expect(screen.getByText('Land (Hill / Mountain)')).toBeOnTheScreen();
    await user.clear(single());
    await user.press(calculate());
    expect(
      screen.getByText(new RegExp(L['land.error.empty'])),
    ).toBeOnTheScreen();

    // ...does not appear in Terai, which shows no stale input, error or result.
    await user.press(type('Terai'));
    expect(screen.getByTestId('land-terai-view')).toBeOnTheScreen();
    expect(screen.getByLabelText(L['land.terai.input.label']).props.value).toBe(
      '',
    );
    expect(screen.queryByText(new RegExp(L['land.error.empty']))).toBeNull();
    expect(result()).toBeNull();
    expect(screen.queryByText('Land (Hill / Mountain)')).toBeNull();
  });
});
