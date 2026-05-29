import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Share2, Newspaper } from 'lucide-react-native';

import { STITCH } from '../../../constants/theme';
import { tapHaptic, successHaptic } from '../../../utils/haptics';

interface ShareCardProps {
  dateKey: string;            // YYYY-MM-DD
  /** Per-item correctness — undefined = not answered (shouldn't happen on this screen). */
  results: [boolean | undefined, boolean | undefined];
  streak: number;
  /** Optional callback after the share sheet closes (success or dismissed). */
  onShared?: () => void;
}

const APP_URL = 'https://finplay.co.il';

/**
 * Wordle-style share card: spoiler-free emoji grid that conveys 2/2 or 1/2
 * without revealing the actual headlines. Tapping the share button opens the
 * native sheet with a text-only payload — no image generation required.
 */
export function ShareCard({ dateKey, results, streak, onShared }: ShareCardProps): React.ReactElement {
  const grid = results.map((r) => (r ? '✅' : '❌')).join(' ');
  const score = results.filter(Boolean).length;
  const dateLabel = formatHebrewDate(dateKey);

  const handleShare = useCallback(async () => {
    tapHaptic();
    const message = [
      `📰 אקטואליה פיננסית · ${dateLabel}`,
      '',
      grid,
      score === 2 ? '🏆 יום מושלם!' : `${score}/2 כותרות`,
      streak > 0 ? `🔥 רצף של ${streak} ימים` : null,
      '',
      `נסה גם: ${APP_URL}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const result = await Share.share({ message });
      if (result.action === Share.sharedAction) {
        successHaptic();
      }
    } catch {
      // user dismissed; nothing to do
    }
    onShared?.();
  }, [grid, score, streak, dateLabel, onShared]);

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={['#0c4a6e', '#1e3a8a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.headerRow}>
          <View style={styles.iconBadge}>
            <Newspaper size={16} color="#0f172a" strokeWidth={2.8} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.brand} allowFontScaling={false}>FinPlay · אקטואליה</Text>
            <Text style={styles.dateText} allowFontScaling={false}>{dateLabel}</Text>
          </View>
        </View>

        <Text style={styles.grid} allowFontScaling={false}>{grid}</Text>

        <View style={styles.footerRow}>
          {streak > 0 && (
            <Text style={styles.footerChip} allowFontScaling={false}>🔥 {streak} ימים ברצף</Text>
          )}
          {score === 2 && (
            <Text style={[styles.footerChip, styles.footerChipPerfect]} allowFontScaling={false}>
              🏆 מושלם
            </Text>
          )}
        </View>
      </LinearGradient>

      <Pressable
        onPress={handleShare}
        accessibilityRole="button"
        accessibilityLabel="שתף תוצאה"
        style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.85 }]}
      >
        <Share2 size={16} color="#0f172a" strokeWidth={2.6} />
        <Text style={styles.shareBtnText} allowFontScaling={false}>שתף תוצאה</Text>
      </Pressable>
    </View>
  );
}

function formatHebrewDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-');
  if (!y || !m || !d) return dateKey;
  return `${d}.${m}.${y}`;
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  card: {
    padding: 16,
    borderRadius: 18,
    gap: 14,
    shadowColor: '#0c4a6e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#facc15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: 13,
    fontWeight: '900',
    color: '#facc15',
    writingDirection: 'rtl',
    textAlign: 'right',
    letterSpacing: 0.4,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  grid: {
    fontSize: 36,
    letterSpacing: 8,
    textAlign: 'center',
    color: '#fff',
  },
  footerRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  footerChip: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    writingDirection: 'rtl',
  },
  footerChipPerfect: {
    backgroundColor: 'rgba(250, 204, 21, 0.95)',
    color: '#0f172a',
  },
  shareBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#facc15',
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
    writingDirection: 'rtl',
  },
});

// reuse STITCH to avoid TS unused-import warning when colors aren't directly referenced
void STITCH;
