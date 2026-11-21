import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Provider } from 'react-redux';

import { setLanguage } from '../../preferences';
import { en } from '../../../i18n/resources/en';
import { np } from '../../../i18n/resources/np';
import type { PreferencesRepository } from '../../../storage';
import { createAppStore } from '../../../store';
import { installFakeClipboard } from '../../../test-utils/fakeClipboard';
import { COPY_FEEDBACK_MS, useCopyResult } from '../useCopyResult';

function setup(getText: () => string = () => 'summary text') {
  const store = createAppStore({
    preferencesRepository: {
      saveLanguage: jest.fn().mockResolvedValue(undefined),
    } as unknown as PreferencesRepository,
    getSystemTheme: () => 'light',
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return {
    store,
    render: () => renderHook(() => useCopyResult(getText), { wrapper }),
  };
}

/** Holds the clipboard read-back, so a copy stays "in flight" until released. */
function holdReadBack() {
  let release: (text: string) => void = () => {};
  jest
    .mocked(Clipboard.getString)
    .mockImplementationOnce(
      () => new Promise<string>(resolve => (release = resolve)),
    );
  return (text: string) => release(text);
}

afterEach(() => {
  jest.useRealTimers();
});

describe('useCopyResult', () => {
  it('has no feedback before anything is copied', async () => {
    installFakeClipboard();
    const { result } = await setup().render();

    expect(result.current.feedback).toBeNull();
  });

  it('reports success, with the English message, after a copy works', async () => {
    const clipboard = installFakeClipboard();
    const { result } = await setup(() => 'the text').render();

    await act(async () => result.current.copy());

    await waitFor(() =>
      expect(result.current.feedback).toEqual({
        type: 'success',
        message: en['resultActions.copied'],
      }),
    );
    expect(clipboard.content).toBe('the text');
  });

  it.each(['silentFailure', 'throwOnWrite', 'rejectOnRead'] as const)(
    'reports an error, never success, when the copy fails (%s)',
    async mode => {
      installFakeClipboard(mode);
      const { result } = await setup().render();

      await act(async () => result.current.copy());

      await waitFor(() =>
        expect(result.current.feedback).toEqual({
          type: 'error',
          message: en['resultActions.copyFailed'],
        }),
      );
    },
  );

  it('reports an error, and writes nothing, when building the text throws', async () => {
    const clipboard = installFakeClipboard();
    const { result } = await setup(() => {
      throw new Error('cannot build the summary');
    }).render();

    await act(async () => result.current.copy());

    await waitFor(() => expect(result.current.feedback?.type).toBe('error'));
    expect(clipboard.setString).not.toHaveBeenCalled();
  });

  it('shows no feedback until the clipboard write has finished', async () => {
    const clipboard = installFakeClipboard();
    const release = holdReadBack();
    const { result } = await setup().render();

    await act(async () => result.current.copy());
    expect(clipboard.setString).toHaveBeenCalledTimes(1);
    expect(result.current.feedback).toBeNull();

    await act(async () => release(clipboard.content));

    expect(result.current.feedback?.type).toBe('success');
  });

  it('ignores another press while a copy is still in progress', async () => {
    const clipboard = installFakeClipboard();
    const release = holdReadBack();
    const { result } = await setup().render();

    await act(async () => {
      result.current.copy();
      result.current.copy();
    });
    await act(async () => release(clipboard.content));

    expect(clipboard.setString).toHaveBeenCalledTimes(1);
  });

  it('hides the message after a few seconds', async () => {
    jest.useFakeTimers();
    installFakeClipboard();
    const { result } = await setup().render();

    await act(async () => result.current.copy());
    await waitFor(() => expect(result.current.feedback).not.toBeNull());

    await act(async () => {
      jest.advanceTimersByTime(COPY_FEEDBACK_MS - 1);
    });
    expect(result.current.feedback).not.toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current.feedback).toBeNull();
  });

  it('shows the message in the new language when the language changes while it is shown', async () => {
    installFakeClipboard();
    const { store, render } = setup();
    const { result } = await render();

    await act(async () => result.current.copy());
    await waitFor(() =>
      expect(result.current.feedback?.message).toBe(en['resultActions.copied']),
    );

    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });

    expect(result.current.feedback).toEqual({
      type: 'success',
      message: np['resultActions.copied'],
    });
  });

  it('does not update state after it is unmounted mid-copy', async () => {
    const clipboard = installFakeClipboard();
    const release = holdReadBack();
    const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result, unmount } = await setup().render();

    await act(async () => result.current.copy());
    await unmount();
    await act(async () => release(clipboard.content));

    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });
});

describe('useCopyResult language', () => {
  it('translates the message to Nepali when the language is Nepali', async () => {
    installFakeClipboard();
    const { store, render } = setup();
    const { result } = await render();
    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });

    await act(async () => result.current.copy());

    await waitFor(() =>
      expect(result.current.feedback?.message).toBe(np['resultActions.copied']),
    );
  });
});
