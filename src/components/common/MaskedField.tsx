import { useMemo, useRef, useState } from 'react';
import type { TextInputSelectionChangeEvent } from 'react-native';

import {
  applyMaskedEdit,
  type InputMask,
  type MaskSelection,
} from '../../utils';
import { TextField, type TextFieldProps } from './TextField';

interface MaskedFieldProps
  extends Omit<
    TextFieldProps,
    'value' | 'onChangeText' | 'selection' | 'onSelectionChange'
  > {
  mask: InputMask;
  /** The raw value (a date's digits, a plain decimal string), without separators. */
  value: string;
  /** Called only when an edit actually changes the raw value. */
  onChangeValue: (value: string) => void;
}

/**
 * A TextField that shows `mask.format(value)` and edits the raw `value`.
 *
 * Separators (the `/` of a date, the `,` of grouped money) are presentation
 * only. After every edit the caret is placed back on the same value character,
 * so correcting a digit in the middle never jumps the cursor or needs the
 * whole field to be cleared. The editing rules live in `applyMaskedEdit`.
 *
 * Caret synchronisation: after an edit the component sets a PROGRAMMATIC caret
 * (the controlled `selection`). The keyboard's own selection event for that
 * same keystroke can arrive afterwards, reporting the unformatted native caret
 * (for example just before the `/` that formatting inserted). Accepting it
 * would move the caret backwards, so a programmatic caret stays "pending" until
 * either the matching native event confirms it, or ONE differing event has been
 * absorbed as that stale one. Every later selection event is user-driven
 * (a tap, a drag, an arrow key) and is accepted. No timers are involved.
 *
 * This is verified in Jest by simulating the events in order; real Android
 * keyboard timing must still be confirmed on a device.
 */
export function MaskedField({
  mask,
  value,
  onChangeValue,
  ...fieldProps
}: MaskedFieldProps) {
  const text = useMemo(() => mask.format(value), [mask, value]);
  const [selection, setSelection] = useState<MaskSelection | undefined>();
  // The caret before the current edit (the keyboard reports text first).
  const caret = useRef<MaskSelection | undefined>(undefined);
  // A caret we set ourselves that the native side has not reported back yet.
  const pending = useRef<MaskSelection | undefined>(undefined);

  const setCaret = (next: MaskSelection) => {
    caret.current = next;
    // A new object every time also re-renders the input, which re-syncs its
    // native text with the masked text even when the value itself is unchanged
    // (for example a typed "/" or a rejected ninth digit).
    setSelection(next);
  };

  const handleChangeText = (nextText: string) => {
    const edit = applyMaskedEdit(mask, value, nextText, caret.current);
    if (edit.value !== value) {
      onChangeValue(edit.value);
    }
    const next = { start: edit.cursor, end: edit.cursor };
    pending.current = next;
    setCaret(next);
  };

  const handleSelectionChange = (event: TextInputSelectionChangeEvent) => {
    const next = event.nativeEvent.selection;
    if (pending.current !== undefined) {
      // Either our own caret confirmed, or the stale event of the keystroke
      // that was just formatted: in both cases it must not move the caret.
      pending.current = undefined;
      return;
    }
    if (
      caret.current === undefined ||
      caret.current.start !== next.start ||
      caret.current.end !== next.end
    ) {
      setCaret({ start: next.start, end: next.end }); // user-driven movement
    }
  };

  return (
    <TextField
      {...fieldProps}
      value={text}
      onChangeText={handleChangeText}
      selection={selection}
      onSelectionChange={handleSelectionChange}
    />
  );
}
