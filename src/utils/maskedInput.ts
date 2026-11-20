import { groupDecimalString } from './formatMoney';

/**
 * Pure editing logic for masked text inputs (dates, grouped money).
 *
 * A mask separates the VALUE the user is entering (for a date: its digits) from
 * its DISPLAY text (the digits plus automatic separators). Keeping them apart
 * means separators are presentation only: Backspace removes one value
 * character at a time, and a caret in the middle of the text stays on the same
 * value character when separators are inserted or removed.
 *
 * No React or React Native code here, so every rule is unit tested.
 */

export interface InputMask {
  /** The value-carrying characters of `text`; everything else is a separator. */
  toValue(text: string): string;
  /** Enforce the shape of a value. Return `null` to reject the whole edit. */
  normalize(value: string): string | null;
  /** The display text for a value. Must not end with a dangling separator. */
  format(value: string): string;
}

export interface MaskSelection {
  start: number;
  end: number;
}

export interface MaskedEdit {
  /** The new value (unchanged when the edit was rejected or had no effect). */
  value: string;
  /** The text to display: `mask.format(value)`. */
  text: string;
  /** Where to place the caret in `text`. */
  cursor: number;
}

/** Devanagari digits (०-९) become ASCII digits; the engine accepts only ASCII. */
export function toAsciiDigits(text: string): string {
  return text.replace(/[०-९]/g, char =>
    String(char.charCodeAt(0) - '०'.charCodeAt(0)),
  );
}

/** Neutral date mask: eight digits shown as `YYYY/MM/DD`. */
export const DATE_DIGIT_COUNT = 8;

export const dateMask: InputMask = {
  toValue: text => toAsciiDigits(text).replace(/\D/g, ''),
  // A ninth digit is rejected rather than silently dropping a typed one.
  normalize: value => (value.length > DATE_DIGIT_COUNT ? null : value),
  // No trailing separator ("2025", not "2025/"), so Backspace never gets stuck.
  format: value =>
    [value.slice(0, 4), value.slice(4, 6), value.slice(6, 8)]
      .filter(part => part.length > 0)
      .join('/'),
};

/** Plain decimal mask: digits and one `.`; a leading `.` becomes `0.`. */
function normalizeDecimal(value: string): string {
  const firstDot = value.indexOf('.');
  let result =
    firstDot === -1
      ? value
      : value.slice(0, firstDot + 1) +
        value.slice(firstDot + 1).replace(/\./g, '');
  if (result.startsWith('.')) {
    result = `0${result}`;
  }
  return result;
}

const toDecimalValue = (text: string) =>
  toAsciiDigits(text).replace(/[^\d.]/g, '');

/** Principal: a decimal shown with Nepal/Indian digit grouping (`1,00,000.5`). */
export const groupedDecimalMask: InputMask = {
  toValue: toDecimalValue,
  normalize: normalizeDecimal,
  format: groupDecimalString,
};

/** Rate: a decimal shown exactly as typed. */
export const plainDecimalMask: InputMask = {
  toValue: toDecimalValue,
  normalize: normalizeDecimal,
  format: value => value,
};

interface TextEdit {
  start: number;
  removed: number;
  inserted: string;
}

/**
 * Finds what changed between the displayed text and the text the keyboard
 * reports. The pre-edit caret (when it is consistent with the change) settles
 * ambiguity among repeated characters; otherwise a prefix/suffix diff is used.
 */
function findEdit(
  previous: string,
  next: string,
  caret: MaskSelection | undefined,
): TextEdit {
  if (caret !== undefined && caret.start === caret.end) {
    const c = caret.start;
    if (
      next.length === previous.length - 1 &&
      c >= 1 &&
      previous.slice(0, c - 1) + previous.slice(c) === next
    ) {
      return { start: c - 1, removed: 1, inserted: '' };
    }
    if (
      next.length === previous.length + 1 &&
      c <= previous.length &&
      next.slice(0, c) + next.slice(c + 1) === previous
    ) {
      return { start: c, removed: 0, inserted: next[c] };
    }
  }

  const shortest = Math.min(previous.length, next.length);
  let prefix = 0;
  while (prefix < shortest && previous[prefix] === next[prefix]) {
    prefix += 1;
  }
  let suffix = 0;
  while (
    suffix < shortest - prefix &&
    previous[previous.length - 1 - suffix] === next[next.length - 1 - suffix]
  ) {
    suffix += 1;
  }
  return {
    start: prefix,
    removed: previous.length - prefix - suffix,
    inserted: next.slice(prefix, next.length - suffix),
  };
}

/** Caret index in `text` just after its first `count` value characters. */
function caretAfterValueChars(
  mask: InputMask,
  text: string,
  count: number,
): number {
  if (count <= 0) {
    return 0;
  }
  let seen = 0;
  for (let index = 0; index < text.length; index += 1) {
    seen += mask.toValue(text[index]).length;
    if (seen >= count) {
      return index + 1;
    }
  }
  return text.length;
}

/**
 * Applies one keyboard edit to a masked value.
 *
 * @param previousValue the current value (what `mask.format` displays)
 * @param nextText      the text the keyboard produced
 * @param caret         the caret before the edit, if known (optional hint)
 *
 * Rules: separators are never part of the value; deleting only a separator
 * (Backspace just after a `/` or `,`) deletes the value character before it,
 * so every Backspace removes exactly one value character; characters that are
 * not part of the value are ignored; an edit the mask rejects leaves the value
 * unchanged.
 */
export function applyMaskedEdit(
  mask: InputMask,
  previousValue: string,
  nextText: string,
  caret?: MaskSelection,
): MaskedEdit {
  const previousText = mask.format(previousValue);
  const edit = findEdit(previousText, nextText, caret);

  const valueCharsBefore = (index: number) =>
    mask.toValue(previousText.slice(0, index)).length;
  const from = valueCharsBefore(edit.start);
  const to = valueCharsBefore(edit.start + edit.removed);
  const insertedValue = mask.toValue(edit.inserted);

  let candidate: string;
  let caretValueChars: number;
  if (edit.inserted === '' && edit.removed > 0 && from === to) {
    // Only separators were deleted: remove the value character before them.
    if (from === 0) {
      return { value: previousValue, text: previousText, cursor: 0 };
    }
    candidate = previousValue.slice(0, from - 1) + previousValue.slice(from);
    caretValueChars = from - 1;
  } else {
    candidate =
      previousValue.slice(0, from) + insertedValue + previousValue.slice(to);
    caretValueChars = from + insertedValue.length;
  }

  const normalized = mask.normalize(candidate);
  if (normalized === null) {
    return {
      value: previousValue,
      text: previousText,
      cursor: caretAfterValueChars(mask, previousText, from),
    };
  }

  // Normalising may add a leading "0" (before the caret) or drop extra dots.
  const adjusted = Math.min(
    Math.max(
      caretValueChars + Math.max(0, normalized.length - candidate.length),
      0,
    ),
    normalized.length,
  );
  const text = mask.format(normalized);
  return {
    value: normalized,
    text,
    cursor: caretAfterValueChars(mask, text, adjusted),
  };
}
