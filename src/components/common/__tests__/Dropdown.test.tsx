import { render, screen, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { Provider } from 'react-redux';

import type { PreferencesRepository } from '../../../storage';
import { createAppStore } from '../../../store';
import {
  centeredOffset,
  Dropdown,
  initialRowIndex,
  ROW_HEIGHT,
} from '../Dropdown';

const store = () =>
  createAppStore({
    preferencesRepository: {} as unknown as PreferencesRepository,
    getSystemTheme: () => 'light',
  });

const OPTIONS = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
];

describe('Dropdown', () => {
  it('shows the chosen option, and calls onChange only for a new choice', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(
      <Provider store={store()}>
        <Dropdown
          label="Letter"
          options={OPTIONS}
          value="a"
          onChange={onChange}
          closeLabel="Close"
        />
      </Provider>,
    );

    expect(
      screen.getByRole('button', { name: 'Letter: Alpha' }),
    ).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Letter: Alpha' }));
    await user.press(screen.getByRole('radio', { name: 'Alpha' }));
    expect(onChange).not.toHaveBeenCalled();

    await user.press(screen.getByRole('button', { name: 'Letter: Alpha' }));
    await user.press(screen.getByRole('radio', { name: 'Beta' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('shows the placeholder while nothing is chosen, and the group in its name', async () => {
    const user = userEvent.setup();
    await render(
      <Provider store={store()}>
        <Dropdown
          label="Year"
          groupLabel="Start Date"
          placeholder="Select"
          options={OPTIONS}
          value=""
          onChange={jest.fn()}
          closeLabel="Close"
        />
      </Provider>,
    );

    const button = screen.getByRole('button', {
      name: 'Start Date – Year: Select',
    });
    expect(button).toBeOnTheScreen();
    await user.press(button);
    expect(screen.getByText('Start Date – Year')).toBeOnTheScreen();
    // Nothing is marked selected while no value is chosen.
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio.props.accessibilityState.selected).toBe(false);
    }
  });
});

describe('Dropdown: compact', () => {
  it('uses tighter padding only when compact', async () => {
    const make = (compact: boolean) => (
      <Provider store={store()}>
        <Dropdown
          label={compact ? 'Tight' : 'Roomy'}
          compact={compact}
          options={OPTIONS}
          value="a"
          onChange={jest.fn()}
          closeLabel="Close"
        />
      </Provider>
    );
    await render(
      <>
        {make(true)}
        {make(false)}
      </>,
    );

    const padding = (name: string) =>
      StyleSheet.flatten(screen.getByRole('button', { name }).props.style)
        .paddingHorizontal;
    expect(padding('Tight: Alpha')).toBe(8);
    expect(padding('Roomy: Alpha')).toBe(12);
  });
});

describe('Dropdown: where the list opens', () => {
  it('rows are a fixed height so positions are known without measuring', () => {
    expect(ROW_HEIGHT).toBe(48);
  });

  describe('centeredOffset', () => {
    it.each([
      // [index, rows, view height, expected]
      [180, 201, 480, 180 * 48 - 216], // 2080 in the 1900-2100 list
      [183, 201, 480, 183 * 48 - 216], // 2083
      [0, 201, 480, 0], // never above the top
      [1, 201, 480, 0],
      [200, 201, 480, 201 * 48 - 480], // never past the end
      [2, 3, 480, 0], // a short list never scrolls
      [5, 12, 240, 5 * 48 - 96],
    ])('row %i of %i in %i high -> %i', (index, rows, height, expected) => {
      expect(centeredOffset(index, rows, height)).toBe(expected);
    });
  });

  describe('initialRowIndex (the first frame, before measuring)', () => {
    it('is 0 when nothing is chosen', () => {
      expect(initialRowIndex(-1, 201, 800)).toBe(0);
    });

    it('starts above the chosen row so it lands near the middle', () => {
      // 800 high window: sheet list ~ (800 - 48) x 0.8 - 54 = 547 -> 11 rows
      expect(initialRowIndex(180, 201, 800)).toBe(180 - 5);
      expect(initialRowIndex(183, 201, 800)).toBe(183 - 5);
    });

    it('stays inside the list at both ends and for short lists', () => {
      expect(initialRowIndex(0, 201, 800)).toBe(0);
      expect(initialRowIndex(200, 201, 800)).toBe(201 - 11);
      expect(initialRowIndex(1, 3, 800)).toBe(0);
    });

    it('uses fewer rows on a short screen', () => {
      // 400 high: list ~ (400 - 48) x 0.8 - 54 = 227 -> 4 rows
      expect(initialRowIndex(100, 201, 400)).toBe(100 - 1);
    });
  });
});
