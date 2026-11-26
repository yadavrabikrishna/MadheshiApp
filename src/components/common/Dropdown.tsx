import { useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme';
import { Icon } from './Icon';

export interface DropdownOption<Value extends string> {
  value: Value;
  label: string;
}

interface DropdownProps<Value extends string> {
  label: string;
  options: DropdownOption<Value>[];
  /** The chosen value, or '' when nothing is chosen yet (shows the placeholder). */
  value: Value | '';
  onChange: (value: Value) => void;
  /** Shown while no option is chosen. */
  placeholder?: string;
  /**
   * Names the group this dropdown belongs to (e.g. "Start Date") when several
   * dropdowns share one label (e.g. "Year"). Used in the spoken name and the
   * list title only.
   */
  groupLabel?: string;
  /** Tighter padding and gap, for narrow fields side by side in a row. */
  compact?: boolean;
  /** Accessible name of the dismiss area behind the list (already localized). */
  closeLabel: string;
}

/**
 * Every row has this exact height. A fixed height is what lets the list know
 * where any row is without rendering or measuring it first, so the chosen row
 * can be placed before the first frame (see `getItemLayout` below).
 */
export const ROW_HEIGHT = 48;

/** The sheet is at most 80% of the space inside the 24-unit backdrop padding. */
const SHEET_MAX_FRACTION = 0.8;
const BACKDROP_PADDING = 24;
/** Sheet vertical padding (8 + 8) and the title row (about 38). */
const SHEET_CHROME = 16 + 38;

/**
 * The row to start the list at so the chosen row lands near the middle of the
 * visible rows. Used for the first frame; `centeredOffset` then corrects it
 * from the real measured height. Pure, so it can be tested.
 */
export function initialRowIndex(
  selectedIndex: number,
  rowCount: number,
  windowHeight: number,
): number {
  if (selectedIndex < 0) {
    return 0;
  }
  const listMax =
    (windowHeight - 2 * BACKDROP_PADDING) * SHEET_MAX_FRACTION - SHEET_CHROME;
  const visibleRows = Math.max(
    1,
    Math.floor(Math.min(rowCount * ROW_HEIGHT, listMax) / ROW_HEIGHT),
  );
  const first = selectedIndex - Math.floor((visibleRows - 1) / 2);
  return Math.min(Math.max(0, first), Math.max(0, rowCount - visibleRows));
}

/** Scroll offset that centres a row in a list `viewHeight` tall (never past the ends). */
export function centeredOffset(
  selectedIndex: number,
  rowCount: number,
  viewHeight: number,
): number {
  const centred = selectedIndex * ROW_HEIGHT - (viewHeight - ROW_HEIGHT) / 2;
  return Math.min(
    Math.max(0, centred),
    Math.max(0, rowCount * ROW_HEIGHT - viewHeight),
  );
}

/**
 * A single-choice dropdown: a field showing the current choice that opens a
 * list of options. The list is a modal, so it works on every screen size and
 * does not depend on the field's position.
 */
export function Dropdown<Value extends string>({
  label,
  options,
  value,
  onChange,
  closeLabel,
  placeholder,
  groupLabel,
  compact = false,
}: DropdownProps<Value>) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [open, setOpen] = useState(false);
  const listRef = useRef<FlatList<DropdownOption<Value>>>(null);
  const { height: windowHeight } = useWindowDimensions();
  const selectedIndex = options.findIndex(option => option.value === value);
  const selected = options[selectedIndex];
  const fullLabel = groupLabel ? `${groupLabel} – ${label}` : label;
  const shown = selected?.label ?? placeholder ?? '';

  // Once the list has its real height, centre the chosen row exactly. This
  // corrects the first-frame estimate and does not depend on when rows lay out.
  const centreSelected = (event: LayoutChangeEvent) => {
    if (selectedIndex < 0) {
      return;
    }
    listRef.current?.scrollToOffset({
      offset: centeredOffset(
        selectedIndex,
        options.length,
        event.nativeEvent.layout.height,
      ),
      animated: false,
    });
  };

  const choose = (next: Value) => {
    setOpen(false);
    if (next !== value) {
      onChange(next);
    }
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={[styles.button, compact && styles.buttonCompact]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${fullLabel}: ${shown}`}
        accessibilityState={{ expanded: open }}
      >
        <Text
          style={[styles.value, !selected && styles.placeholder]}
          // An empty field's hint stays on one line, shrinking slightly if the
          // field is narrow (several fields side by side).
          {...(selected
            ? {}
            : {
                numberOfLines: 1,
                adjustsFontSizeToFit: true,
                minimumFontScale: 0.75,
              })}
        >
          {shown}
        </Text>
        <Icon
          name="chevron-down"
          size={compact ? 18 : 20}
          color={theme.colors.textSecondary}
        />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.backdrop}>
          <Pressable
            style={styles.dismiss}
            onPress={() => setOpen(false)}
            accessibilityLabel={closeLabel}
          />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle} accessibilityRole="header">
              {fullLabel}
            </Text>
            <FlatList
              ref={listRef}
              data={options}
              keyExtractor={option => option.value}
              getItemLayout={(_, index) => ({
                length: ROW_HEIGHT,
                offset: ROW_HEIGHT * index,
                index,
              })}
              // Start already at the chosen row (first frame), so there is no
              // visible jump from the top. Without a choice: the top, as before.
              initialScrollIndex={initialRowIndex(
                selectedIndex,
                options.length,
                windowHeight,
              )}
              // Render every row: the lists are short (at most ~200 rows) and
              // this keeps every option reachable by accessibility tools.
              initialNumToRender={options.length}
              onLayout={centreSelected}
              testID="dropdown-list"
              renderItem={({ item: option }) => {
                const isSelected = option.value === value;
                return (
                  <Pressable
                    style={styles.item}
                    onPress={() => choose(option.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={option.label}
                  >
                    <Text style={styles.itemLabel} numberOfLines={2}>
                      {option.label}
                    </Text>
                    {isSelected ? (
                      <Icon
                        name="checkmark"
                        size={20}
                        color={theme.colors.primary}
                      />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  field: { gap: 6 },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  button: {
    minHeight: 48,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  buttonCompact: { paddingHorizontal: 8, gap: 4 },
  value: { flex: 1, fontSize: 16, color: theme.colors.text },
  placeholder: { color: theme.colors.textSecondary },
  backdrop: {
    flex: 1,
    justifyContent: 'center' as const,
    padding: 24,
    backgroundColor: theme.colors.overlay,
  },
  dismiss: {
    position: 'absolute' as const,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  sheet: {
    maxHeight: '80%' as const,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 8,
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: theme.colors.textSecondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  item: {
    height: ROW_HEIGHT,
    paddingHorizontal: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 16,
  },
  itemLabel: { flex: 1, fontSize: 16, color: theme.colors.text },
});
