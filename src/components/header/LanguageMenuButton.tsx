import { useRef, useState } from 'react';
import { Modal, Pressable, Text, View, type HostInstance } from 'react-native';

import { selectLanguage, setLanguage } from '../../features/preferences';
import { useTranslation } from '../../i18n';
import { useAppDispatch, useAppSelector } from '../../store';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme';
import {
  LANGUAGES,
  LANGUAGE_LABELS,
  type Language,
} from '../../types/preferences';
import { Icon } from '../common/Icon';

const SHORT_CODE: Record<Language, string> = { en: 'EN', np: 'ने' };

interface MenuAnchor {
  top: number;
  right: number;
}

// Used until (or if) the button position can be measured.
const DEFAULT_ANCHOR: MenuAnchor = { top: 56, right: 8 };

/** Header button that opens a small menu with the language choices. */
export function LanguageMenuButton() {
  const dispatch = useAppDispatch();
  const language = useAppSelector(selectLanguage);
  const theme = useAppTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  const buttonRef = useRef<HostInstance>(null);
  const [visible, setVisible] = useState(false);
  const [anchor, setAnchor] = useState<MenuAnchor>(DEFAULT_ANCHOR);

  // Open at once, then move the menu just under the button, right-aligned.
  const open = () => {
    setVisible(true);
    buttonRef.current?.measureInWindow((_x, y, _width, height) => {
      setAnchor({ top: y + height, right: 8 });
    });
  };
  const close = () => setVisible(false);

  const choose = (next: Language) => {
    dispatch(setLanguage(next));
    close();
  };

  return (
    <>
      <Pressable
        ref={buttonRef}
        style={styles.button}
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={t('header.changeLanguage')}
        hitSlop={4}
      >
        <Icon name="language-outline" size={22} color={theme.colors.text} />
        <Text style={styles.code}>{SHORT_CODE[language]}</Text>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <Pressable
          style={styles.backdrop}
          onPress={close}
          accessibilityLabel={t('header.changeLanguage')}
        >
          <View style={[styles.menu, anchor]}>
            {LANGUAGES.map(option => {
              const selected = option === language;
              return (
                <Pressable
                  key={option}
                  style={styles.item}
                  onPress={() => choose(option)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={LANGUAGE_LABELS[option]}
                >
                  <Text style={styles.itemLabel}>
                    {LANGUAGE_LABELS[option]}
                  </Text>
                  {selected ? (
                    <Icon
                      name="checkmark"
                      size={20}
                      color={theme.colors.primary}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const createStyles = (theme: AppTheme) => ({
  button: {
    minHeight: 44,
    minWidth: 44,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 2,
  },
  code: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  backdrop: { flex: 1, backgroundColor: theme.colors.overlay },
  menu: {
    position: 'absolute' as const,
    minWidth: 170,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 4,
    elevation: 8,
  },
  item: {
    minHeight: 48,
    paddingHorizontal: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 16,
  },
  itemLabel: { fontSize: 16, color: theme.colors.text },
});
