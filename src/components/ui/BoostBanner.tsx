/**
 * BoostBanner — small pill that shows the highest-priority active booster
 * with a live countdown. Hidden when no boost is active.
 *
 * Uses existing components only: LottieIcon (rocket), GoldCoinIcon (coins×2),
 * theme tokens. No new visual assets.
 */
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LottieIcon } from './LottieIcon';
import { useEconomyStore } from '../../features/economy/useEconomyStore';

const ROCKET_LOTTIE = require('../../../assets/lottie/wired-flat-489-rocket-space-hover-flying.json');

function formatRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Pretty label for a booster id — short, fits in the pill. */
function boostLabel(id: string): string {
  switch (id) {
    case 'boost-xp-2x-1h': return 'XP ×2';
    case 'boost-coins-2x-1h': return 'מטבעות ×2';
    case 'boost-mega-1h': return 'Mega Boost';
    case 'boost-weekend': return 'Weekend ×1.5';
    default: return 'Boost פעיל';
  }
}

interface Props {
  /** Optional press handler — opens an info modal or shop. */
  onPress?: () => void;
}

export function BoostBanner({ onPress }: Props) {
  const activeBoosts = useEconomyStore((s) => s.activeBoosts);
  const [tick, setTick] = useState(0);

  // Re-render every 15 seconds to update the countdown. 15 sec is fast enough
  // for the user to feel time passing without burning battery on a 1-sec timer.
  useEffect(() => {
    if (activeBoosts.length === 0) return;
    const t = setInterval(() => setTick((n) => n + 1), 15_000);
    return () => clearInterval(t);
  }, [activeBoosts.length]);

  // Pick the most-recently-activated booster (highest expiresAt — usually the
  // newest purchase). If multiple stack, this is the "headline" one shown in
  // the pill; multipliers all stack regardless.
  const now = Date.now();
  const live = activeBoosts.filter((b) => b.expiresAt > now);
  if (live.length === 0) {
    void tick; // satisfy eslint, tick re-renders the parent on its own
    return null;
  }
  const headline = live.reduce((a, b) => (a.expiresAt > b.expiresAt ? a : b));
  const remainingMs = headline.expiresAt - now;

  return (
    <Pressable
      onPress={onPress}
      style={styles.container}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${boostLabel(headline.id)} פעיל, נשארו ${formatRemaining(remainingMs)}`}
    >
      <LottieIcon source={ROCKET_LOTTIE} size={22} autoPlay loop active />
      <Text style={styles.label} allowFontScaling={false}>
        {boostLabel(headline.id)}
      </Text>
      <Text style={styles.timer} allowFontScaling={false}>
        {formatRemaining(remainingMs)}
      </Text>
      {live.length > 1 && (
        <View style={styles.stackBadge} accessible={false}>
          <Text style={styles.stackText} allowFontScaling={false}>+{live.length - 1}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(168, 85, 247, 0.12)', // matches CATEGORY_ACCENTS.boosts
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.45)',
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '900',
    color: '#7e22ce',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  timer: {
    fontSize: 12,
    fontWeight: '700',
    color: '#a855f7',
    fontVariant: ['tabular-nums'],
  },
  stackBadge: {
    backgroundColor: '#a855f7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 18,
    alignItems: 'center',
  },
  stackText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ffffff',
  },
});
