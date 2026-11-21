import type { ComponentRef, RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { View } from 'react-native';

import { useTranslation } from '../../i18n';
import { releaseSharedImage, shareViewAsImage } from './shareImage';
import type { CopyFeedback } from './useCopyResult';

/** How long the "could not share" message stays on screen. */
export const SHARE_FEEDBACK_MS = 3000;

/**
 * Share-as-image behavior for a calculator result card. Attach `captureRef` to
 * the view that should become the image (give it `collapsable={false}` and
 * keep the action row outside it), and connect `share` to the Share action.
 *
 * `fileName` is the image's name prefix; the capture adds a random number
 * (for example `simple-interest-result-` gives `simple-interest-result-123.png`).
 *
 * The native share sheet is the feedback for a successful share and for a
 * cancellation, so `feedback` only ever reports an error, and only when the
 * capture or the share sheet really failed.
 */
export function useShareResultImage(fileName?: string): {
  captureRef: RefObject<ComponentRef<typeof View> | null>;
  share: () => void;
  feedback: CopyFeedback | null;
} {
  const { t } = useTranslation();
  const captureRef = useRef<ComponentRef<typeof View>>(null);
  const [failed, setFailed] = useState(false);
  const mounted = useRef(true);
  const sharing = useRef(false);
  const lastUri = useRef<string | undefined>(undefined);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(hideTimer.current);
    };
  }, []);

  const title = t('resultActions.shareTitle');

  const share = useCallback(() => {
    if (sharing.current) {
      return;
    }
    sharing.current = true;
    clearTimeout(hideTimer.current);
    setFailed(false);
    // The previous image has long been handed over; remove it.
    releaseSharedImage(lastUri.current);
    lastUri.current = undefined;

    const run = async () => {
      const { outcome, uri } = await shareViewAsImage(captureRef, {
        title,
        fileName,
      });
      sharing.current = false;
      lastUri.current = uri;
      if (outcome !== 'failed' || !mounted.current) {
        return;
      }
      setFailed(true);
      hideTimer.current = setTimeout(() => setFailed(false), SHARE_FEEDBACK_MS);
    };
    run();
  }, [title, fileName]);

  // Derived, so the message follows a language change while it is shown.
  const feedback: CopyFeedback | null = failed
    ? { type: 'error', message: t('resultActions.shareFailed') }
    : null;

  return { captureRef, share, feedback };
}
