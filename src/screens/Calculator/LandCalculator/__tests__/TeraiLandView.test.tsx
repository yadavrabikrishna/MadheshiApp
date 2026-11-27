/**
 * The Terai Land Calculator UI (Issue #73).
 *
 * The conversion service (Issue #74) is not implemented yet, so these tests
 * use a FAKE service with obviously fake values (never real conversion
 * factors). They check that the UI wires input -> service -> grouped display,
 * and the actions; the real numbers are #74's tests.
 */
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  act,
  render,
  screen,
  userEvent,
  within,
} from '@testing-library/react-native';
import Share from 'react-native-share';
import { captureRef } from 'react-native-view-shot';
import { StyleSheet } from 'react-native';
import { Provider } from 'react-redux';

import {
  type LandConversionGroups,
  type LandConversionService,
  type LandErrorCode,
} from '../../../../features/land';
import { setLanguage, setTheme } from '../../../../features/preferences';
import { en } from '../../../../i18n/resources/en';
import { np } from '../../../../i18n/resources/np';
import type { PreferencesRepository } from '../../../../storage';
import { createAppStore } from '../../../../store';
import { appColors } from '../../../../theme/colors';
import { installFakeClipboard } from '../../../../test-utils/fakeClipboard';
import { TeraiLandView } from '../TeraiLandView';
import { groupThousands } from '../teraiLandDisplay';

jest.setTimeout(30000);

const FAKE: LandConversionGroups = {
  hilly: { ropani: '11', aana: '22', paisa: '33', daam: '0.4' },
  terai: { bigha: '44', kattha: '55', dhur: '66' },
  other: {
    squareFeet: '72900',
    squareMetres: '1234567.89125',
    hectare: '0.5',
    acre: '1.23456',
  },
};

/** A fake that validates like the contract describes, with fixed outputs. */
function makeService() {
  const convertTerai = jest.fn(({ value }: { value: string; unit: string }) => {
    const text = value.trim();
    const errors: LandErrorCode[] = [];
    if (text === '') {
      errors.push('empty');
    } else if (text.startsWith('-')) {
      errors.push('negative');
    } else if (!/^\d+(\.\d+)?$/.test(text)) {
      errors.push('malformed');
    }
    return errors.length > 0
      ? { ok: false as const, errors }
      : { ok: true as const, value: FAKE };
  });
  // A deliberately visible fake formatter: it trims to 2 places.
  const formatValue = jest.fn((value: string) =>
    String(Number(Number(value).toFixed(2))),
  );
  return { convertTerai, formatValue } satisfies LandConversionService;
}

function setup(service: LandConversionService = makeService()) {
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
    service,
    user: userEvent.setup(),
    ui: (
      <Provider store={store}>
        <TeraiLandView service={service} />
      </Provider>
    ),
  };
}

const L = en;
const input = () => screen.getByLabelText(L['land.terai.input.label']);
const calculate = () =>
  screen.getByRole('button', { name: L['land.terai.calculate'] });
const result = () => screen.queryByTestId('land-result');
const useNepali = (store: ReturnType<typeof setup>['store']) =>
  act(async () => {
    await store.dispatch(setLanguage('np'));
  });

async function enter(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.clear(input());
  if (text !== '') {
    await user.type(input(), text);
  }
}

describe('TeraiLandView: the form', () => {
  it('shows the input, the three units, Calculate and the quick reference, and no result', async () => {
    const { ui } = setup();
    await render(ui);
    expect(input()).toBeOnTheScreen();
    expect(input().props.keyboardType).toBe('decimal-pad');
    for (const unit of ['bigha', 'kattha', 'dhur'] as const) {
      expect(
        screen.getByRole('radio', { name: L[`land.unit.${unit}`] }),
      ).toBeOnTheScreen();
    }
    expect(
      screen.getByRole('radio', { name: L['land.unit.bigha'] }).props
        .accessibilityState.selected,
    ).toBe(true);
    expect(calculate()).toBeOnTheScreen();
    expect(screen.getByText(L['land.quickRef.body'])).toBeOnTheScreen();
    expect(result()).toBeNull();
  });

  it('stays on the Calculator screen: no navigation was added (a plain view)', async () => {
    const { ui } = setup();
    await render(ui);
    expect(screen.getByTestId('land-terai-view')).toBeOnTheScreen();
  });
});

describe('TeraiLandView: calculating', () => {
  it('typing alone never calls the service or shows results', async () => {
    const { ui, user, service } = setup();
    await render(ui);
    await enter(user, '2.5');
    await user.press(screen.getByRole('radio', { name: L['land.unit.dhur'] }));
    expect(service.convertTerai).not.toHaveBeenCalled();
    expect(result()).toBeNull();
  });

  it('sends the typed text and unit to the service on Calculate, once', async () => {
    const { ui, user, service } = setup();
    await render(ui);
    await enter(user, '2.5');
    await user.press(
      screen.getByRole('radio', { name: L['land.unit.kattha'] }),
    );
    await user.press(calculate());
    expect(service.convertTerai).toHaveBeenCalledTimes(1);
    expect(service.convertTerai).toHaveBeenCalledWith({
      value: '2.5',
      unit: 'kattha',
    });
  });

  it('shows all 11 outputs in the three groups, in order, label left and value right', async () => {
    const { ui, user } = setup();
    await render(ui);
    await enter(user, '1');
    await user.press(calculate());

    const hilly = within(screen.getByTestId('land-group-hilly'));
    const terai = within(screen.getByTestId('land-group-terai'));
    const other = within(screen.getByTestId('land-group-other'));
    expect(hilly.getByText(L['land.group.hilly'])).toBeOnTheScreen();
    expect(terai.getByText(L['land.group.terai'])).toBeOnTheScreen();
    expect(other.getByText(L['land.group.other'])).toBeOnTheScreen();

    const row = (g: typeof hilly, label: string, value: string) =>
      expect(g.getByLabelText(`${label}: ${value}`)).toBeOnTheScreen();
    row(hilly, 'Ropani', '11');
    row(hilly, 'Aana', '22');
    row(hilly, 'Paisa', '33');
    row(hilly, 'Daam', '0.4');
    row(terai, 'Bigha', '44');
    row(terai, 'Kattha', '55');
    row(terai, 'Dhur', '66');
    // Values come from the service formatter (fake: 2 places), then grouped.
    row(other, 'Square feet', '72,900');
    row(other, 'Square metres', '1,234,567.89');
    row(other, 'Hectare', '0.5');
    row(other, 'Acre', '1.23');
    expect(screen.getAllByLabelText(/: /)).toHaveLength(11);
  });

  it('shows the input that was calculated and the quick reference below the results', async () => {
    const { ui, user } = setup();
    await render(ui);
    await enter(user, '2.5');
    await user.press(calculate());
    expect(
      within(screen.getByTestId('land-result')).getByText('Input: 2.5 Bigha'),
    ).toBeOnTheScreen();
    const tree = JSON.stringify(screen.toJSON());
    expect(tree.indexOf('land-quick-reference')).toBeGreaterThan(
      tree.indexOf('land-result"'),
    );
  });

  it('editing the input or the unit clears the result (and recalculates only on Calculate)', async () => {
    const { ui, user, service } = setup();
    await render(ui);
    await enter(user, '1');
    await user.press(calculate());
    expect(result()).not.toBeNull();

    await enter(user, '12');
    expect(result()).toBeNull();
    await user.press(calculate());
    expect(result()).not.toBeNull();
    expect(service.convertTerai).toHaveBeenLastCalledWith({
      value: '12',
      unit: 'bigha',
    });

    await user.press(screen.getByRole('radio', { name: L['land.unit.dhur'] }));
    expect(result()).toBeNull();
    await user.press(calculate());
    expect(service.convertTerai).toHaveBeenLastCalledWith({
      value: '12',
      unit: 'dhur',
    });
    expect(service.convertTerai).toHaveBeenCalledTimes(3);
  });
});

describe('TeraiLandView: validation feedback from the service', () => {
  it.each([
    ['', 'land.error.empty'],
    ['abc', 'land.error.malformed'],
    ['1.2.3', 'land.error.malformed'],
    ['-5', 'land.error.negative'],
  ] as const)('%j shows its message and no result', async (text, key) => {
    const { ui, user } = setup();
    await render(ui);
    await enter(user, text);
    await user.press(calculate());
    expect(screen.getByText(new RegExp(L[key]))).toBeOnTheScreen();
    expect(result()).toBeNull();
  });

  it('a failed Calculate removes the previous result; fixing the input clears the error', async () => {
    const { ui, user } = setup();
    await render(ui);
    await enter(user, '1');
    await user.press(calculate());
    await enter(user, 'x');
    expect(result()).toBeNull();
    await user.press(calculate());
    expect(
      screen.getByText(new RegExp(L['land.error.malformed'])),
    ).toBeOnTheScreen();

    await enter(user, '3');
    expect(
      screen.queryByText(new RegExp(L['land.error.malformed'])),
    ).toBeNull();
    await user.press(calculate());
    expect(result()).not.toBeNull();
  });

  it('accepts zero, decimal and very large text as the service decides (passes the text unchanged)', async () => {
    const { ui, user, service } = setup();
    await render(ui);
    for (const text of ['0', '0.0001', '123456789012345678901234567890']) {
      await enter(user, text);
      await user.press(calculate());
      expect(service.convertTerai).toHaveBeenLastCalledWith({
        value: text,
        unit: 'bigha',
      });
      expect(result()).not.toBeNull();
    }
  });

  it('with the real service (default): 1 Bigha shows the real values; bad input is rejected', async () => {
    const store = setup().store;
    await render(
      <Provider store={store}>
        <TeraiLandView />
      </Provider>,
    );
    const user = userEvent.setup();
    await enter(user, '1');
    await user.press(calculate());

    const value = (group: string, label: string, text: string) =>
      expect(
        within(screen.getByTestId(`land-group-${group}`)).getByLabelText(
          `${label}: ${text}`,
        ),
      ).toBeOnTheScreen();
    value('hilly', 'Ropani', '13');
    value('hilly', 'Aana', '5');
    value('hilly', 'Paisa', '0');
    value('hilly', 'Daam', '0.0351');
    value('terai', 'Bigha', '1');
    value('terai', 'Kattha', '0');
    value('terai', 'Dhur', '0');
    value('other', 'Square feet', '72,900');
    value('other', 'Square metres', '6,772.6316');
    value('other', 'Hectare', '0.6773');
    value('other', 'Acre', '1.6736');

    await enter(user, '-1');
    await user.press(calculate());
    expect(
      screen.getByText(new RegExp(L['land.error.negative'])),
    ).toBeOnTheScreen();
    expect(result()).toBeNull();

    await enter(user, '0');
    await user.press(calculate());
    value('other', 'Square feet', '0');
    value('hilly', 'Daam', '0');
  });
});

describe('TeraiLandView: Nepali and numerals', () => {
  it('Nepali labels, group titles and Devanagari values; input value stays ASCII for the service', async () => {
    const { ui, user, store, service } = setup();
    await render(ui);
    await useNepali(store);

    await user.type(screen.getByLabelText(np['land.terai.input.label']), '2.5');
    await user.press(
      screen.getByRole('button', { name: np['land.terai.calculate'] }),
    );
    expect(service.convertTerai).toHaveBeenCalledWith({
      value: '2.5',
      unit: 'bigha',
    });
    const hilly = within(screen.getByTestId('land-group-hilly'));
    expect(hilly.getByText(np['land.group.hilly'])).toBeOnTheScreen();
    expect(hilly.getByLabelText('रोपनी: ११')).toBeOnTheScreen();
    expect(
      within(screen.getByTestId('land-group-other')).getByLabelText(
        'वर्ग फिट: ७२,९००',
      ),
    ).toBeOnTheScreen();
    expect(
      within(screen.getByTestId('land-result')).getByText('इनपुट: २.५ बिघा'),
    ).toBeOnTheScreen();
    expect(screen.getByText('१ बिघा = २० कठ्ठा = ४०० धुर')).toBeOnTheScreen();
  });

  it('groupThousands is display-only grouping', () => {
    expect(groupThousands('72900')).toBe('72,900');
    expect(groupThousands('6772.6312')).toBe('6,772.6312');
    expect(groupThousands('0.0412')).toBe('0.0412');
    expect(groupThousands('999')).toBe('999');
    expect(groupThousands('1000000')).toBe('1,000,000');
  });
});

describe('TeraiLandView: Copy, Share and Save Image (shared implementation)', () => {
  beforeEach(() => {
    jest
      .mocked(captureRef)
      .mockReset()
      .mockResolvedValue('file:///cache/land.png');
    jest.mocked(Share.open).mockReset().mockResolvedValue({
      success: true,
      message: 'ok',
    });
    jest
      .mocked(CameraRoll.saveAsset)
      .mockReset()
      .mockResolvedValue({} as never);
  });

  async function calculated() {
    const view = setup();
    await render(view.ui);
    await enter(view.user, '2.5');
    await view.user.press(calculate());
    return view;
  }

  it('offers the three actions only while a result is shown', async () => {
    const { ui, user } = setup();
    await render(ui);
    for (const name of ['Copy', 'Share', 'Save Image']) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
    await enter(user, '1');
    await user.press(calculate());
    for (const name of ['Copy', 'Share', 'Save Image']) {
      expect(screen.getByRole('button', { name })).toBeOnTheScreen();
    }
    await enter(user, '2');
    expect(screen.queryByRole('button', { name: 'Copy' })).toBeNull();
  });

  it('Copy sends the complete formatted result as text', async () => {
    const clipboard = installFakeClipboard();
    const { user } = await calculated();
    await user.press(screen.getByRole('button', { name: 'Copy' }));
    expect(clipboard.content).toBe(
      [
        'Land (Terai)',
        'Input: 2.5 Bigha',
        '',
        'Hilly · रोपनी',
        'Ropani: 11',
        'Aana: 22',
        'Paisa: 33',
        'Daam: 0.4',
        '',
        'Terai · बिघा',
        'Bigha: 44',
        'Kattha: 55',
        'Dhur: 66',
        '',
        'Other Units',
        'Square feet: 72,900',
        'Square metres: 1,234,567.89',
        'Hectare: 0.5',
        'Acre: 1.23',
      ].join('\n'),
    );
    expect(
      await screen.findByText(en['resultActions.copied']),
    ).toBeOnTheScreen();
  });

  it('Copy in Nepali uses Devanagari digits', async () => {
    const clipboard = installFakeClipboard();
    const { user, store } = await calculated();
    await useNepali(store);
    await user.press(
      screen.getByRole('button', { name: np['resultActions.copy'] }),
    );
    expect(Clipboard.setString).toHaveBeenCalledTimes(1);
    expect(clipboard.content).toContain('इनपुट: २.५ बिघा');
    expect(clipboard.content).toContain('रोपनी: ११');
    expect(clipboard.content).not.toMatch(/[0-9]/);
  });

  it('Share captures only the result card image and opens the share sheet', async () => {
    const { user } = await calculated();
    await user.press(screen.getByRole('button', { name: 'Share' }));
    expect(captureRef).toHaveBeenCalledTimes(1);
    const [target, options] = jest.mocked(captureRef).mock.calls[0];
    expect(
      (target as unknown as { current: { props: { testID: string } } }).current
        .props.testID,
    ).toBe('land-result-image');
    expect(options).toMatchObject({
      format: 'png',
      fileName: 'terai-land-result-',
    });
    const captured = within(screen.getByTestId('land-result-image'));
    expect(captured.getByText('Land (Terai)')).toBeOnTheScreen();
    expect(captured.queryByRole('button')).toBeNull();
    expect(Share.open).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'file:///cache/land.png',
        type: 'image/png',
      }),
    );
  });

  it('Save Image saves the card to the gallery and confirms', async () => {
    const { user } = await calculated();
    await user.press(screen.getByRole('button', { name: 'Save Image' }));
    expect(CameraRoll.saveAsset).toHaveBeenCalledWith(
      'file:///cache/land.png',
      {
        type: 'photo',
        album: 'MadheshiApp',
      },
    );
    expect(
      await screen.findByText(en['resultActions.saved']),
    ).toBeOnTheScreen();
  });
});

describe('TeraiLandView: theme and translations', () => {
  it.each(['light', 'dark'] as const)(
    'renders the result card and quick reference with the %s theme colors',
    async mode => {
      const { ui, user, store } = setup();
      await render(ui);
      await act(async () => {
        await store.dispatch(setTheme(mode));
      });
      await enter(user, '1');
      await user.press(calculate());

      const flat = (id: string) =>
        StyleSheet.flatten(screen.getByTestId(id).props.style);
      expect(flat('land-result').backgroundColor).toBe(appColors[mode].surface);
      expect(flat('land-result-image').backgroundColor).toBe(
        appColors[mode].surface,
      );
      expect(flat('land-quick-reference').backgroundColor).toBe(
        appColors[mode].surface,
      );
    },
  );

  it('every Land key exists in both languages, with the same unit set', () => {
    const keys = Object.keys(en).filter(k => k.startsWith('land.'));
    expect(keys.length).toBeGreaterThanOrEqual(25);
    for (const key of keys) {
      expect(np[key as keyof typeof np]).toBeTruthy();
    }
    expect(np['land.group.hilly']).toMatch(/रोपनी/);
    expect(np['land.group.terai']).toMatch(/बिघा/);
  });

  it('switching language relabels the open result without recalculating', async () => {
    const { ui, user, store, service } = setup();
    await render(ui);
    await enter(user, '1');
    await user.press(calculate());
    await useNepali(store);
    expect(screen.getByText(np['land.group.other'])).toBeOnTheScreen();
    expect(service.convertTerai).toHaveBeenCalledTimes(1);
  });
});
