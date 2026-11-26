/**
 * Global Nepali numeral formatting: digits are converted for DISPLAY only, in
 * one place, and every value stays ASCII.
 */
import { useState } from 'react';
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  userEvent,
} from '@testing-library/react-native';
import { Provider } from 'react-redux';

import { Dropdown } from '../../components/common/Dropdown';
import { MaskedField } from '../../components/common/MaskedField';
import { TextField } from '../../components/common/TextField';
import { setLanguage } from '../../features/preferences';
import type { PreferencesRepository } from '../../storage';
import { createAppStore } from '../../store';
import { dateMask, groupedDecimalMask } from '../../utils';
import { en } from '../resources/en';
import { np } from '../resources/np';
import { localizeDigits, translate, useTranslation } from '..';

jest.setTimeout(30000);

const DEVANAGARI = '०१२३४५६७८९';

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
type Store = ReturnType<typeof makeStore>;
const useNepali = (store: Store) =>
  act(async () => {
    await store.dispatch(setLanguage('np'));
  });

describe('localizeDigits: the pure conversion', () => {
  it('maps every ASCII digit to its Devanagari digit', () => {
    expect(localizeDigits('np', '0123456789')).toBe(DEVANAGARI);
    for (let d = 0; d <= 9; d += 1) {
      expect(localizeDigits('np', String(d))).toBe(DEVANAGARI[d]);
    }
  });

  it('leaves English text unchanged', () => {
    for (const text of [
      '0123456789',
      '1,00,000',
      '2025/01/01',
      'Rs. 6,000.5',
    ]) {
      expect(localizeDigits('en', text)).toBe(text);
    }
  });

  it('converts only the digits of mixed text and keeps everything else', () => {
    expect(localizeDigits('np', 'रु. 1,06,000.50')).toBe('रु. १,०६,०००.५०');
    expect(localizeDigits('np', '2025/04/01 – 3 Years')).toBe(
      '२०२५/०४/०१ – ३ Years',
    );
    expect(localizeDigits('np', 'No digits here')).toBe('No digits here');
    expect(localizeDigits('np', '')).toBe('');
  });

  it('never converts twice: Devanagari digits are left alone', () => {
    const once = localizeDigits('np', 'वर्ष 2080');
    expect(once).toBe('वर्ष २०८०');
    expect(localizeDigits('np', once)).toBe(once);
    expect(localizeDigits('np', localizeDigits('np', '12'))).toBe('१२');
  });
});

describe('translate and useTranslation', () => {
  it('Nepali strings show Devanagari digits; English strings are unchanged', () => {
    expect(translate('np', 'interestRate.error.notNumber')).toBe(
      localizeDigits('np', np['interestRate.error.notNumber']),
    );
    expect(translate('np', 'interestRate.error.notNumber')).toMatch(
      /२५०.*१२\.५/,
    );
    expect(translate('np', 'interestRate.error.notNumber')).not.toMatch(
      /[0-9]/,
    );
    expect(translate('en', 'interestRate.error.notNumber')).toBe(
      en['interestRate.error.notNumber'],
    );
  });

  it('format codes such as YYYY/MM/DD (no digits) are unchanged', () => {
    expect(translate('np', 'simpleInterest.date.placeholder')).toBe(
      np['simpleInterest.date.placeholder'],
    );
  });

  it('formatDigits follows the selected language', async () => {
    const store = makeStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = await renderHook(() => useTranslation(), { wrapper });
    expect(result.current.formatDigits('1,00,000')).toBe('1,00,000');

    await useNepali(store);
    expect(result.current.formatDigits('1,00,000')).toBe('१,००,०००');
    expect(result.current.t('interestRate.error.notNumber')).not.toMatch(
      /[0-9]/,
    );
  });
});

describe('TextField: display only, the value stays ASCII', () => {
  const Harness = ({ onValue }: { onValue: (v: string) => void }) => {
    const [value, setValue] = useState('2500.5');
    return (
      <TextField
        label="Amount"
        value={value}
        placeholder="100000"
        keyboardType="decimal-pad"
        onChangeText={next => {
          onValue(next);
          setValue(next);
        }}
      />
    );
  };

  it('English shows ASCII digits, unchanged', async () => {
    const store = makeStore();
    await render(
      <Provider store={store}>
        <Harness onValue={() => {}} />
      </Provider>,
    );
    const input = screen.getByLabelText('Amount');
    expect(input.props.value).toBe('2500.5');
    expect(input.props.placeholder).toBe('100000');
  });

  it('Nepali shows Devanagari digits in the value and placeholder, and reports ASCII', async () => {
    const store = makeStore();
    const onValue = jest.fn();
    await render(
      <Provider store={store}>
        <Harness onValue={onValue} />
      </Provider>,
    );
    await useNepali(store);

    const input = screen.getByLabelText('Amount');
    expect(input.props.value).toBe('२५००.५');
    expect(input.props.placeholder).toBe('१०००००');

    // Typing ASCII digits or Devanagari digits both report ASCII.
    await fireEvent.changeText(input, '12.5');
    expect(onValue).toHaveBeenLastCalledWith('12.5');
    await fireEvent.changeText(input, '१२३.५');
    expect(onValue).toHaveBeenLastCalledWith('123.5');
    expect(screen.getByLabelText('Amount').props.value).toBe('१२३.५');
  });
});

describe('MaskedField: display only, the raw value stays ASCII', () => {
  let latest = '';
  const Harness = ({
    mask,
    initial,
  }: {
    mask: typeof dateMask;
    initial: string;
  }) => {
    const [value, setValue] = useState(initial);
    return (
      <MaskedField
        mask={mask}
        label="Field"
        keyboardType="number-pad"
        value={value}
        onChangeValue={next => {
          latest = next;
          setValue(next);
        }}
      />
    );
  };

  it('a date shows Devanagari digits with the same separators; the value is ASCII', async () => {
    const store = makeStore();
    await render(
      <Provider store={store}>
        <Harness mask={dateMask} initial="20250401" />
      </Provider>,
    );
    expect(screen.getByLabelText('Field').props.value).toBe('2025/04/01');
    await useNepali(store);
    expect(screen.getByLabelText('Field').props.value).toBe('२०२५/०४/०१');

    await fireEvent.changeText(screen.getByLabelText('Field'), '२०२५/०४/०२');
    expect(latest).toBe('20250402');
    expect(screen.getByLabelText('Field').props.value).toBe('२०२५/०४/०२');
  });

  it('grouped money shows Devanagari digits and Indian grouping; the value has no commas', async () => {
    const store = makeStore();
    await render(
      <Provider store={store}>
        <Harness mask={groupedDecimalMask} initial="100000" />
      </Provider>,
    );
    await useNepali(store);
    expect(screen.getByLabelText('Field').props.value).toBe('१,००,०००');

    await fireEvent.changeText(screen.getByLabelText('Field'), '१,००,०००५');
    expect(latest).toBe('1000005');
  });
});

describe('Dropdown: labels are localized, values are not', () => {
  const OPTIONS = [
    { value: '2080', label: '2080' },
    { value: '01', label: '01 – वैशाख' },
  ];

  it('English is unchanged', async () => {
    const store = makeStore();
    await render(
      <Provider store={store}>
        <Dropdown
          label="Year"
          options={OPTIONS}
          value="2080"
          onChange={() => {}}
          closeLabel="Close"
        />
      </Provider>,
    );
    expect(screen.getByRole('button').props.accessibilityLabel).toBe(
      'Year: 2080',
    );
  });

  it('Nepali shows Devanagari in the field and rows; onChange gets the ASCII value', async () => {
    const store = makeStore();
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(
      <Provider store={store}>
        <Dropdown
          label="Year"
          options={OPTIONS}
          value="2080"
          onChange={onChange}
          closeLabel="Close"
          placeholder="Select 1"
        />
      </Provider>,
    );
    await useNepali(store);
    expect(screen.getByRole('button').props.accessibilityLabel).toBe(
      'Year: २०८०',
    );

    await user.press(screen.getByRole('button'));
    expect(
      screen.getAllByRole('radio').map(r => r.props.accessibilityLabel),
    ).toEqual(['२०८०', '०१ – वैशाख']);
    await user.press(screen.getByRole('radio', { name: '०१ – वैशाख' }));
    expect(onChange).toHaveBeenCalledWith('01');
  });

  it('a placeholder with a digit is localized too', async () => {
    const store = makeStore();
    await render(
      <Provider store={store}>
        <Dropdown
          label="Year"
          options={OPTIONS}
          value=""
          onChange={() => {}}
          closeLabel="Close"
          placeholder="Select 1"
        />
      </Provider>,
    );
    await useNepali(store);
    expect(screen.getByRole('button').props.accessibilityLabel).toBe(
      'Year: Select १',
    );
  });
});
