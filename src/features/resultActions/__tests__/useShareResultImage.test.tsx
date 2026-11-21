import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import Share from 'react-native-share';
import { captureRef, releaseCapture } from 'react-native-view-shot';

import { setLanguage } from '../../preferences';
import { en } from '../../../i18n/resources/en';
import { np } from '../../../i18n/resources/np';
import type { PreferencesRepository } from '../../../storage';
import { createAppStore } from '../../../store';
import { SHARE_FEEDBACK_MS, useShareResultImage } from '../useShareResultImage';

function setup() {
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
    render: () => renderHook(() => useShareResultImage(), { wrapper }),
  };
}

beforeEach(() => {
  jest.mocked(captureRef).mockReset().mockResolvedValue('file:///cache/1.png');
  jest.mocked(releaseCapture).mockReset();
  jest
    .mocked(Share.open)
    .mockReset()
    .mockResolvedValue({ success: true, message: 'ok' });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useShareResultImage', () => {
  it('has no feedback, also after a successful share or a cancellation', async () => {
    const { result } = await setup().render();
    expect(result.current.feedback).toBeNull();

    await act(async () => result.current.share());
    expect(result.current.feedback).toBeNull();

    jest.mocked(Share.open).mockResolvedValue({
      success: false,
      message: 'x',
      dismissedAction: true,
    });
    await act(async () => result.current.share());
    expect(result.current.feedback).toBeNull();
  });

  it('reports a localized error when capture or sharing fails', async () => {
    const { result } = await setup().render();

    jest.mocked(captureRef).mockRejectedValueOnce(new Error('capture'));
    await act(async () => result.current.share());
    expect(result.current.feedback).toEqual({
      type: 'error',
      message: en['resultActions.shareFailed'],
    });

    jest.mocked(Share.open).mockRejectedValueOnce(new Error('share'));
    await act(async () => result.current.share());
    expect(result.current.feedback?.type).toBe('error');
  });

  it('follows a language change while the error is shown', async () => {
    const { store, render } = setup();
    const { result } = await render();
    jest.mocked(captureRef).mockRejectedValueOnce(new Error('capture'));
    await act(async () => result.current.share());

    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });

    expect(result.current.feedback?.message).toBe(
      np['resultActions.shareFailed'],
    );
  });

  it('hides the error after a few seconds and clears it on the next attempt', async () => {
    jest.useFakeTimers();
    const { result } = await setup().render();
    jest.mocked(captureRef).mockRejectedValueOnce(new Error('capture'));
    await act(async () => result.current.share());
    expect(result.current.feedback).not.toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(SHARE_FEEDBACK_MS);
    });
    expect(result.current.feedback).toBeNull();

    jest.mocked(captureRef).mockRejectedValueOnce(new Error('capture'));
    await act(async () => result.current.share());
    expect(result.current.feedback).not.toBeNull();
    await act(async () => result.current.share()); // succeeds
    expect(result.current.feedback).toBeNull();
  });

  it('ignores a press while a share is already in progress', async () => {
    let finish: (value: string) => void = () => {};
    jest
      .mocked(captureRef)
      .mockImplementationOnce(() => new Promise<string>(r => (finish = r)));
    const { result } = await setup().render();

    await act(async () => {
      result.current.share();
      result.current.share();
    });
    await act(async () => finish('file:///cache/1.png'));

    expect(captureRef).toHaveBeenCalledTimes(1);
    expect(Share.open).toHaveBeenCalledTimes(1);
  });

  it('removes the previous image when the next share starts', async () => {
    const { result } = await setup().render();
    await act(async () => result.current.share());
    expect(releaseCapture).not.toHaveBeenCalled();

    jest.mocked(captureRef).mockResolvedValue('file:///cache/2.png');
    await act(async () => result.current.share());

    expect(releaseCapture).toHaveBeenCalledWith('file:///cache/1.png');
  });

  it('does not update state after unmounting mid-share', async () => {
    let finish: (value: string) => void = () => {};
    jest
      .mocked(captureRef)
      .mockImplementationOnce(() => new Promise<string>(r => (finish = r)));
    jest.mocked(Share.open).mockRejectedValue(new Error('x'));
    const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result, unmount } = await setup().render();

    await act(async () => result.current.share());
    await unmount();
    await act(async () => finish('file:///cache/1.png'));

    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });
});
