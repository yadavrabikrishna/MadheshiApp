import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
  type TextInputInstance,
  type HostInstance,
} from 'react-native';

/** Space kept visible above a focused input: its label and a small gap. */
export const FIELD_MARGIN_ABOVE = 28;
/** Space kept visible below it: room for a hint or an error line. */
export const FIELD_MARGIN_BELOW = 24;

interface ScrollDeltaInput {
  /** Top and bottom of the field (margins included) in WINDOW coordinates. */
  fieldTop: number;
  fieldBottom: number;
  /** The part of the window the user can actually see the form in. */
  visibleTop: number;
  visibleBottom: number;
}

/**
 * How far the content must move (positive = scroll down) to bring a field fully
 * into the visible area; 0 when it is already visible, so there is no needless
 * movement. Pure, for testing.
 */
export function computeScrollDelta({
  fieldTop,
  fieldBottom,
  visibleTop,
  visibleBottom,
}: ScrollDeltaInput): number {
  if (fieldTop < visibleTop) {
    return fieldTop - visibleTop;
  }
  if (fieldBottom > visibleBottom) {
    // A field taller than the visible area shows its top, never only its bottom.
    return Math.min(fieldBottom - visibleBottom, fieldTop - visibleTop);
  }
  return 0;
}

/**
 * Keyboard handling for a scrollable form, using only built-in React Native
 * APIs.
 *
 * Why this exists: the app is edge-to-edge (targetSdk 36 + edgeToEdgeEnabled),
 * so Android no longer resizes the window for the keyboard
 * (`windowSoftInputMode="adjustResize"` has no effect) and a plain ScrollView
 * leaves focused inputs behind the keyboard. `KeyboardAvoidingView` is not
 * enough either: it measures its frame relative to its parent, not the screen.
 *
 * How it works:
 * 1. The container is measured in WINDOW coordinates when the keyboard
 *    appears; the part of it under the keyboard becomes `keyboardInset`, applied
 *    as bottom padding so the ScrollView's viewport is exactly the visible area.
 *    When the keyboard closes the inset returns to 0 (no leftover blank space).
 * 2. The focused field is measured in the same WINDOW coordinates as the
 *    keyboard's top edge and the ScrollView's own frame, and scrolled just far
 *    enough to be fully visible (label above, hint/error below). Nothing is
 *    assumed about the order of events: it is re-checked when a field gets focus,
 *    when the keyboard appears, and when the ScrollView is resized by the
 *    padding. Each check measures fresh and does nothing when the field is
 *    already visible, so repeated triggers cannot cause repeated scrolling.
 */
export function useKeyboardAwareForm() {
  const containerRef = useRef<HostInstance>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const focused = useRef<TextInputInstance | null>(null);
  const scrollY = useRef(0);
  // Top edge of the keyboard in window coordinates; null while it is hidden.
  const keyboardTop = useRef<number | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);

  const scrollFocusedFieldIntoView = useCallback(() => {
    const input = focused.current;
    const scroll = scrollRef.current;
    if (!input || !scroll) {
      return;
    }
    scroll.measureInWindow((_sx, scrollTop, _sw, scrollHeight) => {
      input.measureInWindow((_x, fieldY, _w, fieldHeight) => {
        if (focused.current !== input) {
          return; // focus moved on while measuring
        }
        const delta = computeScrollDelta({
          fieldTop: fieldY - FIELD_MARGIN_ABOVE,
          fieldBottom: fieldY + fieldHeight + FIELD_MARGIN_BELOW,
          visibleTop: scrollTop,
          // The keyboard may cover the ScrollView before the padding has been
          // laid out, so its top edge limits the visible area directly.
          visibleBottom: Math.min(
            scrollTop + scrollHeight,
            keyboardTop.current ?? Infinity,
          ),
        });
        if (Math.abs(delta) >= 1) {
          scroll.scrollTo({
            y: Math.max(scrollY.current + delta, 0),
            animated: true,
          });
        }
      });
    });
  }, []);

  useEffect(() => {
    const update = (keyboard?: { screenY: number } | null) => {
      const container = containerRef.current;
      keyboardTop.current = keyboard ? keyboard.screenY : null;
      if (!keyboard || !container) {
        setKeyboardInset(0);
        return;
      }
      container.measureInWindow((_x, y, _width, height) => {
        setKeyboardInset(
          Math.max(Math.round(y + height - keyboard.screenY), 0),
        );
      });
      // Do not wait for the padding to be laid out: the keyboard top is known.
      scrollFocusedFieldIntoView();
    };
    // Android only emits the "Did" events; iOS animates with the "Will" ones.
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    update(Keyboard.metrics()); // the keyboard may already be open on mount
    const subscriptions = [
      Keyboard.addListener(showEvent, event => update(event.endCoordinates)),
      Keyboard.addListener(hideEvent, () => update(null)),
    ];
    return () => subscriptions.forEach(subscription => subscription.remove());
  }, [scrollFocusedFieldIntoView]);

  // The ScrollView was resized (by the keyboard padding): re-check the field.
  const onScrollViewLayout = useCallback(() => {
    scrollFocusedFieldIntoView();
  }, [scrollFocusedFieldIntoView]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.current = event.nativeEvent.contentOffset.y;
    },
    [],
  );

  const onFieldFocus = useCallback(
    (input: TextInputInstance | null) => {
      focused.current = input;
      scrollFocusedFieldIntoView();
    },
    [scrollFocusedFieldIntoView],
  );

  const onFieldBlur = useCallback((input: TextInputInstance | null) => {
    if (focused.current === input) {
      focused.current = null;
    }
  }, []);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  return {
    containerRef,
    scrollRef,
    keyboardInset,
    scrollProps: {
      onLayout: onScrollViewLayout,
      onScroll,
      scrollEventThrottle: 16,
    },
    onFieldFocus,
    onFieldBlur,
    scrollToTop,
  };
}
