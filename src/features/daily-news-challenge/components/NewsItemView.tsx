import React from 'react';
import { View, Text, StyleSheet, Image, Linking, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Newspaper, ExternalLink } from 'lucide-react-native';

import { STITCH } from '../../../constants/theme';
import { tapHaptic } from '../../../utils/haptics';
import type { ChallengeItem } from '../types';

interface NewsItemViewProps {
  item: ChallengeItem;
  index: 0 | 1;
}

/**
 * Single news item card — image + paraphrased headline + summary + source.
 * Image falls back to a brand gradient if Higgsfield URL is missing.
 */
export function NewsItemView({ item, index }: NewsItemViewProps): React.ReactElement {
  const handleSourcePress = () => {
    if (!item.sourceUrl) return;
    tapHaptic();
    Linking.openURL(item.sourceUrl).catch(() => { /* deep-link may fail on web; non-fatal */ });
  };

  return (
    <View style={styles.wrap}>
      {/* Hero image */}
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.image} accessible={false} />
      ) : (
        <LinearGradient
          colors={['#1e3a8a', '#0c4a6e', '#0e7490']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.imagePlaceholder}
        >
          <Newspaper size={28} color="rgba(255,255,255,0.7)" strokeWidth={2} />
        </LinearGradient>
      )}

      {/* Eyebrow: item number + source attribution */}
      <View style={styles.eyebrowRow}>
        <Text style={styles.itemNumber} allowFontScaling={false}>
          {index === 0 ? '01' : '02'}
        </Text>
        <Pressable
          onPress={handleSourcePress}
          accessibilityRole="link"
          accessibilityLabel={`מקור: ${item.source}`}
          style={styles.sourceLink}
          hitSlop={8}
        >
          <Text style={styles.sourceText} allowFontScaling={false}>
            לפי {item.source}
          </Text>
          <ExternalLink size={11} color={STITCH.onSurfaceVariant} strokeWidth={2.2} />
        </Pressable>
      </View>

      {/* Paraphrased headline (NEVER the original — copyright safe) */}
      <Text style={styles.headline} allowFontScaling={false}>
        {item.headlineHe}
      </Text>

      {/* 2-sentence summary */}
      <Text style={styles.summary} allowFontScaling={false}>
        {item.summaryHe}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
  },
  imagePlaceholder: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrowRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  itemNumber: {
    fontSize: 12,
    fontWeight: '900',
    color: STITCH.tertiaryGoldBright,
    letterSpacing: 0.8,
  },
  sourceLink: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '700',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
  },
  headline: {
    fontSize: 19,
    fontWeight: '900',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  summary: {
    fontSize: 14,
    fontWeight: '500',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 22,
  },
});
