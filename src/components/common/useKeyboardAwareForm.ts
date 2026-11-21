import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  type LayoutChangeEvent,
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

interface ScrollTargetInput {
  /** Top and bottom of the field (margins included) in scroll-content coordinates. */
  fieldTop: number;
  fieldBottom: number;
  scrollY: number;
  viewportHeight: number;
}

/**
 * The scroll offset that brings a field fully into view, or `null` when it is
 * already visible (so there is no needless movement). Pure, for testing.
 */
export function computeScrollTarget({
  fieldTop,
  fieldBottom,
  scrollY,
  viewportHeight,
}: ScrollTargetInput): number | null {
  if (fieldTop < scrollY) {
    return Math.max(fieldTop, 0);
  }
  if (fieldBottom > scrollY + viewportHeight) {
    // A field taller than the viewport shows its top, never its bottom only.
    return Math.max(Math.min(fieldBottom - viewportHeight, fieldTop), 0);
  }
  return null;
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
 * 2. A focused field is scrolled fully into view, again when the viewport
 *    changes size (the keyboard finishing its appearance), and not at all when it
 *    is already visible.
 */
export function useKeyboardAwareForm() {
  const containerRef = useRef<HostInstance>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const focused = useRef<TextInputInstance | null>(null);
  const scrollY = useRef(0);
  const viewportHeight = useRef(0);
  const [keyboardInset, setKeyboardInset] = useState(0);

  const scrollFieldIntoView = useCallback((input: TextInputInstance | null) => {
    const content = scrollRef.current?.getInnerViewRef();
    if (!input || !content || viewportHeight.current === 0) {
      return;
    }
    input.measureLayout(content, (_x, y, _width, height) => {
      const target = computeScrollTarget({
        fieldTop: y - FIELD_MARGIN_ABOVE,
        fieldBottom: y + height + FIELD_MARGIN_BELOW,
        scrollY: scrollY.current,
        viewportHeight: viewportHeight.current,
      });
      if (target !== null) {
        scrollRef.current?.scrollTo({ y: target, animated: true });
      }
    });
  }, []);

  useEffect(() => {
    const update = (keyboard?: { screenY: number } | null) => {
      const container = containerRef.current;
      if (!keyboard || !container) {
        setKeyboardInset(0);
        return;
      }
      container.measureInWindow((_x, y, _width, height) => {
        setKeyboardInset(
          Math.max(Math.round(y + height - keyboard.screenY), 0),
        );
      });
    };
    // Android only emits the "Did" events; iOS animates with the "Will" ones.
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    update(Keyboard.metrics()); // the keyboard may already be open on mount
    const subscriptions = [
      Keyboard.addListener(showEvent, event => update(event.endCoordinates)),
      Keyboard.addListener(hideEvent, () => setKeyboardInset(0)),
    ];
    return () => subscriptions.forEach(subscription => subscription.remove());
  }, []);

  const onScrollViewLayout = useCallback(
    (event: LayoutChangeEvent) => {
      viewportHeight.current = event.nativeEvent.layout.height;
      // The viewport changed (keyboard shown or hidden): keep the field visible.
      scrollFieldIntoView(focused.current);
    },
    [scrollFieldIntoView],
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.current = event.nativeEvent.contentOffset.y;
    },
    [],
  );

  const onFieldFocus = useCallback(
    (input: TextInputInstance | null) => {
      focused.current = input;
      scrollFieldIntoView(input);
    },
    [scrollFieldIntoView],
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
