import { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslation } from '../../i18n';
import { copyTextToClipboard } from './clipboard';

export interface CopyFeedback {
  type: 'success' | 'error';
  /** Already translated, in the active language. */
  message: string;
}

/** How long the "copied" / "could not copy" message stays on screen. */
export const COPY_FEEDBACK_MS = 3000;

/**
 * Copy behavior for a calculator result card. Pass a function that builds the
 * text to copy; show `feedback` (for example through `ResultActions`) and
 * connect `copy` to the Copy action.
 *
 * `feedback` is `null` until the clipboard write has finished. It reports
 * success only when the text is confirmed to be on the clipboard, and an error
 * otherwise, so a failed copy never looks successful.
 */
export function useCopyResult(getText: () => string): {
  copy: () => void;
  feedback: CopyFeedback | null;
} {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'success' | 'error' | null>(null);
  const mounted = useRef(true);
  const copying = useRef(false);
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

  const copy = useCallback(() => {
    if (copying.current) {
      return;
    }
    copying.current = true;
    clearTimeout(hideTimer.current);
    setStatus(null);

    const run = async () => {
      let copied = false;
      try {
        copied = await copyTextToClipboard(getText());
      } catch {
        copied = false;
      }
      copying.current = false;
      if (!mounted.current) {
        return;
      }
      setStatus(copied ? 'success' : 'error');
      hideTimer.current = setTimeout(() => setStatus(null), COPY_FEEDBACK_MS);
    };
    run();
  }, [getText]);

  // The message is derived, so it follows a language change while it is shown.
  const feedback: CopyFeedback | null = status
    ? {
        type: status,
        message: t(
          status === 'success'
            ? 'resultActions.copied'
            : 'resultActions.copyFailed',
        ),
      }
    : null;

  return { copy, feedback };
}
