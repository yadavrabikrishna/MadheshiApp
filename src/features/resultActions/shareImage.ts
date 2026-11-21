import type { ComponentRef, RefObject } from 'react';
import type { View } from 'react-native';
import Share from 'react-native-share';
import { captureRef, releaseCapture } from 'react-native-view-shot';

/**
 * - `shared`: the share sheet was opened and the user picked a target. (The
 *   native side cannot say whether the receiving app finished; this only means
 *   the user did not dismiss the sheet.)
 * - `cancelled`: the user closed the share sheet. Not an error.
 * - `failed`: the capture or the share sheet failed.
 */
export type ShareImageOutcome = 'shared' | 'cancelled' | 'failed';

export interface ShareImageResult {
  outcome: ShareImageOutcome;
  /**
   * Temporary PNG that is still in use by the share sheet (only set for
   * `shared`). Pass it to `releaseSharedImage` once it is no longer needed.
   */
  uri?: string;
}

/** Deletes a temporary capture. Never throws: cleanup must not break sharing. */
export function releaseSharedImage(uri: string | undefined): void {
  if (!uri) {
    return;
  }
  try {
    releaseCapture(uri);
  } catch {
    // The file is in the app cache; the OS reclaims it if this fails.
  }
}

function isCancellation(error: unknown): boolean {
  return error instanceof Error && error.message === 'User did not share';
}

/**
 * Captures one view (and only that view) as a PNG and opens the native share
 * sheet with it attached. Never throws.
 *
 * The temporary file is deleted right away when nothing was shared. After a
 * successful share it is kept, because the receiving app may still be reading
 * it when the share sheet reports back; the caller releases it later.
 */
export async function shareViewAsImage(
  target: RefObject<ComponentRef<typeof View> | null>,
  options: { title: string; fileName?: string },
): Promise<ShareImageResult> {
  let uri: string | undefined;
  try {
    uri = await captureRef(target, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      // Android: the name prefix; a random number follows it (view-shot
      // default is "ReactNative-snapshot-image<random>").
      ...(options.fileName ? { fileName: options.fileName } : {}),
    });
    if (!uri) {
      return { outcome: 'failed' };
    }

    const result = await Share.open({
      url: uri,
      type: 'image/png',
      title: options.title,
      failOnCancel: false,
    });

    if (result.dismissedAction || !result.success) {
      releaseSharedImage(uri);
      return { outcome: 'cancelled' };
    }
    return { outcome: 'shared', uri };
  } catch (error) {
    releaseSharedImage(uri);
    return { outcome: isCancellation(error) ? 'cancelled' : 'failed' };
  }
}
