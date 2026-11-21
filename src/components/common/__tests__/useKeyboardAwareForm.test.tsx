/**
 * Keyboard-aware scrolling logic. Jest cannot reproduce Android's real
 * keyboard, window and IME timing, so these tests drive the hook with the
 * same inputs it receives on a device (keyboard events, measurements, layout
 * events). Real-device verification is still required.
 */
import { act, render } from '@testing-library/react-native';
import {
  Keyboard,
  Platform,
  ScrollView,
  View,
  type TextInputInstance,
} from 'react-native';

import {
  FIELD_MARGIN_ABOVE,
  FIELD_MARGIN_BELOW,
  computeScrollDelta,
  useKeyboardAwareForm,
} from '../useKeyboardAwareForm';

describe('computeScrollDelta', () => {
  const visible = { visibleTop: 100, visibleBottom: 500 };

  it('is 0 when the field is already fully visible', () => {
    expect(
      computeScrollDelta({ ...visible, fieldTop: 150, fieldBottom: 250 }),
    ).toBe(0);
    // exactly touching both edges still counts as visible
    expect(
      computeScrollDelta({ ...visible, fieldTop: 100, fieldBottom: 500 }),
    ).toBe(0);
  });

  it('scrolls down just enough for a field below the visible area', () => {
    expect(
      computeScrollDelta({ ...visible, fieldTop: 450, fieldBottom: 560 }),
    ).toBe(60);
  });

  it('scrolls up for a field above the visible area', () => {
    expect(
      computeScrollDelta({ ...visible, fieldTop: 40, fieldBottom: 150 }),
    ).toBe(-60);
  });

  it('shows the top of a field taller than the visible area', () => {
    expect(
      computeScrollDelta({
        visibleTop: 0,
        visibleBottom: 100,
        fieldTop: 50,
        fieldBottom: 400,
      }),
    ).toBe(50);
  });
});

type Handler = (event?: { endCoordinates?: { screenY: number } }) => void;
const handlers: Record<string, Handler> = {};
const removers: jest.Mock[] = [];

let api: ReturnType<typeof useKeyboardAwareForm>;

function Harness() {
  api = useKeyboardAwareForm();
  return (
    <View
      testID="container"
      ref={api.containerRef}
      style={{ paddingBottom: api.keyboardInset }}
    >
      <ScrollView testID="scroll" ref={api.scrollRef} {...api.scrollProps} />
    </View>
  );
}

const inset = (screen: Awaited<ReturnType<typeof render>>) =>
  screen.getByTestId('container').props.style.paddingBottom;

async function mount() {
  const screen = await render(<Harness />);
  // The container occupies window y 100..700 (height 600).
  (
    api.containerRef.current as unknown as { measureInWindow: jest.Mock }
  ).measureInWindow = jest.fn(cb => cb(0, 100, 360, 600));
  return screen;
}

beforeEach(() => {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.spyOn(Keyboard, 'addListener').mockImplementation(((
    event: string,
    handler: Handler,
  ) => {
    handlers[event] = handler;
    const remove = jest.fn();
    removers.push(remove);
    return { remove };
  }) as unknown as typeof Keyboard.addListener);
  jest.spyOn(Keyboard, 'metrics').mockReturnValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
  removers.length = 0;
});

describe('useKeyboardAwareForm: keyboard inset', () => {
  it('uses the Android "Did" events and starts with no inset', async () => {
    const screen = await mount();
    expect(Object.keys(handlers)).toEqual(
      expect.arrayContaining(['keyboardDidShow', 'keyboardDidHide']),
    );
    expect(inset(screen)).toBe(0);
  });

  it('pads the container by the part of it hidden behind the keyboard', async () => {
    const screen = await mount();

    // Keyboard top at window y 450: container bottom (700) is 250 under it.
    await act(async () =>
      handlers.keyboardDidShow({ endCoordinates: { screenY: 450 } }),
    );

    expect(inset(screen)).toBe(250);
  });

  it('restores the normal layout (no blank space) when the keyboard hides', async () => {
    const screen = await mount();
    await act(async () =>
      handlers.keyboardDidShow({ endCoordinates: { screenY: 450 } }),
    );

    await act(async () => handlers.keyboardDidHide());

    expect(inset(screen)).toBe(0);
  });

  it('never pads when the keyboard does not overlap the container', async () => {
    const screen = await mount();
    await act(async () =>
      handlers.keyboardDidShow({ endCoordinates: { screenY: 900 } }),
    );
    expect(inset(screen)).toBe(0);
  });

  it('follows a keyboard height change without a hide in between', async () => {
    const screen = await mount();
    await act(async () =>
      handlers.keyboardDidShow({ endCoordinates: { screenY: 450 } }),
    );
    await act(async () =>
      handlers.keyboardDidShow({ endCoordinates: { screenY: 500 } }),
    );
    expect(inset(screen)).toBe(200);
  });

  it('stops listening on unmount', async () => {
    const screen = await mount();
    await screen.unmount();
    expect(removers.length).toBeGreaterThan(0);
    removers.forEach(remove => expect(remove).toHaveBeenCalled());
  });
});

/**
 * A tiny simulated screen. Content y positions are fixed; the window position
 * of anything is `scrollViewTop + contentY - scrollY`, exactly what
 * measureInWindow reports on a device. scrollTo updates scrollY and emits the
 * scroll event, as the real ScrollView does.
 */
function createWorld() {
  const world = {
    scrollViewTop: 100,
    scrollViewHeight: 600, // 100..700 with no keyboard
    scrollY: 0,
    fields: {} as Record<string, number>, // content y of each field (height 48)
    scrollTo: jest.fn(),
  };
  const windowY = (name: string) =>
    world.scrollViewTop + world.fields[name] - world.scrollY;
  /** A field is fully visible with its label and hint above the keyboard. */
  // Half a pixel of tolerance: an eased animation approaches its target only
  // asymptotically.
  const TOLERANCE = 0.5;
  const fullyVisible = (name: string, keyboardTop = Infinity) =>
    windowY(name) - FIELD_MARGIN_ABOVE >= world.scrollViewTop - TOLERANCE &&
    windowY(name) + 48 + FIELD_MARGIN_BELOW <=
      Math.min(world.scrollViewTop + world.scrollViewHeight, keyboardTop) +
        TOLERANCE;
  const input = (name: string) =>
    ({
      measureInWindow: jest.fn(cb => cb(0, windowY(name), 300, 48)),
    } as unknown as TextInputInstance);
  return { world, windowY, fullyVisible, input };
}

describe('useKeyboardAwareForm: automatic scrolling', () => {
  async function setup() {
    const { world, fullyVisible, input } = createWorld();
    const screen = await mount();
    const scroll = api.scrollRef.current as unknown as Record<string, unknown>;
    scroll.measureInWindow = jest.fn(cb =>
      cb(0, world.scrollViewTop, 360, world.scrollViewHeight),
    );
    world.scrollTo.mockImplementation(({ y }: { y: number }) => {
      world.scrollY = y;
      api.scrollProps.onScroll({
        nativeEvent: { contentOffset: { x: 0, y } },
      } as never);
    });
    scroll.scrollTo = world.scrollTo;

    /** The keyboard (top edge at `top`) appears; padding then resizes the ScrollView. */
    const showKeyboard = async (top: number) => {
      await act(async () =>
        handlers.keyboardDidShow({ endCoordinates: { screenY: top } }),
      );
      world.scrollViewHeight = top - world.scrollViewTop;
      await act(async () => api.scrollProps.onLayout());
    };
    const hideKeyboard = async () => {
      await act(async () => handlers.keyboardDidHide());
      world.scrollViewHeight = 600;
      await act(async () => api.scrollProps.onLayout());
    };
    return { screen, world, fullyVisible, input, showKeyboard, hideKeyboard };
  }

  // Content layout: Principal 40, Rate 220, Start Date 420, End Date 520.
  const FIELDS = { principal: 40, rate: 220, startDate: 420, endDate: 520 };

  it('scrolls an obscured field into view when it gets focus (keyboard already open)', async () => {
    const t = await setup();
    t.world.fields = FIELDS;
    await t.showKeyboard(400); // visible area 100..400
    const startDate = t.input('startDate');
    t.world.scrollTo.mockClear();

    await act(async () => api.onFieldFocus(startDate));

    expect(t.world.scrollTo).toHaveBeenCalledTimes(1);
    expect(t.fullyVisible('startDate', 400)).toBe(true);
  });

  it('scrolls when the keyboard opens while a field is already focused', async () => {
    const t = await setup();
    t.world.fields = FIELDS;
    const startDate = t.input('startDate');
    await act(async () => api.onFieldFocus(startDate));
    // Fully visible in the 600 high viewport: focus alone must not scroll.
    expect(t.world.scrollTo).not.toHaveBeenCalled();

    await t.showKeyboard(400);

    expect(t.world.scrollTo).toHaveBeenCalled();
    expect(t.fullyVisible('startDate', 400)).toBe(true);
  });

  it('scrolls on the keyboard event itself, without waiting for the padding layout', async () => {
    const t = await setup();
    t.world.fields = FIELDS;
    await act(async () => api.onFieldFocus(t.input('startDate')));

    // Only the keyboard event: the ScrollView has NOT been resized or laid out.
    await act(async () =>
      handlers.keyboardDidShow({ endCoordinates: { screenY: 400 } }),
    );

    expect(t.world.scrollTo).toHaveBeenCalledTimes(1);
    expect(t.fullyVisible('startDate', 400)).toBe(true);
  });

  it('does not scroll when the focused field is already fully visible', async () => {
    const t = await setup();
    t.world.fields = FIELDS;
    await t.showKeyboard(400);
    t.world.scrollTo.mockClear();

    await act(async () => api.onFieldFocus(t.input('principal')));

    expect(t.world.scrollTo).not.toHaveBeenCalled();
  });

  it('Next: moving focus through every field keeps each one visible above the keyboard', async () => {
    const t = await setup();
    t.world.fields = FIELDS;
    await t.showKeyboard(400);
    const inputs = Object.keys(FIELDS).map(
      name => [name, t.input(name)] as const,
    );

    let previous: TextInputInstance | null = null;
    for (const [name, field] of inputs) {
      await act(async () => {
        if (previous) {
          api.onFieldBlur(previous);
        }
        api.onFieldFocus(field);
      });
      expect(t.fullyVisible(name, 400)).toBe(true);
      previous = field;
    }
  });

  it('a field at the very bottom of the form ends up fully above the keyboard', async () => {
    const t = await setup();
    t.world.fields = { ...FIELDS, endDate: 900 };
    await t.showKeyboard(350);

    await act(async () => api.onFieldFocus(t.input('endDate')));

    // fullyVisible includes the label above and the hint/error room below.
    expect(t.fullyVisible('endDate', 350)).toBe(true);
  });

  it('keeps the field visible when the keyboard height changes (decimal-pad to number-pad)', async () => {
    const t = await setup();
    t.world.fields = FIELDS;
    await t.showKeyboard(400);
    await act(async () => api.onFieldFocus(t.input('endDate')));
    expect(t.fullyVisible('endDate', 400)).toBe(true);

    await t.showKeyboard(300); // a taller keyboard

    expect(t.fullyVisible('endDate', 300)).toBe(true);
  });

  it('does not loop: repeated focus, keyboard and layout triggers scroll only once', async () => {
    const t = await setup();
    t.world.fields = FIELDS;
    const startDate = t.input('startDate');
    await act(async () => api.onFieldFocus(startDate));
    await t.showKeyboard(400);
    const afterKeyboard = t.world.scrollTo.mock.calls.length;
    expect(afterKeyboard).toBeGreaterThan(0);

    // Extra triggers with the field already visible must not scroll again.
    await act(async () => api.onFieldFocus(startDate));
    await act(async () => api.scrollProps.onLayout());
    await act(async () => api.scrollProps.onLayout());
    await act(async () =>
      handlers.keyboardDidShow({ endCoordinates: { screenY: 400 } }),
    );

    expect(t.world.scrollTo).toHaveBeenCalledTimes(afterKeyboard);
  });

  it("keeps manual scrolling working: later scrolls start from the user's position", async () => {
    const t = await setup();
    t.world.fields = FIELDS;
    await t.showKeyboard(400);
    await act(async () => api.onFieldFocus(t.input('principal')));

    // The user scrolls the form by hand to 250.
    t.world.scrollY = 250;
    await act(async () =>
      api.scrollProps.onScroll({
        nativeEvent: { contentOffset: { x: 0, y: 250 } },
      } as never),
    );
    // Principal is now scrolled out of view above; focusing again re-shows it.
    await act(async () => api.onFieldFocus(t.input('principal')));

    expect(t.fullyVisible('principal', 400)).toBe(true);
    // The hook only reports scroll events; it never locks scrolling.
    expect(api.scrollProps).not.toHaveProperty('scrollEnabled');
  });

  it('ignores a measurement that finishes after focus has moved on', async () => {
    const t = await setup();
    t.world.fields = FIELDS;
    await t.showKeyboard(400);
    const slow: Array<() => void> = [];
    const first = {
      measureInWindow: jest.fn(cb => slow.push(() => cb(0, 900, 300, 48))),
    } as unknown as TextInputInstance;
    t.world.scrollTo.mockClear();

    await act(async () => api.onFieldFocus(first));
    await act(async () => api.onFieldBlur(first));
    await act(async () => slow.forEach(run => run()));

    expect(t.world.scrollTo).not.toHaveBeenCalled();
  });

  it('converges on one target when a second trigger arrives mid-animation (no overshoot, no ping-pong)', async () => {
    const t = await setup();
    t.world.fields = FIELDS;
    await act(async () => api.onFieldFocus(t.input('endDate')));

    // Animated scrolling: scrollTo only records a target; frames move toward it
    // and report their offset, as the real ScrollView does.
    let animationTarget = t.world.scrollY;
    const targets: number[] = [];
    t.world.scrollTo.mockImplementation(({ y }: { y: number }) => {
      animationTarget = y;
      targets.push(y);
    });
    const frame = async (fraction: number) => {
      t.world.scrollY += (animationTarget - t.world.scrollY) * fraction;
      await act(async () =>
        api.scrollProps.onScroll({
          nativeEvent: { contentOffset: { x: 0, y: t.world.scrollY } },
        } as never),
      );
    };

    // 1. The keyboard event starts the scroll.
    await act(async () =>
      handlers.keyboardDidShow({ endCoordinates: { screenY: 400 } }),
    );
    // 2. Half way there, the padding resizes the ScrollView and onLayout fires.
    await frame(0.5);
    t.world.scrollViewHeight = 300;
    await act(async () => api.scrollProps.onLayout());
    // 3. A further layout while still animating.
    await frame(0.5);
    await act(async () => api.scrollProps.onLayout());
    // 4. Let it finish.
    for (let i = 0; i < 20; i += 1) {
      await frame(0.5);
    }

    expect(t.fullyVisible('endDate', 400)).toBe(true);
    // Every requested target agrees (within a pixel or two): no overshoot.
    const final = Math.max(...targets);
    targets.forEach(target => expect(Math.abs(target - final)).toBeLessThan(3));
    expect(targets.length).toBeLessThanOrEqual(4);
  });

  it('keyboard dismissal restores the original layout and spacing', async () => {
    const t = await setup();
    t.world.fields = FIELDS;
    await t.showKeyboard(400);
    expect(inset(t.screen)).toBeGreaterThan(0);

    await t.hideKeyboard();

    expect(inset(t.screen)).toBe(0);
    // Hiding never scrolls the form by itself.
    const calls = t.world.scrollTo.mock.calls.length;
    await t.hideKeyboard();
    expect(t.world.scrollTo.mock.calls.length).toBe(calls);
  });

  it('scrollToTop scrolls to offset 0', async () => {
    const t = await setup();
    await act(async () => api.scrollToTop());
    expect(t.world.scrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
  });
});
