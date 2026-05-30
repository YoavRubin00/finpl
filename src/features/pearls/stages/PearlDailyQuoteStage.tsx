import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';

import { wisdomQuotes } from '../../wisdom-flashes/wisdomData';
import { tapHaptic } from '../../../utils/haptics';

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
  const quote = useMemo(() => getDailyQuote(), []);

  return (
    <View style={styles.root}>
      <Animated.View entering={FadeIn.duration(220)} style={styles.card}>
        <View style={styles.labelRow}>
          <View accessible={false}>
            <LottieView
              source={require('../../../../assets/lottie/wired-flat-3140-book-open-hover-pinch.json')}
              style={{ width: 30, height: 30 }}
              autoPlay
              loop
            />
          </View>
          <Text style={styles.label} allowFontScaling={false}>המשפט היומי</Text>
        </View>

        <Text style={styles.quoteText} allowFontScaling={false}>״{quote.text}״</Text>
        <Text style={styles.author} allowFontScaling={false}>{quote.icon}  {quote.author}</Text>
        {quote.role ? (
          <Text style={styles.role} allowFontScaling={false}>{quote.role}</Text>
        ) : null}
      </Animated.View>

      <View style={styles.ctaWrap}>
        <Pressable
          onPress={() => { tapHaptic(); onContinue(); }}
          style={styles.cta}
          accessibilityRole="button"
          accessibilityLabel="המשך"
          disabled={!isActive}
        >
          <Text style={styles.ctaText} allowFontScaling={false}>המשך ←</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
  },
  card: {
    borderRadius: 22,
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 22,
    paddingVertical: 26,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e0f2fe',
    borderBottomWidth: 4,
    borderBottomColor: '#bae6fd',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
    marginTop: 36,
  },
  labelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0369a1',
    letterSpacing: 1,
    writingDirection: 'rtl',
  },
  quoteText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    writingDirection: 'rtl',
    textAlign: 'center',
    lineHeight: 27,
    marginBottom: 14,
  },
  author: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0369a1',
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
  ctaWrap: {
    paddingHorizontal: 4,
  },
  cta: {
    backgroundColor: '#0891b2',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderBottomWidth: 4,
    borderBottomColor: '#0e7490',
  },
  ctaText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
    writingDirection: 'rtl',
  },
});
