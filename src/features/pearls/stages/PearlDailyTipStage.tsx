import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { loadBarTips, pickBarTip, hasBarTipsLoaded } from '../daily-tips/dailyTipsApi';
import { tapHaptic } from '../../../utils/haptics';
import { useSoundEffect } from '../../../hooks/useSoundEffect';
import { PEARL_STAGE_COLORS, pearlStageStyles } from './sharedStageStyles';

interface PearlDailyTipStageProps {
  isActive: boolean;
  onContinue: () => void;
}

/**
 * "הטיפ של היום" — a knowledge card in the same actionable, community voice
 * בר prepares for the FinPlay WhatsApp community each morning. Tips load from
 * the cloud (bar_content) so בר can refresh them live; a fresh random tip on
 * every pearl open (Yoav: "כל פעם יתחלף"). Falls back to the bundled set when
 * the cloud is empty/unreachable. Mirrors the daily-concept stage shape.
 */
export function PearlDailyTipStage({ isActive, onContinue }: PearlDailyTipStageProps): React.ReactElement {
  const { playSound } = useSoundEffect();
  // Pick immediately (cloud set if already warm, else local). If the cache is
  // still cold, warm it and re-pick once — a one-time swap to a cloud tip.
  const [tip, setTip] = useState(() => pickBarTip());
  useEffect(() => {
    if (hasBarTipsLoaded()) return;
    let alive = true;
    loadBarTips().then(() => {
      if (alive && hasBarTipsLoaded()) setTip(pickBarTip());
    });
    return () => { alive = false; };
  }, []);

  return (
    <View style={pearlStageStyles.root}>
      <Animated.View entering={FadeIn.duration(220)} style={pearlStageStyles.card}>
        <View style={pearlStageStyles.labelRow}>
          <View style={localStyles.bulb} accessible={false}>
            <Text style={localStyles.bulbEmoji} allowFontScaling={false}>💡</Text>
          </View>
          <Text style={pearlStageStyles.label} allowFontScaling={false}>הטיפ של היום</Text>
        </View>

        <View style={localStyles.tagPill}>
          <Text style={localStyles.tagText} allowFontScaling={false}>{tip.tagHe}</Text>
        </View>

        <Text style={localStyles.title} allowFontScaling={false}>{tip.titleHe}</Text>
        <Text style={localStyles.body} allowFontScaling={false}>{tip.bodyHe}</Text>

        <Text style={localStyles.community} allowFontScaling={false}>טיפ יומי מהקהילה של FinPlay</Text>
      </Animated.View>

      <View style={pearlStageStyles.ctaWrap}>
        <Pressable
          onPress={() => { tapHaptic(); playSound('btn_click_soft_2'); onContinue(); }}
          style={pearlStageStyles.cta}
          accessibilityRole="button"
          accessibilityLabel="הבנתי, המשך לשלב הבא"
          disabled={!isActive}
        >
          <Text style={pearlStageStyles.ctaText} allowFontScaling={false}>הבנתי ←</Text>
        </Pressable>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  bulb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(14,165,233,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulbEmoji: {
    fontSize: 20,
  },
  tagPill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(14,165,233,0.12)',
    borderColor: 'rgba(14,165,233,0.35)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0369a1',
    writingDirection: 'rtl',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: PEARL_STAGE_COLORS.titleColor,
    writingDirection: 'rtl',
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    fontWeight: '600',
    color: PEARL_STAGE_COLORS.bodyColor,
    writingDirection: 'rtl',
    textAlign: 'center',
    lineHeight: 25,
  },
  community: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    writingDirection: 'rtl',
    textAlign: 'center',
    marginTop: 16,
  },
});