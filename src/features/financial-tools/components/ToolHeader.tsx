import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';

import { STITCH } from '../../../constants/theme';
import { tapHaptic } from '../../../utils/haptics';

interface ToolHeaderProps {
  title: string;
  subtitle?: string;
  /** Accent color used for the back-button pill and icon tint. Defaults to STITCH primary blue. */
  accentColor?: string;
  /** Optional Lucide icon shown in a colored circle next to the title (Duo-style). */
  Icon?: LucideIcon;
}

/**
 * Shared RTL header for every Financial Tool screen. Back button always returns
 * the user to the Tools hub (/(tabs)/tools) — never relies on history, so deep
 * links and back-on-first-screen both land on the hub instead of bailing out.
 */
export function ToolHeader({ title, subtitle, accentColor = STITCH.primary, Icon }: ToolHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    tapHaptic();
    router.replace('/(tabs)/tools' as never);
  };

  return (
    <View style={styles.bar}>
      {/* Back button — anchored on the right edge in RTL */}
      <Pressable
        onPress={handleBack}
        style={({ pressed }) => [
          styles.backBtn,
          { borderColor: accentColor + '33', backgroundColor: accentColor + '14' },
          pressed && styles.backBtnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="חזרה לכלים"
        hitSlop={8}
      >
        <ChevronRight size={22} color={accentColor} strokeWidth={2.6} />
      </Pressable>

      {Icon ? (
        <View style={[styles.iconWrap, { backgroundColor: accentColor + '1f' }]}>
          <Icon size={22} color={accentColor} strokeWidth={2.4} />
        </View>
      ) : null}

      <View style={styles.titleWrap}>
        <Text style={styles.title} numberOfLines={1} allowFontScaling={false}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1} allowFontScaling={false}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: STITCH.surfaceHighest,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: STITCH.onSurface,
    textAlign: 'right',
    writingDirection: 'rtl',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: STITCH.onSurfaceVariant,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 2,
  },
});
