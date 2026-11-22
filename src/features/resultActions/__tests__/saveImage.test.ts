import type { RefObject } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { captureRef, releaseCapture } from 'react-native-view-shot';

import { saveViewAsImage } from '../saveImage';

const target = { current: null } as RefObject<never>;
const URI = 'file:///cache/card.png';
const setPlatform = (os: string, version: number) => {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
  Object.defineProperty(Platform, 'Version', {
    value: version,
    configurable: true,
  });
};

let check: jest.SpyInstance;
let request: jest.SpyInstance;

beforeEach(() => {
  setPlatform('android', 34);
  jest.mocked(captureRef).mockReset().mockResolvedValue(URI);
  jest.mocked(releaseCapture).mockReset();
  jest
    .mocked(CameraRoll.saveAsset)
    .mockReset()
    .mockResolvedValue({} as never);
  check = jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
  request = jest
    .spyOn(PermissionsAndroid, 'request')
    .mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('saveViewAsImage', () => {
  it('captures a PNG of the view and saves it as a photo in the album', async () => {
    await expect(
      saveViewAsImage(target, { fileName: 'card-', album: 'Album' }),
    ).resolves.toBe('saved');

    expect(captureRef).toHaveBeenCalledWith(target, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      fileName: 'card-',
    });
    expect(CameraRoll.saveAsset).toHaveBeenCalledWith(URI, {
      type: 'photo',
      album: 'Album',
    });
  });

  it('uses the default album and omits the file name when none is given', async () => {
    await saveViewAsImage(target);

    expect(jest.mocked(captureRef).mock.calls[0][1]).not.toHaveProperty(
      'fileName',
    );
    expect(CameraRoll.saveAsset).toHaveBeenCalledWith(URI, {
      type: 'photo',
      album: 'MadheshiApp',
    });
  });

  it('deletes the temporary capture after saving', async () => {
    await saveViewAsImage(target);

    expect(releaseCapture).toHaveBeenCalledWith(URI);
  });

  it('asks for no permission on Android 10 and later', async () => {
    for (const version of [29, 33, 36]) {
      setPlatform('android', version);
      await expect(saveViewAsImage(target)).resolves.toBe('saved');
    }

    expect(check).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it('asks for storage permission on Android 9 and earlier, then saves', async () => {
    setPlatform('android', 28);

    await expect(saveViewAsImage(target)).resolves.toBe('saved');

    expect(request).toHaveBeenCalledWith(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    );
  });

  it('does not ask again when the permission is already granted', async () => {
    setPlatform('android', 24);
    check.mockResolvedValue(true);

    await expect(saveViewAsImage(target)).resolves.toBe('saved');

    expect(request).not.toHaveBeenCalled();
  });

  it.each([
    PermissionsAndroid.RESULTS.DENIED,
    PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
  ])(
    'reports denied, and captures and saves nothing, when permission is %s',
    async result => {
      setPlatform('android', 28);
      request.mockResolvedValue(result);

      await expect(saveViewAsImage(target)).resolves.toBe('denied');

      expect(captureRef).not.toHaveBeenCalled();
      expect(CameraRoll.saveAsset).not.toHaveBeenCalled();
    },
  );

  it('reports failed when the permission request throws', async () => {
    setPlatform('android', 28);
    request.mockRejectedValue(new Error('no activity'));

    await expect(saveViewAsImage(target)).resolves.toBe('failed');
    expect(CameraRoll.saveAsset).not.toHaveBeenCalled();
  });

  it('reports failed, and saves nothing, when the capture fails or returns no file', async () => {
    jest.mocked(captureRef).mockRejectedValueOnce(new Error('boom'));
    await expect(saveViewAsImage(target)).resolves.toBe('failed');

    jest.mocked(captureRef).mockResolvedValueOnce('');
    await expect(saveViewAsImage(target)).resolves.toBe('failed');

    expect(CameraRoll.saveAsset).not.toHaveBeenCalled();
  });

  it('reports failed, and still deletes the capture, when the gallery save fails', async () => {
    jest.mocked(CameraRoll.saveAsset).mockRejectedValue(new Error('disk full'));

    await expect(saveViewAsImage(target)).resolves.toBe('failed');

    expect(releaseCapture).toHaveBeenCalledWith(URI);
  });

  it('still reports saved when deleting the capture throws', async () => {
    jest.mocked(releaseCapture).mockImplementation(() => {
      throw new Error('cannot delete');
    });

    await expect(saveViewAsImage(target)).resolves.toBe('saved');
  });
});
