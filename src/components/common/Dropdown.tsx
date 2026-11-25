import { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  type ScrollViewInstance,
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

/** How many rows stay visible above the chosen one when the list opens. */
const ROWS_ABOVE_SELECTED = 2;
const ROW_HEIGHT_HINT = 48;

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
  const listRef = useRef<ScrollViewInstance>(null);
  const selected = options.find(option => option.value === value);
  const fullLabel = groupLabel ? `${groupLabel} – ${label}` : label;
  const shown = selected?.label ?? placeholder ?? '';

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
        <Text style={[styles.value, !selected && styles.placeholder]}>
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
            <ScrollView ref={listRef}>
              {options.map(option => {
                const isSelected = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    style={styles.item}
                    onPress={() => choose(option.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={option.label}
                    // Open the list around the chosen row, not at the top. The
                    // whole list stays scrollable.
                    onLayout={
                      isSelected
                        ? event =>
                            listRef.current?.scrollTo({
                              y: Math.max(
                                0,
                                event.nativeEvent.layout.y -
                                  ROWS_ABOVE_SELECTED * ROW_HEIGHT_HINT,
                              ),
                              animated: false,
                            })
                        : undefined
                    }
                  >
                    <Text style={styles.itemLabel}>{option.label}</Text>
                    {isSelected ? (
                      <Icon
                        name="checkmark"
                        size={20}
                        color={theme.colors.primary}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
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
    minHeight: 48,
    paddingHorizontal: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 16,
  },
  itemLabel: { flex: 1, fontSize: 16, color: theme.colors.text },
});
