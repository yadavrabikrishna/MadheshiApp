import type { RefObject } from 'react';
import Share from 'react-native-share';
import { captureRef, releaseCapture } from 'react-native-view-shot';

import { releaseSharedImage, shareViewAsImage } from '../shareImage';

const target = { current: null } as RefObject<never>;
const URI = 'file:///cache/card.png';

beforeEach(() => {
  jest.mocked(captureRef).mockReset().mockResolvedValue(URI);
  jest.mocked(releaseCapture).mockReset();
  jest
    .mocked(Share.open)
    .mockReset()
    .mockResolvedValue({ success: true, message: 'ok' });
});

describe('shareViewAsImage', () => {
  it('captures a PNG temp file of the given view and shares it', async () => {
    const result = await shareViewAsImage(target, { title: 'Share result' });

    expect(captureRef).toHaveBeenCalledWith(target, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });
    expect(Share.open).toHaveBeenCalledWith({
      url: URI,
      type: 'image/png',
      title: 'Share result',
      failOnCancel: false,
    });
    expect(result).toEqual({ outcome: 'shared', uri: URI });
  });

  it('keeps the file after a share (the receiving app may still read it)', async () => {
    await shareViewAsImage(target, { title: 't' });

    expect(releaseCapture).not.toHaveBeenCalled();
  });

  it.each([
    [
      'dismissedAction',
      { success: false, message: 'x', dismissedAction: true },
    ],
    ['success false', { success: false, message: 'x' }],
  ])('reports cancelled and removes the file when %s', async (_name, value) => {
    jest.mocked(Share.open).mockResolvedValue(value);

    await expect(shareViewAsImage(target, { title: 't' })).resolves.toEqual({
      outcome: 'cancelled',
    });
    expect(releaseCapture).toHaveBeenCalledWith(URI);
  });

  it('treats a "User did not share" rejection as a cancellation, not an error', async () => {
    jest.mocked(Share.open).mockRejectedValue(new Error('User did not share'));

    await expect(shareViewAsImage(target, { title: 't' })).resolves.toEqual({
      outcome: 'cancelled',
    });
  });

  it('reports failed, without opening the share sheet, when the capture fails', async () => {
    jest.mocked(captureRef).mockRejectedValue(new Error('boom'));

    await expect(shareViewAsImage(target, { title: 't' })).resolves.toEqual({
      outcome: 'failed',
    });
    expect(Share.open).not.toHaveBeenCalled();
    expect(releaseCapture).not.toHaveBeenCalled();
  });

  it('reports failed when the capture returns no file', async () => {
    jest.mocked(captureRef).mockResolvedValue('');

    await expect(shareViewAsImage(target, { title: 't' })).resolves.toEqual({
      outcome: 'failed',
    });
    expect(Share.open).not.toHaveBeenCalled();
  });

  it('reports failed and removes the file when the share sheet fails', async () => {
    jest.mocked(Share.open).mockRejectedValue(new Error('no app'));

    await expect(shareViewAsImage(target, { title: 't' })).resolves.toEqual({
      outcome: 'failed',
    });
    expect(releaseCapture).toHaveBeenCalledWith(URI);
  });

  it('still reports the outcome when removing the file throws', async () => {
    jest.mocked(Share.open).mockRejectedValue(new Error('no app'));
    jest.mocked(releaseCapture).mockImplementation(() => {
      throw new Error('cannot delete');
    });

    await expect(shareViewAsImage(target, { title: 't' })).resolves.toEqual({
      outcome: 'failed',
    });
  });
});

describe('releaseSharedImage', () => {
  it('does nothing without a file and never throws', () => {
    releaseSharedImage(undefined);
    expect(releaseCapture).not.toHaveBeenCalled();

    jest.mocked(releaseCapture).mockImplementation(() => {
      throw new Error('x');
    });
    expect(() => releaseSharedImage(URI)).not.toThrow();
  });
});
