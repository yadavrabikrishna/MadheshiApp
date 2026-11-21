import {
  applyMaskedEdit,
  dateMask,
  groupedDecimalMask,
  plainDecimalMask,
  toAsciiDigits,
} from '../maskedInput';

/** Types `chars` at the end, one keystroke at a time, like a keyboard. */
function typeAll(mask: Parameters<typeof applyMaskedEdit>[0], chars: string) {
  let value = '';
  let text = '';
  for (const char of chars) {
    const edit = applyMaskedEdit(mask, value, text + char, {
      start: text.length,
      end: text.length,
    });
    value = edit.value;
    text = edit.text;
  }
  return { value, text };
}

describe('toAsciiDigits', () => {
  it('converts Devanagari digits', () => {
    expect(toAsciiDigits('२०८२/०१/१५')).toBe('2082/01/15');
  });
});

describe('dateMask', () => {
  it('inserts "/" automatically while typing one continuous number', () => {
    expect(typeAll(dateMask, '20250131').text).toBe('2025/01/31');
    expect(typeAll(dateMask, '2025').text).toBe('2025');
    expect(typeAll(dateMask, '20250').text).toBe('2025/0');
  });

  it('accepts Devanagari digits as ASCII digits', () => {
    expect(typeAll(dateMask, '२०८२०११५').value).toBe('20820115');
  });

  it('rejects a ninth digit and ignores non-digits', () => {
    expect(typeAll(dateMask, '202501319').value).toBe('20250131');
    expect(typeAll(dateMask, '20a25').value).toBe('2025');
  });

  it('ignores a typed "/"', () => {
    expect(typeAll(dateMask, '2025/').value).toBe('2025');
  });

  it('Backspace removes exactly one digit', () => {
    // "2025/0|1": Backspace removes the "0"
    const edit = applyMaskedEdit(dateMask, '202501', '2025/1', {
      start: 6,
      end: 6,
    });
    expect(edit.value).toBe('20251');
    expect(edit.text).toBe('2025/1');
  });

  it('deleting only a separator removes the digit before it', () => {
    // "2025/|01": Backspace deletes the "/", so the "5" goes instead
    const edit = applyMaskedEdit(dateMask, '202501', '202501', {
      start: 5,
      end: 5,
    });
    expect(edit.value).toBe('20201');
    expect(edit.text).toBe('2020/1');
    expect(edit.cursor).toBe(3);
  });

  it('edits in the middle keep the caret on the same digit', () => {
    // "2025/01/31": replace the "1" of "01" (index 6) with "2" via a selection
    const edit = applyMaskedEdit(dateMask, '20250131', '2025/02/31');
    expect(edit.value).toBe('20250231');
    expect(edit.text).toBe('2025/02/31');
    expect(edit.cursor).toBe(7);
  });

  it('inserting a digit in the middle shifts later digits and the separators', () => {
    // "2025/0|1" typing "9" at index 6 -> 2025/091
    const edit = applyMaskedEdit(dateMask, '202501', '2025/091', {
      start: 6,
      end: 6,
    });
    expect(edit.value).toBe('2025091');
    expect(edit.text).toBe('2025/09/1');
    expect(edit.cursor).toBe(7);
  });

  it('a pasted formatted date becomes eight digits', () => {
    const edit = applyMaskedEdit(dateMask, '', '2025/01/31');
    expect(edit.value).toBe('20250131');
    expect(edit.text).toBe('2025/01/31');
  });

  it('formats with no trailing separator', () => {
    expect(dateMask.format('')).toBe('');
    expect(dateMask.format('2025')).toBe('2025');
    expect(dateMask.format('202501')).toBe('2025/01');
    expect(dateMask.format('2025013')).toBe('2025/01/3');
  });
});

describe('groupedDecimalMask (principal)', () => {
  it('groups with Nepal/Indian commas as digits are typed', () => {
    expect(typeAll(groupedDecimalMask, '100000').text).toBe('1,00,000');
    expect(typeAll(groupedDecimalMask, '1234567.5').text).toBe('12,34,567.5');
  });

  it('keeps the raw value free of commas', () => {
    expect(typeAll(groupedDecimalMask, '1234567').value).toBe('1234567');
  });

  it('allows one decimal point only', () => {
    expect(typeAll(groupedDecimalMask, '1.2.3').value).toBe('1.23');
  });

  it('turns a leading "." into "0."', () => {
    expect(typeAll(groupedDecimalMask, '.5').value).toBe('0.5');
  });

  it('Backspace over a comma removes one digit', () => {
    // "1,|000": Backspace deletes the ",", so the "1" goes instead
    const edit = applyMaskedEdit(groupedDecimalMask, '1000', '1000', {
      start: 2,
      end: 2,
    });
    expect(edit.value).toBe('000');
    expect(edit.cursor).toBe(0);
  });
});

describe('plainDecimalMask (rate)', () => {
  it('shows exactly what was typed', () => {
    expect(typeAll(plainDecimalMask, '2.5').text).toBe('2.5');
  });

  it('drops letters and a second dot', () => {
    expect(typeAll(plainDecimalMask, '2a.5.5').value).toBe('2.55');
  });
});
