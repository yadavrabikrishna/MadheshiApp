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
  computeScrollTarget,
  useKeyboardAwareForm,
} from '../useKeyboardAwareForm';

describe('computeScrollTarget', () => {
  const base = { scrollY: 100, viewportHeight: 400 };

  it('does nothing when the field is already fully visible', () => {
    expect(
      computeScrollTarget({ ...base, fieldTop: 150, fieldBottom: 250 }),
    ).toBeNull();
    // exactly touching both edges still counts as visible
    expect(
      computeScrollTarget({ ...base, fieldTop: 100, fieldBottom: 500 }),
    ).toBeNull();
  });

  it('scrolls down just enough to show a field hidden below the viewport', () => {
    expect(
      computeScrollTarget({ ...base, fieldTop: 450, fieldBottom: 560 }),
    ).toBe(160); // 560 - 400
  });

  it('scrolls up to show a field hidden above the viewport', () => {
    expect(
      computeScrollTarget({ ...base, fieldTop: 40, fieldBottom: 150 }),
    ).toBe(40);
  });

  it('never scrolls to a negative offset', () => {
    expect(
      computeScrollTarget({
        scrollY: 30,
        viewportHeight: 400,
        fieldTop: -10,
        fieldBottom: 80,
      }),
    ).toBe(0);
  });

  it('shows the top of a field taller than the viewport', () => {
    expect(
      computeScrollTarget({
        scrollY: 0,
        viewportHeight: 100,
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

describe('useKeyboardAwareForm: scrolling a focused field into view', () => {
  /** An input whose position in the scroll content is `top`..`top + height`. */
  const input = (top: number, height = 48) =>
    ({
      measureLayout: jest.fn((_content, onSuccess) =>
        onSuccess(0, top, 300, height),
      ),
    } as unknown as TextInputInstance);

  async function mountWithScroll(viewportHeight: number, scrollY = 0) {
    const screen = await mount();
    const scrollTo = jest.fn();
    const scroll = api.scrollRef.current as unknown as {
      scrollTo: jest.Mock;
      getInnerViewRef: jest.Mock;
    };
    scroll.scrollTo = scrollTo;
    scroll.getInnerViewRef = jest.fn(() => ({}));
    await act(async () => {
      api.scrollProps.onLayout({
        nativeEvent: {
          layout: { x: 0, y: 0, width: 360, height: viewportHeight },
        },
      } as never);
      api.scrollProps.onScroll({
        nativeEvent: { contentOffset: { x: 0, y: scrollY } },
      } as never);
    });
    return { screen, scrollTo };
  }

  it('scrolls a field hidden below the visible area, including its label and hint', async () => {
    const { scrollTo } = await mountWithScroll(300);

    await act(async () => api.onFieldFocus(input(400)));

    // bottom = 400 + 48 + FIELD_MARGIN_BELOW; the viewport is 300 high
    expect(scrollTo).toHaveBeenCalledWith({
      y: 400 + 48 + FIELD_MARGIN_BELOW - 300,
      animated: true,
    });
  });

  it('does not move when the focused field is already visible', async () => {
    const { scrollTo } = await mountWithScroll(600);

    await act(async () => api.onFieldFocus(input(100)));

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('scrolls up so a field above the viewport shows its label', async () => {
    const { scrollTo } = await mountWithScroll(300, 500);

    await act(async () => api.onFieldFocus(input(200)));

    expect(scrollTo).toHaveBeenCalledWith({
      y: 200 - FIELD_MARGIN_ABOVE,
      animated: true,
    });
  });

  it('re-checks the focused field when the viewport shrinks for the keyboard', async () => {
    const { scrollTo } = await mountWithScroll(600);
    const field = input(400);
    await act(async () => api.onFieldFocus(field));
    expect(scrollTo).not.toHaveBeenCalled(); // visible before the keyboard

    // The keyboard appears; the ScrollView's viewport becomes 300 high.
    await act(async () =>
      api.scrollProps.onLayout({
        nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 300 } },
      } as never),
    );

    expect(scrollTo).toHaveBeenCalledWith({
      y: 400 + 48 + FIELD_MARGIN_BELOW - 300,
      animated: true,
    });
  });

  it('does not re-scroll for a field that has been blurred', async () => {
    const { scrollTo } = await mountWithScroll(600);
    const field = input(400);
    await act(async () => api.onFieldFocus(field));
    await act(async () => api.onFieldBlur(field));

    await act(async () =>
      api.scrollProps.onLayout({
        nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 300 } },
      } as never),
    );

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('scrollToTop scrolls to offset 0', async () => {
    const { scrollTo } = await mountWithScroll(600, 200);
    await act(async () => api.scrollToTop());
    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
  });
});
