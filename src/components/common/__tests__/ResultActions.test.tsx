/**
 * ResultActions (Issue #30): the Copy / Share / Save Image row. UI only, so
 * these tests cover what is on screen and the callback boundary. They do not,
 * and must not, expect any clipboard, share or save behavior.
 */
import { StyleSheet } from 'react-native';
import {
  act,
  render,
  screen,
  userEvent,
  within,
} from '@testing-library/react-native';
import ionicons from '@react-native-vector-icons/ionicons/glyphmaps/Ionicons.json';
import { Provider } from 'react-redux';

import { setLanguage, setTheme } from '../../../features/preferences';
import { en } from '../../../i18n/resources/en';
import { np } from '../../../i18n/resources/np';
import type { PreferencesRepository } from '../../../storage';
import { createAppStore } from '../../../store';
import { themes } from '../../../theme';
import { ResultActions, type ResultActionsProps } from '../ResultActions';

const glyph = (name: keyof typeof ionicons) =>
  String.fromCodePoint(ionicons[name]);

function setup(props: ResultActionsProps = {}) {
  const store = createAppStore({
    preferencesRepository: {
      saveTheme: jest.fn().mockResolvedValue(undefined),
      saveLanguage: jest.fn().mockResolvedValue(undefined),
    } as unknown as PreferencesRepository,
    getSystemTheme: () => 'light',
  });
  return {
    store,
    user: userEvent.setup(),
    ui: (
      <Provider store={store}>
        <ResultActions {...props} />
      </Provider>
    ),
  };
}

const buttonNames = () =>
  screen.getAllByRole('button').map(button => button.props.accessibilityLabel);

describe('ResultActions', () => {
  it('shows Copy, Share and Save Image, in that order', async () => {
    await render(setup().ui);

    expect(buttonNames()).toEqual([
      en['resultActions.copy'],
      en['resultActions.share'],
      en['resultActions.saveImage'],
    ]);
    expect(en['resultActions.copy']).toBe('Copy');
    expect(en['resultActions.share']).toBe('Share');
    expect(en['resultActions.saveImage']).toBe('Save Image');
  });

  it('gives every action a visible label and its own icon', async () => {
    await render(setup().ui);

    const expected = [
      ['Copy', 'copy-outline'],
      ['Share', 'share-social-outline'],
      ['Save Image', 'download-outline'],
    ] as const;
    for (const [label, icon] of expected) {
      const button = screen.getByRole('button', { name: label });
      expect(within(button).getByText(label)).toBeOnTheScreen();
      expect(within(button).getByText(glyph(icon))).toBeOnTheScreen();
    }
    expect(new Set(expected.map(([, icon]) => glyph(icon))).size).toBe(3);
  });

  it('calls only the handler of the action that was pressed, once', async () => {
    const onCopy = jest.fn();
    const onShare = jest.fn();
    const onSaveImage = jest.fn();
    const { ui, user } = setup({ onCopy, onShare, onSaveImage });
    await render(ui);

    await user.press(screen.getByRole('button', { name: 'Copy' }));
    expect(
      [onCopy, onShare, onSaveImage].map(f => f.mock.calls.length),
    ).toEqual([1, 0, 0]);

    await user.press(screen.getByRole('button', { name: 'Share' }));
    expect(
      [onCopy, onShare, onSaveImage].map(f => f.mock.calls.length),
    ).toEqual([1, 1, 0]);

    await user.press(screen.getByRole('button', { name: 'Save Image' }));
    expect(
      [onCopy, onShare, onSaveImage].map(f => f.mock.calls.length),
    ).toEqual([1, 1, 1]);
  });

  it('does nothing visible when an action is pressed without a handler', async () => {
    const { ui, user } = setup();
    await render(ui);

    for (const name of ['Copy', 'Share', 'Save Image']) {
      await user.press(screen.getByRole('button', { name }));
    }

    // No success, status or alert message is ever shown.
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(/copied|shared|saved|success/i)).toBeNull();
    expect(buttonNames()).toEqual(['Copy', 'Share', 'Save Image']);
  });

  it('uses Nepali labels, for the text and the accessible name, in Nepali', async () => {
    const { ui, store } = setup();
    await render(ui);
    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });

    expect(buttonNames()).toEqual([
      np['resultActions.copy'],
      np['resultActions.share'],
      np['resultActions.saveImage'],
    ]);
    for (const label of [
      np['resultActions.copy'],
      np['resultActions.share'],
      np['resultActions.saveImage'],
    ]) {
      const button = screen.getByRole('button', { name: label });
      expect(within(button).getByText(label)).toBeOnTheScreen();
    }
    expect(screen.queryByText(en['resultActions.copy'])).toBeNull();
    expect(screen.queryByText(en['resultActions.share'])).toBeNull();
    expect(screen.queryByText(en['resultActions.saveImage'])).toBeNull();
  });

  it('returns to English labels when the language changes back', async () => {
    const { ui, store } = setup();
    await render(ui);
    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });
    await act(async () => {
      await store.dispatch(setLanguage('en'));
    });

    expect(buttonNames()).toEqual(['Copy', 'Share', 'Save Image']);
  });

  it.each(['light', 'dark'] as const)(
    'uses the %s theme tokens for label, icon and borders',
    async mode => {
      const { ui, store } = setup();
      await render(ui);
      await act(async () => {
        await store.dispatch(setTheme(mode));
      });
      const { colors } = themes[mode];

      for (const [label, icon] of [
        ['Copy', 'copy-outline'],
        ['Share', 'share-social-outline'],
        ['Save Image', 'download-outline'],
      ] as const) {
        const button = screen.getByRole('button', { name: label });
        expect(within(button).getByText(label)).toHaveStyle({
          color: colors.text,
        });
        expect(within(button).getByText(glyph(icon))).toHaveStyle({
          color: colors.text,
        });
        expect(button).toHaveStyle({ borderColor: colors.border });
      }
    },
  );

  it('keeps each button a touch target of at least 48 and shares the width equally', async () => {
    await render(setup().ui);

    for (const button of screen.getAllByRole('button')) {
      const style = StyleSheet.flatten(button.props.style);
      expect(style.minHeight).toBeGreaterThanOrEqual(48);
      expect(style.flex).toBe(1);
    }
  });

  it('lets labels wrap instead of fixing a size (longer Nepali text, larger fonts)', async () => {
    await render(setup().ui);

    for (const button of screen.getAllByRole('button')) {
      const style = StyleSheet.flatten(button.props.style);
      expect(style.height).toBeUndefined();
      expect(style.width).toBeUndefined();
    }
    for (const label of ['Copy', 'Share', 'Save Image']) {
      expect(screen.getByText(label).props.numberOfLines).toBeUndefined();
    }
  });
});
