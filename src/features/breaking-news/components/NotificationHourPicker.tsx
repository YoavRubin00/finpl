import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Bell } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { STITCH } from '../../../constants/theme';
import { tapHaptic } from '../../../utils/haptics';

interface NotificationHourPickerProps {
  visible: boolean;
  currentHour: number;
  onClose: () => void;
  onPick: (hour: number) => void;
}

/**
 * Hour-of-day picker for the Breaking News daily push.
 *
 * Uses the same conditionally-mounted absolute overlay pattern as
 * TickerPickerSheet (React Native's `<Modal>` breaks tap handling on
 * web — see that file's comment for the gory detail).
 *
 * We expose hours 6-22 — anything earlier than 06:00 is rude, anything
 * after 22:00 misses the moment. Server cron generates summaries at
 * 06:00 UTC (≈09:00 IST) so any hour the user picks will already have
 * a fresh summary waiting in Neon by the time the local notification
 * fires.
 */
const PICKABLE_HOURS: readonly number[] = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

export function NotificationHourPicker({
  visible,
  currentHour,
  onClose,
  onPick,
}: NotificationHourPickerProps): React.ReactElement | null {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  const handlePick = (hour: number) => {
    tapHaptic();
    onPick(hour);
  };

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="סגור" />

      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Bell size={18} color={STITCH.primary} strokeWidth={2.4} />
          <Text style={styles.title} allowFontScaling={false}>שעת ההתראה היומית</Text>
        </View>

        <Text style={styles.subtitle} allowFontScaling={false}>
          באיזו שעה תרצה לקבל את הסיכום היומי?
        </Text>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >
          {PICKABLE_HOURS.map((hour) => {
            const selected = hour === currentHour;
            return (
              <Pressable
                key={hour}
                onPress={() => handlePick(hour)}
                style={({ pressed }) => [
                  styles.pill,
                  selected && styles.pillSelected,
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`שעה ${hour}:00`}
              >
                <Text
                  style={[styles.pillText, selected && styles.pillTextSelected]}
                  allowFontScaling={false}
                >
                  {String(hour).padStart(2, '0')}:00
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Same overlay pattern as TickerPickerSheet — avoids RN <Modal> on web.
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 1001,
    ...(Platform.OS === 'web' ? { position: 'fixed' as 'absolute' } : {}),
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.55)',
    zIndex: 0,
  },
  sheet: {
    position: 'relative',
    zIndex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: STITCH.onSurfaceVariant,
    textAlign: 'right',
    writingDirection: 'rtl',
    paddingBottom: 10,
  },
  list: {
    flexGrow: 0,
  },
  // Wrapped grid of hour pills (4 per row) — far faster to scan than a
  // 17-row vertical list, and fits without the bottom rows getting clipped
  // by the system nav bar (user report 2026-06-06: "חריגה מהמסך").
  grid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 4,
    paddingBottom: 4,
  },
  pill: {
    width: '22%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  pillSelected: {
    backgroundColor: STITCH.primary,
    borderColor: STITCH.primary,
  },
  pillText: {
    fontSize: 15,
    fontWeight: '800',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
  },
  pillTextSelected: {
    color: '#ffffff',
  },
});
