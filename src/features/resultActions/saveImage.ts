import type { ComponentRef, RefObject } from 'react';
import { PermissionsAndroid, Platform, type View } from 'react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { captureRef } from 'react-native-view-shot';

import { releaseSharedImage } from './shareImage';

/**
 * - `saved`: the image is in the gallery.
 * - `denied`: Android asked for storage permission and the user said no.
 * - `failed`: the capture or the save failed.
 */
export type SaveImageOutcome = 'saved' | 'denied' | 'failed';

/** Gallery folder the images are saved into (Android 10 and later: DCIM). */
export const DEFAULT_GALLERY_ALBUM = 'MadheshiApp';

/**
 * Android 10 (API 29) and later save a newly created image through
 * MediaStore without any permission. Only Android 9 and earlier (API 24 to 28
 * here) need WRITE_EXTERNAL_STORAGE, so that is the only case that asks.
 */
async function ensureSavePermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || Number(Platform.Version) >= 29) {
    return true;
  }
  const permission = PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;
  if (await PermissionsAndroid.check(permission)) {
    return true;
  }
  return (
    (await PermissionsAndroid.request(permission)) ===
    PermissionsAndroid.RESULTS.GRANTED
  );
}

/**
 * Captures one view (and only that view) as a PNG and saves it to the device
 * gallery. Never throws. Resolves `saved` only after the gallery save itself
 * has resolved.
 *
 * The temporary capture is always deleted: the gallery save copies it before
 * it resolves, so nothing else needs the file.
 */
export async function saveViewAsImage(
  target: RefObject<ComponentRef<typeof View> | null>,
  options: { fileName?: string; album?: string } = {},
): Promise<SaveImageOutcome> {
  let uri: string | undefined;
  try {
    if (!(await ensureSavePermission())) {
      return 'denied';
    }
    uri = await captureRef(target, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      ...(options.fileName ? { fileName: options.fileName } : {}),
    });
    if (!uri) {
      return 'failed';
    }
    await CameraRoll.saveAsset(uri, {
      type: 'photo',
      album: options.album ?? DEFAULT_GALLERY_ALBUM,
    });
    return 'saved';
  } catch {
    return 'failed';
  } finally {
    releaseSharedImage(uri);
  }
}
