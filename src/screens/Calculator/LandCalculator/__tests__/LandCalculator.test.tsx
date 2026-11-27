/**
 * The shared, configuration-driven land calculator (Issue #77), exercised with
 * the Hill / Mountain configuration (not yet shown on any screen) and the real
 * conversion service. The Terai configuration's behaviour is covered in
 * TeraiLandView.test.tsx.
 */
import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
  within,
} from '@testing-library/react-native';
import Share from 'react-native-share';
import { captureRef } from 'react-native-view-shot';
import { Keyboard, StyleSheet, TextInput } from 'react-native';
import { Provider } from 'react-redux';

import { landConversionService } from '../../../../features/land';
import { setLanguage } from '../../../../features/preferences';
import { en } from '../../../../i18n/resources/en';
import { np } from '../../../../i18n/resources/np';
import type { PreferencesRepository } from '../../../../storage';
import { createAppStore } from '../../../../store';
import { installFakeClipboard } from '../../../../test-utils/fakeClipboard';
import { LandCalculator } from '../LandCalculator';
import { HILL_LAND_CONFIG, TERAI_LAND_CONFIG } from '../landFamilyConfig';

jest.setTimeout(30000);

function setup(config = HILL_LAND_CONFIG, service = landConversionService) {
  const store = createAppStore({
    preferencesRepository: {
      saveLanguage: jest.fn().mockResolvedValue(undefined),
      saveTheme: jest.fn().mockResolvedValue(undefined),
      saveInterestRateConfig: jest.fn().mockResolvedValue(undefined),
    } as unknown as PreferencesRepository,
    getSystemTheme: () => 'light',
  });
  return {
    store,
    user: userEvent.setup(),
    ui: (
      <Provider store={store}>
        <LandCalculator config={config} service={service} />
      </Provider>
    ),
  };
}

const L = en;
type HillUnit = 'ropani' | 'aana' | 'paisa' | 'daam';
const mode = (name: string) => screen.getByRole('radio', { name });
const field = (unit: HillUnit, labels: Record<string, string> = L) =>
  screen.getByLabelText(labels[`land.unit.${unit}`]);
const calculate = () =>
  screen.getByRole('button', { name: L['land.terai.calculate'] });
const result = () => screen.queryByTestId('land-result');
const row = (group: string, label: string, text: string) =>
  within(screen.getByTestId(`land-group-${group}`)).getByLabelText(
    `${label}: ${text}`,
  );

describe('LandCalculator with the Hill / Mountain configuration', () => {
  it('shows the Hill units, texts and reference, and no Terai units', async () => {
    const { ui } = setup();
    await render(ui);
    expect(screen.getByTestId('land-hill-view')).toBeOnTheScreen();
    for (const unit of ['ropani', 'aana', 'paisa', 'daam'] as const) {
      expect(
        screen.getByRole('radio', { name: L[`land.unit.${unit}`] }),
      ).toBeOnTheScreen();
    }
    for (const unit of ['bigha', 'kattha', 'dhur'] as const) {
      expect(
        screen.queryByRole('radio', { name: L[`land.unit.${unit}`] }),
      ).toBeNull();
    }
    expect(
      screen.getByRole('radio', { name: L['land.unit.ropani'] }).props
        .accessibilityState.selected,
    ).toBe(true);
    expect(screen.getByLabelText(L['land.hill.input.label'])).toBeOnTheScreen();
    expect(screen.getByText(L['land.hill.quickRef.title'])).toBeOnTheScreen();
    expect(screen.getByText(L['land.hill.quickRef.body'])).toBeOnTheScreen();
    expect(screen.queryByText(L['land.quickRef.body'])).toBeNull();
    expect(result()).toBeNull();
  });

  it('Single Unit: 1 Ropani gives the independently computed values, Terai first', async () => {
    const { ui, user } = setup();
    await render(ui);
    await user.type(screen.getByLabelText(L['land.hill.input.label']), '1');
    await user.press(calculate());

    const titles = within(screen.getByTestId('land-result-image'))
      .getAllByRole('header')
      .map(h => h.props.children);
    expect(titles).toEqual([
      L['calculator.title.land.hillMountain'],
      L['land.group.terai'],
      L['land.group.hilly'],
      L['land.group.other'],
    ]);
    expect(screen.getByText('Input: 1 Ropani')).toBeOnTheScreen();
    row('terai', 'Bigha', '0');
    row('terai', 'Kattha', '1');
    row('terai', 'Dhur', '10.0466');
    row('hilly', 'Ropani', '1');
    row('hilly', 'Aana', '0');
    row('other', 'Square feet', '5,476');
    row('other', 'Square metres', '508.737');
    row('other', 'Hectare', '0.0509');
    row('other', 'Acre', '0.1257');
  });

  it('Single Unit: another unit from the selector', async () => {
    const { ui, user } = setup();
    await render(ui);
    await user.press(mode(L['land.unit.aana']));
    await user.type(screen.getByLabelText(L['land.hill.input.label']), '1.5');
    await user.press(calculate());
    expect(screen.getByText('Input: 1.5 Aana')).toBeOnTheScreen();
    row('hilly', 'Aana', '1');
    row('hilly', 'Paisa', '2');
    row('other', 'Square feet', '513.375');
  });

  it('never calculates while typing; editing clears the result', async () => {
    const { ui, user } = setup();
    await render(ui);
    const input = screen.getByLabelText(L['land.hill.input.label']);
    await user.type(input, '1');
    expect(result()).toBeNull();
    await user.press(calculate());
    expect(result()).not.toBeNull();
    await user.type(input, '2');
    expect(result()).toBeNull();
  });

  it('Single Unit validation: empty, malformed, negative; zero is valid', async () => {
    const { ui, user } = setup();
    await render(ui);
    const input = screen.getByLabelText(L['land.hill.input.label']);
    await user.press(calculate());
    expect(
      screen.getByText(new RegExp(L['land.error.empty'])),
    ).toBeOnTheScreen();
    await user.type(input, 'abc');
    await user.press(calculate());
    expect(
      screen.getByText(new RegExp(L['land.error.malformed'])),
    ).toBeOnTheScreen();
    await user.clear(input);
    await user.type(input, '-1');
    await user.press(calculate());
    expect(
      screen.getByText(new RegExp(L['land.error.negative'])),
    ).toBeOnTheScreen();
    expect(result()).toBeNull();
    await user.clear(input);
    await user.type(input, '0');
    await user.press(calculate());
    expect(result()).not.toBeNull();
    row('other', 'Square feet', '0');
  });
});

describe('Mixed Units with four fields', () => {
  async function openMixed() {
    const ctx = setup();
    await render(ctx.ui);
    await ctx.user.press(mode(L['land.mode.mixed']));
    return ctx;
  }

  it('renders one equal-width column per unit, in the family order, with the Hill hint', async () => {
    await openMixed();
    const rowView = screen.getByTestId('land-mixed-row');
    expect(StyleSheet.flatten(rowView.props.style).flexDirection).toBe('row');
    const columns = rowView.children as unknown as {
      props: { style?: unknown };
    }[];
    expect(columns).toHaveLength(4);
    const styles = columns.map(c =>
      JSON.stringify(StyleSheet.flatten(c.props.style as never)),
    );
    expect(new Set(styles).size).toBe(1);
    expect(JSON.parse(styles[0])).toMatchObject({ flex: 1, minWidth: 0 });
    expect(
      within(rowView)
        .getAllByText(/./)
        .slice(0, 4)
        .map(n => n.props.children),
    ).toEqual([
      L['land.unit.ropani'],
      L['land.unit.aana'],
      L['land.unit.paisa'],
      L['land.unit.daam'],
    ]);
    expect(screen.getByText(L['land.hill.mixed.hint'])).toBeOnTheScreen();
    expect(screen.queryByText(L['land.mixed.hint'])).toBeNull();
  });

  it('Next, Next, Next, Done across four fields', async () => {
    const focusMock = (TextInput.prototype as unknown as { focus: jest.Mock })
      .focus;
    const dismiss = jest.spyOn(Keyboard, 'dismiss');
    await openMixed();
    const units: HillUnit[] = ['ropani', 'aana', 'paisa', 'daam'];
    expect(units.map(u => field(u).props.returnKeyType)).toEqual([
      'next',
      'next',
      'next',
      'done',
    ]);
    for (const u of units) {
      expect(field(u).props.keyboardType).toBe('decimal-pad');
    }
    focusMock.mockClear();
    dismiss.mockClear();
    for (const u of units.slice(0, 3)) {
      await fireEvent(field(u), 'submitEditing');
    }
    expect(
      focusMock.mock.contexts.map(
        (i: { props: { accessibilityLabel: string } }) =>
          i.props.accessibilityLabel,
      ),
    ).toEqual([L['land.unit.aana'], L['land.unit.paisa'], L['land.unit.daam']]);
    expect(dismiss).not.toHaveBeenCalled();
    await fireEvent(field('daam'), 'submitEditing');
    expect(dismiss).toHaveBeenCalledTimes(1);
    dismiss.mockRestore();
  });

  it('2 Ropani, 3 Aana, 1 Paisa, 2 Daam (independently computed)', async () => {
    const { user } = await openMixed();
    await user.type(field('ropani'), '2');
    await user.type(field('aana'), '3');
    await user.type(field('paisa'), '1');
    await user.type(field('daam'), '2');
    expect(result()).toBeNull();
    await user.press(calculate());
    expect(
      screen.getByText('Input: 2 Ropani, 3 Aana, 1 Paisa, 2 Daam'),
    ).toBeOnTheScreen();
    row('hilly', 'Ropani', '2');
    row('hilly', 'Daam', '2');
    row('terai', 'Kattha', '3');
    row('terai', 'Dhur', '6.4312');
    row('other', 'Square feet', '12,107.0938');
  });

  it('blank fields count as zero; the input line leaves them out', async () => {
    const { user } = await openMixed();
    await user.type(field('aana'), '16');
    await user.press(calculate());
    expect(screen.getByText('Input: 16 Aana')).toBeOnTheScreen();
    row('hilly', 'Ropani', '1');
    row('hilly', 'Aana', '0');
  });

  it('all blank: one shared message; a bad field: a message with its unit name', async () => {
    const { user } = await openMixed();
    await user.press(calculate());
    expect(
      screen.getByText(new RegExp(L['land.error.mixedEmpty'])),
    ).toBeOnTheScreen();
    await user.type(field('paisa'), 'x');
    await user.type(field('daam'), '-1');
    await user.press(calculate());
    expect(
      screen.getByText(
        new RegExp(`${L['land.unit.paisa']}: ${L['land.error.malformed']}`),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        new RegExp(`${L['land.unit.daam']}: ${L['land.error.negative']}`),
      ),
    ).toBeOnTheScreen();
    expect(result()).toBeNull();
  });

  it('keeps each mode’s own text when switching', async () => {
    const { user } = await openMixed();
    await user.type(field('aana'), '3');
    await user.press(mode(L['land.mode.single']));
    await user.type(screen.getByLabelText(L['land.hill.input.label']), '7');
    await user.press(mode(L['land.mode.mixed']));
    expect(field('aana').props.value).toBe('3');
    await user.press(mode(L['land.mode.single']));
    expect(screen.getByLabelText(L['land.hill.input.label']).props.value).toBe(
      '7',
    );
  });
});

describe('result actions and localization with the Hill configuration', () => {
  it('Copy uses the Hill title; Share and Save use the Hill file name prefix', async () => {
    jest
      .mocked(captureRef)
      .mockReset()
      .mockResolvedValue('file:///cache/land.png');
    jest
      .mocked(Share.open)
      .mockReset()
      .mockResolvedValue({ success: true, message: 'ok' });
    const clipboard = installFakeClipboard();
    const { ui, user } = setup();
    await render(ui);
    await user.type(screen.getByLabelText(L['land.hill.input.label']), '1');
    await user.press(calculate());

    await user.press(screen.getByRole('button', { name: 'Copy' }));
    expect(clipboard.content?.split('\n').slice(0, 4)).toEqual([
      'Land (Hill / Mountain)',
      'Input: 1 Ropani',
      '',
      'Terai · बिघा',
    ]);
    await user.press(screen.getByRole('button', { name: 'Share' }));
    expect(jest.mocked(captureRef).mock.calls[0][1]).toMatchObject({
      fileName: 'hill-land-result-',
    });
  });

  it('Nepali: labels, hint, input line and copied text use Devanagari', async () => {
    const clipboard = installFakeClipboard();
    const { ui, user, store } = setup();
    await render(ui);
    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });
    // (the reference's digits are shown in Devanagari)
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
    await user.press(
      screen.getByRole('button', { name: np['resultActions.copy'] }),
    );
    expect(clipboard.content).toContain('इनपुट: २ रोपनी, ३ आना');
    expect(clipboard.content).not.toMatch(/[0-9]/);
  });
});

describe('LandCalculator is driven by its configuration and the generic API', () => {
  it('calls convert / convertMixed with the family and units from the config', async () => {
    const fake = {
      convert: jest.fn(() => ({
        ok: false as const,
        errors: ['empty' as const],
      })),
      convertMixed: jest.fn(() => ({
        ok: false as const,
        formError: 'empty' as const,
        fieldErrors: {},
      })),
      formatValue: jest.fn((v: string) => v),
    };
    const { ui, user } = setup(
      HILL_LAND_CONFIG,
      fake as unknown as typeof landConversionService,
    );
    await render(ui);
    await user.type(screen.getByLabelText(L['land.hill.input.label']), '4');
    await user.press(mode(L['land.unit.paisa']));
    await user.press(calculate());
    expect(fake.convert).toHaveBeenCalledWith({ value: '4', unit: 'paisa' });

    await user.press(mode(L['land.mode.mixed']));
    await user.type(field('aana'), '2');
    await user.press(calculate());
    expect(fake.convertMixed).toHaveBeenCalledWith('hill', {
      ropani: '',
      aana: '2',
      paisa: '',
      daam: '',
    });
  });

  it('the Terai configuration through the same component still shows its own units and title', async () => {
    const { ui, user } = setup(TERAI_LAND_CONFIG as never);
    await render(ui);
    expect(screen.getByTestId('land-terai-view')).toBeOnTheScreen();
    expect(
      screen.getByRole('radio', { name: L['land.unit.bigha'] }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole('radio', { name: L['land.unit.ropani'] }),
    ).toBeNull();
    await user.type(screen.getByLabelText(L['land.terai.input.label']), '1');
    await user.press(calculate());
    expect(screen.getByText('Land (Terai)')).toBeOnTheScreen();
    expect(screen.getByText(L['land.quickRef.body'])).toBeOnTheScreen();
  });

  it('a configuration without a quick reference shows none', async () => {
    const { ui } = setup({ ...HILL_LAND_CONFIG, quickReference: null });
    await render(ui);
    expect(screen.queryByTestId('land-quick-reference')).toBeNull();
  });
});
