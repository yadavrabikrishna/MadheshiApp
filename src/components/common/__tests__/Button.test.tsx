import { StyleSheet } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';

import type { PreferencesRepository } from '../../../storage';
import { createAppStore } from '../../../store';
import { Button } from '../Button';

function setup(props: Partial<React.ComponentProps<typeof Button>> = {}) {
  const store = createAppStore({
    preferencesRepository: {} as unknown as PreferencesRepository,
    getSystemTheme: () => 'light',
  });
  const onPress = jest.fn();
  return {
    onPress,
    user: userEvent.setup(),
    ui: (
      <Provider store={store}>
        <Button label="Calculate" onPress={onPress} {...props} />
      </Provider>
    ),
  };
}

describe('Button', () => {
  it('calls onPress and is announced as enabled by default', async () => {
    const { ui, user, onPress } = setup();
    await render(ui);

    const button = screen.getByRole('button', { name: 'Calculate' });
    expect(button.props.accessibilityState).toEqual({ disabled: false });
    await user.press(button);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('when disabled: is announced as disabled, dimmed, and does nothing on press', async () => {
    const { ui, user, onPress } = setup({ disabled: true });
    await render(ui);

    const button = screen.getByRole('button', { name: 'Calculate' });
    expect(button.props.accessibilityState).toEqual({ disabled: true });
    expect(StyleSheet.flatten(button.props.style).opacity).toBe(0.5);
    await user.press(button);

    expect(onPress).not.toHaveBeenCalled();
  });

  it('is not dimmed when enabled', async () => {
    await render(setup().ui);

    expect(
      StyleSheet.flatten(screen.getByRole('button').props.style).opacity,
    ).toBeUndefined();
  });
});
