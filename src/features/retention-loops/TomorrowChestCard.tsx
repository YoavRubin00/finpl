import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, AppState } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Lock, Gift } from 'lucide-react-native';
import { useTomorrowChestStore, tomorrowChestStatus } from './useTomorrowChestStore';
import { getNextLessonTarget } from './nextLessonTarget';
import { getIsraelDateISO } from '../../utils/israelTime';
import { tapHaptic, successHaptic } from '../../utils/haptics';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

/**
 * The visible tomorrow-chest artifact on the learn map (RETENTION-SPRINT
 * 2026-07-06). This card IS the "sealing" — Yoav removed an in-chest-modal
 * tomorrow-teaser on 2026-06-11 ("cluttering the reward moment"), so the
 * appointment lives here on the map instead: sealed = lock + tomorrow's
 * content cliffhanger (the next module's own videoHook — Zeigarnik line);
 * ready = gold glow + tap → the TomorrowChestReadyHost ceremony.
 *
 * Renders nothing when no chest is armed, so day-0-pre-chest users see a
 * clean map. Entrance animation = the "seal" moment when the user lands
 * back on the map after the chest that armed it.
 */
export function TomorrowChestCard(): React.ReactElement | null {
  const opensOnDate = useTomorrowChestStore((s) => s.opensOnDate);
  const requestOpen = useTomorrowChestStore((s) => s.requestOpen);

  // Re-derive status when the app foregrounds (sealed→ready at IL midnight).
  const [ilToday, setIlToday] = useState<string>(() => getIsraelDateISO());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setIlToday(getIsraelDateISO());
    });
    return () => sub.remove();
  }, []);

  const status = tomorrowChestStatus(opensOnDate, ilToday);
  if (status === 'none') return null;

  if (status === 'ready') {
    return (
      <Animated.View entering={FadeInDown.duration(400)}>
        <Pressable
          onPress={() => { successHaptic(); requestOpen(); }}
          accessibilityRole="button"
          accessibilityLabel="התיבה של היום מוכנה — פתחו אותה"
          style={[styles.card, styles.cardReady]}
        >
          <View style={styles.iconWrapReady}>
            <Gift size={26} color="#92400e" strokeWidth={2.4} />
          </View>
          <View style={styles.textCol}>
            <Text style={[styles.titleReady, RTL]} allowFontScaling={false}>
              התיבה של היום מוכנה
            </Text>
            <Text style={[styles.subReady, RTL]} allowFontScaling={false}>
              חזרתם — כמו שקבענו. הקישו לפתיחה.
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  // Sealed — tomorrow's promise, with the next lesson's own hook as the
  // curiosity gap ("what's in it for me tomorrow").
  const nextTarget = getNextLessonTarget();
  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      <View
        accessible
        accessibilityLabel="תיבה חתומה — נפתחת מחר"
        style={[styles.card, styles.cardSealed]}
      >
        <View style={styles.iconWrapSealed}>
          <Lock size={22} color="#e0f2fe" strokeWidth={2.4} />
        </View>
        <View style={styles.textCol}>
          <Text style={[styles.titleSealed, RTL]} allowFontScaling={false}>
            נצרבה תיבה — נפתחת מחר
          </Text>
          {nextTarget && (
            <Text style={[styles.subSealed, RTL]} allowFontScaling={false} numberOfLines={2}>
              {`ומחר בשיעור: ${nextTarget.hook}`}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  cardSealed: {
    backgroundColor: '#0c4a6e',
    borderWidth: 2,
    borderColor: '#075985',
  },
  cardReady: {
    backgroundColor: '#fef3c7',
    borderWidth: 2,
    borderColor: '#f59e0b',
    shadowColor: '#f59e0b',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  iconWrapSealed: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: 'rgba(224, 242, 254, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapReady: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#fde68a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  titleSealed: {
    fontSize: 15,
    fontWeight: '900',
    color: '#e0f2fe',
  },
  subSealed: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7dd3fc',
    lineHeight: 18,
  },
  titleReady: {
    fontSize: 15,
    fontWeight: '900',
    color: '#92400e',
  },
  subReady: {
    fontSize: 13,
    fontWeight: '700',
    color: '#b45309',
  },
});
