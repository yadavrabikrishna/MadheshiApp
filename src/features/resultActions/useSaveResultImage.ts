import type { ComponentRef, RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { View } from 'react-native';

import { useTranslation } from '../../i18n';
import { saveViewAsImage, type SaveImageOutcome } from './saveImage';
import type { CopyFeedback } from './useCopyResult';

/** How long the save message stays on screen. */
export const SAVE_FEEDBACK_MS = 3000;

type Status = 'saved' | 'denied' | 'failed' | null;

/**
 * Save-image behavior for a calculator result card. Pass the ref of the view
 * that should become the image (the same one used for sharing), and connect
 * `save` to the Save Image action. `fileName` is the image's name prefix; the
 * capture adds a random number.
 *
 * `feedback` is `null` until the save has finished. Success is reported only
 * after the gallery confirmed the save; permission denial and failures are
 * reported as errors.
 */
export function useSaveResultImage(
  captureRef: RefObject<ComponentRef<typeof View> | null>,
  fileName?: string,
): { save: () => void; feedback: CopyFeedback | null } {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>(null);
  const mounted = useRef(true);
  const saving = useRef(false);
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

  const save = useCallback(() => {
    if (saving.current) {
      return;
    }
    saving.current = true;
    clearTimeout(hideTimer.current);
    setStatus(null);

    const run = async () => {
      let outcome: SaveImageOutcome;
      try {
        outcome = await saveViewAsImage(captureRef, { fileName });
      } catch {
        outcome = 'failed';
      }
      saving.current = false;
      if (!mounted.current) {
        return;
      }
      setStatus(outcome);
      hideTimer.current = setTimeout(() => setStatus(null), SAVE_FEEDBACK_MS);
    };
    run();
  }, [captureRef, fileName]);

  // Derived, so the message follows a language change while it is shown.
  const feedback: CopyFeedback | null = status
    ? {
        type: status === 'saved' ? 'success' : 'error',
        message: t(
          status === 'saved'
            ? 'resultActions.saved'
            : status === 'denied'
            ? 'resultActions.savePermissionDenied'
            : 'resultActions.saveFailed',
        ),
      }
    : null;

  return { save, feedback };
}
