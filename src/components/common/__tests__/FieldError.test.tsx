import { render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';

import { setTheme } from '../../../features/preferences';
import type { PreferencesRepository } from '../../../storage';
import { createAppStore } from '../../../store';
import { themes } from '../../../theme';
import { FieldError } from '../FieldError';

function setup(ui: React.ReactElement) {
  const store = createAppStore({
    preferencesRepository: {
      saveTheme: jest.fn().mockResolvedValue(undefined),
    } as unknown as PreferencesRepository,
    getSystemTheme: () => 'light',
  });
  return { store, ui: <Provider store={store}>{ui}</Provider> };
}

describe('FieldError', () => {
  it('announces the message once as an alert, prefixed when a prefix is given', async () => {
    await render(setup(<FieldError message="Bad date" prefix="Error" />).ui);

    const alert = screen.getByRole('alert');
    expect(alert.props.accessibilityLabel).toBe('Error: Bad date');
    expect(alert.props.accessibilityLiveRegion).toBe('polite');
    expect(screen.getByText('Bad date')).toBeOnTheScreen();
  });

  it('uses the plain message as the label without a prefix', async () => {
    await render(setup(<FieldError message="Bad date" />).ui);

    expect(screen.getByRole('alert').props.accessibilityLabel).toBe('Bad date');
  });

  it.each(['light', 'dark'] as const)(
    'uses the %s theme error color',
    async mode => {
      const { store, ui } = setup(<FieldError message="Bad date" />);
      await render(ui);
      await store.dispatch(setTheme(mode));

      expect(screen.getByText('Bad date')).toHaveStyle({
        color: themes[mode].colors.error,
      });
    },
  );
});
