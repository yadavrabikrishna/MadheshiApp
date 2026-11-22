import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';

import type { PreferencesRepository } from '../../../storage';
import { createAppStore } from '../../../store';
import { themes } from '../../../theme';
import { TextField, type TextFieldProps } from '../TextField';

function setup(props: Partial<TextFieldProps> = {}) {
  const store = createAppStore({
    preferencesRepository: {} as unknown as PreferencesRepository,
    getSystemTheme: () => 'light',
  });
  return (
    <Provider store={store}>
      <TextField
        label="Amount"
        value=""
        onChangeText={() => {}}
        keyboardType="decimal-pad"
        {...props}
      />
    </Provider>
  );
}

const inputBorder = () =>
  StyleSheet.flatten(screen.getByLabelText('Amount').parent!.props.style);

describe('TextField', () => {
  it('shows its hint and each error message as before', async () => {
    await render(
      setup({ hint: 'A hint', errors: ['Too small'], errorPrefix: 'Error' }),
    );

    expect(screen.getByText('A hint')).toBeOnTheScreen();
    expect(screen.getByText('Too small')).toBeOnTheScreen();
    expect(screen.getByRole('alert').props.accessibilityLabel).toBe(
      'Error: Too small',
    );
    expect(inputBorder()).toMatchObject({
      borderWidth: 2,
      borderColor: themes.light.colors.error,
    });
  });

  it('marks the field invalid without any message when `invalid` is set', async () => {
    await render(setup({ invalid: true }));

    expect(screen.queryByRole('alert')).toBeNull();
    expect(inputBorder()).toMatchObject({
      borderWidth: 2,
      borderColor: themes.light.colors.error,
    });
  });

  it('uses the normal border when neither invalid nor in error', async () => {
    await render(setup());

    expect(inputBorder()).toMatchObject({
      borderWidth: 1,
      borderColor: themes.light.colors.border,
    });
  });

  it('keeps the hint as the spoken hint only when `hintVisible` is false', async () => {
    await render(setup({ hint: 'A hint', hintVisible: false }));

    expect(screen.queryByText('A hint')).toBeNull();
    expect(screen.getByLabelText('Amount').props.accessibilityHint).toBe(
      'A hint',
    );
  });

  it('shows the hint by default', async () => {
    await render(setup({ hint: 'A hint' }));

    expect(screen.getByText('A hint')).toBeOnTheScreen();
  });
});
