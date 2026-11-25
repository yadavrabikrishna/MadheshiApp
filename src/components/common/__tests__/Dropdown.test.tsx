import { render, screen, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { Provider } from 'react-redux';

import type { PreferencesRepository } from '../../../storage';
import { createAppStore } from '../../../store';
import { Dropdown } from '../Dropdown';

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
