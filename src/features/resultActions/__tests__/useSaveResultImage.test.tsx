import type { ReactNode, RefObject } from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { Provider } from 'react-redux';
import { captureRef, releaseCapture } from 'react-native-view-shot';

import { setLanguage } from '../../preferences';
import { en } from '../../../i18n/resources/en';
import { np } from '../../../i18n/resources/np';
import type { PreferencesRepository } from '../../../storage';
import { createAppStore } from '../../../store';
import { SAVE_FEEDBACK_MS, useSaveResultImage } from '../useSaveResultImage';

const ref = { current: null } as RefObject<never>;

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
    render: () =>
      renderHook(() => useSaveResultImage(ref, 'card-'), { wrapper }),
  };
}

beforeEach(() => {
  jest.mocked(captureRef).mockReset().mockResolvedValue('file:///c/1.png');
  jest.mocked(releaseCapture).mockReset();
  jest
    .mocked(CameraRoll.saveAsset)
    .mockReset()
    .mockResolvedValue({} as never);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useSaveResultImage', () => {
  it('has no feedback before saving, then reports success after the save', async () => {
    const { result } = await setup().render();
    expect(result.current.feedback).toBeNull();

    await act(async () => result.current.save());

    expect(result.current.feedback).toEqual({
      type: 'success',
      message: en['resultActions.saved'],
    });
  });

  it('shows no feedback until the gallery save has finished', async () => {
    let finish: (value: never) => void = () => {};
    jest
      .mocked(CameraRoll.saveAsset)
      .mockImplementation(() => new Promise(r => (finish = r)));
    const { result } = await setup().render();

    await act(async () => result.current.save());
    expect(result.current.feedback).toBeNull();

    await act(async () => finish({} as never));
    expect(result.current.feedback?.type).toBe('success');
  });

  it('reports an error, never success, when the save or capture fails', async () => {
    const { result } = await setup().render();

    jest.mocked(CameraRoll.saveAsset).mockRejectedValueOnce(new Error('x'));
    await act(async () => result.current.save());
    expect(result.current.feedback).toEqual({
      type: 'error',
      message: en['resultActions.saveFailed'],
    });

    jest.mocked(captureRef).mockRejectedValueOnce(new Error('y'));
    await act(async () => result.current.save());
    expect(result.current.feedback?.type).toBe('error');
  });

  it('follows a language change while the message is shown', async () => {
    const { store, render } = setup();
    const { result } = await render();
    await act(async () => result.current.save());

    await act(async () => {
      await store.dispatch(setLanguage('np'));
    });

    expect(result.current.feedback?.message).toBe(np['resultActions.saved']);
  });

  it('hides the message after a few seconds and clears it on the next attempt', async () => {
    jest.useFakeTimers();
    const { result } = await setup().render();
    await act(async () => result.current.save());
    expect(result.current.feedback).not.toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(SAVE_FEEDBACK_MS);
    });
    expect(result.current.feedback).toBeNull();

    await act(async () => result.current.save());
    expect(result.current.feedback).not.toBeNull();
  });

  it('ignores a press while a save is already in progress', async () => {
    let finish: (value: never) => void = () => {};
    jest
      .mocked(CameraRoll.saveAsset)
      .mockImplementationOnce(() => new Promise(r => (finish = r)));
    const { result } = await setup().render();

    await act(async () => {
      result.current.save();
      result.current.save();
    });
    await act(async () => finish({} as never));

    expect(captureRef).toHaveBeenCalledTimes(1);
    expect(CameraRoll.saveAsset).toHaveBeenCalledTimes(1);
  });

  it('does not update state after unmounting mid-save', async () => {
    let finish: (value: never) => void = () => {};
    jest
      .mocked(CameraRoll.saveAsset)
      .mockImplementationOnce(() => new Promise(r => (finish = r)));
    const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result, unmount } = await setup().render();

    await act(async () => result.current.save());
    await unmount();
    await act(async () => finish({} as never));

    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });
});
