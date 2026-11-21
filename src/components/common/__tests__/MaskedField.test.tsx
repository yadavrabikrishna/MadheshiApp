/**
 * MaskedField event path: onChangeText + the controlled `selection` prop +
 * onSelectionChange, driven in the order the native side delivers them.
 *
 * This proves the component logic. It does NOT prove real Android keyboard
 * timing; that still needs device verification.
 */
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';

import { createAppStore } from '../../../store';
import type { PreferencesRepository } from '../../../storage';
import { dateMask, groupedDecimalMask, type InputMask } from '../../../utils';
import { MaskedField } from '../MaskedField';

const store = () =>
  createAppStore({
    preferencesRepository: {} as unknown as PreferencesRepository,
    getSystemTheme: () => 'light',
  });

let latestValue = '';

function Harness({
  mask,
  initial,
  onChangeValue,
}: {
  mask: InputMask;
  initial: string;
  onChangeValue?: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <MaskedField
      mask={mask}
      label="Field"
      keyboardType="number-pad"
      value={value}
      onChangeValue={next => {
        latestValue = next;
        onChangeValue?.(next);
        setValue(next);
      }}
    />
  );
}

async function setup(
  mask: InputMask,
  initial: string,
  onChangeValue?: (value: string) => void,
) {
  latestValue = initial;
  await render(
    <Provider store={store()}>
      <Harness mask={mask} initial={initial} onChangeValue={onChangeValue} />
    </Provider>,
  );
  return () => screen.getByLabelText('Field');
}

const select = (input: ReturnType<typeof screen.getByLabelText>, at: number) =>
  fireEvent(input, 'selectionChange', {
    nativeEvent: { selection: { start: at, end: at } },
  });
const typeText = (
  input: ReturnType<typeof screen.getByLabelText>,
  text: string,
) => fireEvent.changeText(input, text);

describe('MaskedField date input', () => {
  it('inserts the separator while typing and puts the caret after the new digit', async () => {
    const input = await setup(dateMask, '2025');

    await typeText(input(), '20250');

    expect(input().props.value).toBe('2025/0');
    expect(input().props.selection).toEqual({ start: 6, end: 6 });
    expect(latestValue).toBe('20250');
  });

  it('ignores a stale native selection event after a formatted edit', async () => {
    const input = await setup(dateMask, '2025');
    await typeText(input(), '20250');

    // The keyboard reports its own unformatted caret (before the "/").
    await select(input(), 5);

    expect(input().props.selection).toEqual({ start: 6, end: 6 });
  });

  it('accepts the confirming event and then user-driven movement', async () => {
    const input = await setup(dateMask, '2025');
    await typeText(input(), '20250');

    await select(input(), 6); // our own caret, confirmed
    await select(input(), 2); // the user taps elsewhere

    expect(input().props.selection).toEqual({ start: 2, end: 2 });
  });

  it('accepts user-driven movement after one stale event was absorbed', async () => {
    const input = await setup(dateMask, '2025');
    await typeText(input(), '20250');
    await select(input(), 5); // stale, absorbed
    await select(input(), 3); // user

    expect(input().props.selection).toEqual({ start: 3, end: 3 });
  });

  it('keeps editing in the middle on the same digit (cursor repositioning)', async () => {
    const input = await setup(dateMask, '20250131');
    await select(input(), 7); // user places the caret after "2025/01"

    // Replace the "1" of the month (keyboard reports the whole new text).
    await typeText(input(), '2025/02/31');

    expect(latestValue).toBe('20250231');
    expect(input().props.value).toBe('2025/02/31');
    expect(input().props.selection).toEqual({ start: 7, end: 7 });
  });

  it('Backspace removes exactly one digit', async () => {
    const input = await setup(dateMask, '202501');
    await select(input(), 6); // "2025/0|1"

    await typeText(input(), '2025/1');

    expect(latestValue).toBe('20251');
    expect(input().props.value).toBe('2025/1');
    expect(input().props.selection).toEqual({ start: 4, end: 4 });
  });

  it('Backspace over a separator removes the digit before it, then repeated Backspace keeps going', async () => {
    const input = await setup(dateMask, '202501');
    await select(input(), 5); // "2025/|01"

    await typeText(input(), '202501'); // the "/" was deleted
    expect(latestValue).toBe('20201');
    expect(input().props.value).toBe('2020/1');

    await select(input(), 3); // confirms our caret: "202|0/1"
    await typeText(input(), '200/1'); // Backspace deletes the "2" before it
    expect(latestValue).toBe('2001');
    expect(input().props.value).toBe('2001');
  });

  it('rejects a ninth digit without calling onChangeValue and restores the text', async () => {
    const onChange = jest.fn();
    const input = await setup(dateMask, '20250131', onChange);

    await typeText(input(), '2025/01/319');

    expect(onChange).not.toHaveBeenCalled();
    expect(input().props.value).toBe('2025/01/31');
  });

  it('a typed "/" changes nothing', async () => {
    const onChange = jest.fn();
    const input = await setup(dateMask, '2025', onChange);

    await typeText(input(), '2025/');

    expect(onChange).not.toHaveBeenCalled();
    expect(input().props.value).toBe('2025');
  });
});

describe('MaskedField money grouping', () => {
  it('regroups while typing and keeps commas out of the raw value', async () => {
    const input = await setup(groupedDecimalMask, '1000');

    await typeText(input(), '1,0001');

    expect(latestValue).toBe('10001');
    expect(input().props.value).toBe('10,001');
    expect(input().props.selection).toEqual({ start: 6, end: 6 });
  });

  it('Backspace over a comma removes one digit', async () => {
    const input = await setup(groupedDecimalMask, '1000');
    await select(input(), 2); // "1,|000"

    await typeText(input(), '1000');

    expect(latestValue).toBe('000');
  });
});
