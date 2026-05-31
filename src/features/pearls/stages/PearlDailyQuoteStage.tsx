import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';

import { wisdomQuotes } from '../../wisdom-flashes/wisdomData';
import { tapHaptic } from '../../../utils/haptics';
import { useSoundEffect } from '../../../hooks/useSoundEffect';
import { PEARL_STAGE_COLORS, pearlStageStyles } from './sharedStageStyles';

interface PearlDailyQuoteStageProps {
  isActive: boolean;
  onContinue: () => void;
}

/** Deterministic per-day pick — mirrors the legacy FinFeedScreen
 *  `getDailyQuote`. Keeps the rotation in sync with the concept stage so
 *  the user sees a stable pairing each day. */
function getDailyQuote() {
  const dayIndex = Math.floor(Date.now() / 86400000);
  const q = wisdomQuotes[dayIndex % wisdomQuotes.length];
  return { text: q.text, author: q.author, role: q.authorRole, icon: q.icon };
}

export function PearlDailyQuoteStage({ isActive, onContinue }: PearlDailyQuoteStageProps): React.ReactElement {
  const { playSound } = useSoundEffect();
  const quote = useMemo(() => getDailyQuote(), []);

  return (
    <View style={pearlStageStyles.root}>
      <Animated.View entering={FadeIn.duration(220)} style={[pearlStageStyles.card, localStyles.cardOverride]}>
        <View style={[pearlStageStyles.labelRow, { marginBottom: 12 }]}>
          <View accessible={false}>
            <LottieView
              source={require('../../../../assets/lottie/wired-flat-3140-book-open-hover-pinch.json')}
              style={{ width: 30, height: 30 }}
              autoPlay
              loop
            />
          </View>
          <Text style={pearlStageStyles.label} allowFontScaling={false}>המשפט היומי</Text>
        </View>

        <Text style={localStyles.quoteText} allowFontScaling={false}>״{quote.text}״</Text>
        <Text style={localStyles.author} allowFontScaling={false}>{quote.icon}  {quote.author}</Text>
        {quote.role ? (
          <Text style={localStyles.role} allowFontScaling={false}>{quote.role}</Text>
        ) : null}
      </Animated.View>

      <View style={pearlStageStyles.ctaWrap}>
        <Pressable
          onPress={() => { tapHaptic(); playSound('btn_click_soft_2'); onContinue(); }}
          style={pearlStageStyles.cta}
          accessibilityRole="button"
          accessibilityLabel="תודה, המשך לשלב הבא"
          disabled={!isActive}
        >
          <Text style={pearlStageStyles.ctaText} allowFontScaling={false}>תודה ←</Text>
        </Pressable>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  cardOverride: { paddingVertical: 26 },
  quoteText: {
    fontSize: 17,
    fontWeight: '700',
    color: PEARL_STAGE_COLORS.titleColor,
    writingDirection: 'rtl',
    textAlign: 'center',
    lineHeight: 27,
    marginBottom: 14,
  },
  author: {
    fontSize: 14,
    fontWeight: '800',
    color: PEARL_STAGE_COLORS.labelColor,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  role: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    writingDirection: 'rtl',
    textAlign: 'center',
    marginTop: 4,
  },
});
