import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { STITCH } from '../../../constants/theme';
import { formatShekel } from '../../../utils/format';
import { tapHaptic } from '../../../utils/haptics';
import { unitPriceToIls, type Holding } from './holdingsCatalog';
import type { LiveQuote } from './useHoldingsQuotes';

interface HoldingRowProps {
  holding: Holding;
  /** Live quote for this ticker, undefined while loading / on fetch miss. */
  quote: LiveQuote | undefined;
  usdIls: number;
  onPress: (holding: Holding) => void;
}

function formatUsd(n: number): string {
  return `$${n.toLocaleString('en-US', {
    minimumFractionDigits: n < 10 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * One live holding. Right (RTL start): ticker + Hebrew name + units. Left:
 * live ₪ value, then a day-change pill and, when a buy price exists, total
 * P&L%. Tap → edit modal. No quote yet → quiet placeholders, never spinners.
 */
function HoldingRowInner({ holding, quote, usdIls, onPress }: HoldingRowProps): React.ReactElement {
  const unitIls = quote ? unitPriceToIls(quote.price, quote.currency, holding.ticker, usdIls) : null;
  const valueIls = unitIls !== null ? holding.units * unitIls : null;
  // TASE shares are quoted in agorot — show the per-share price in shekels;
  // everything else stays in its native USD.
  const isIlsQuote = quote ? unitIls !== null && (quote.currency === 'ILA' || quote.currency === 'ILS' || (quote.currency === null && holding.ticker.endsWith('.TA'))) : false;
  const priceLabel = quote
    ? isIlsQuote
      ? `₪${(unitIls ?? 0).toLocaleString('he-IL', { maximumFractionDigits: 2 })}`
      : formatUsd(quote.price)
    : 'מחיר בטעינה…';

  const dayPct =
    quote && quote.previousClose !== null
      ? ((quote.price - quote.previousClose) / quote.previousClose) * 100
      : null;

  const pnlPct =
    quote && typeof holding.avgBuyPriceUsd === 'number' && holding.avgBuyPriceUsd > 0
      ? ((quote.price - holding.avgBuyPriceUsd) / holding.avgBuyPriceUsd) * 100
      : null;

  return (
    <Pressable
      onPress={() => {
        tapHaptic();
        onPress(holding);
      }}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={`${holding.nameHe}, ${valueIls !== null ? formatShekel(valueIls) : 'מחיר בטעינה'}`}
    >
      <View style={styles.tickerTile}>
        <Text style={styles.tickerText} numberOfLines={1}>
          {holding.ticker}
        </Text>
      </View>

      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.value} numberOfLines={1}>
            {valueIls !== null ? formatShekel(valueIls) : '—'}
          </Text>
          <Text style={styles.name} numberOfLines={1}>
            {holding.nameHe}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <Text style={styles.priceText}>{priceLabel}</Text>
          {dayPct !== null ? (
            <View style={[styles.pill, dayPct >= 0 ? styles.pillUp : styles.pillDown]}>
              <Text style={[styles.pillText, dayPct >= 0 ? styles.pillTextUp : styles.pillTextDown]}>
                {dayPct >= 0 ? '+' : ''}
                {dayPct.toFixed(1)}% היום
              </Text>
            </View>
          ) : null}
          {pnlPct !== null ? (
            <View style={[styles.pill, pnlPct >= 0 ? styles.pillUp : styles.pillDown]}>
              <Text style={[styles.pillText, pnlPct >= 0 ? styles.pillTextUp : styles.pillTextDown]}>
                {pnlPct >= 0 ? '+' : ''}
                {pnlPct.toFixed(1)}% סה"כ
              </Text>
            </View>
          ) : null}
          <Text style={styles.unitsText}>
            · {holding.units.toLocaleString('he-IL', { maximumFractionDigits: 4 })} יח'
          </Text>
        </View>
      </View>

      <ChevronLeft size={18} color={STITCH.onSurfaceVariant} strokeWidth={2.4} />
    </Pressable>
  );
}

export const HoldingRow = React.memo(HoldingRowInner);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
  },
  tickerTile: {
    minWidth: 52,
    height: 42,
    borderRadius: 12,
    backgroundColor: STITCH.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tickerText: {
    fontSize: 12,
    fontWeight: '900',
    color: STITCH.onSurface,
    letterSpacing: 0.2,
  },
  body: { flex: 1, gap: 4 },
  topRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  value: {
    fontSize: 15,
    fontWeight: '900',
    color: STITCH.onSurface,
    letterSpacing: -0.3,
    writingDirection: 'rtl',
  },
  bottomRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  priceText: {
    fontSize: 11,
    fontWeight: '800',
    color: STITCH.onSurfaceVariant,
  },
  pill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  pillUp: { backgroundColor: '#dcfce7' },
  pillDown: { backgroundColor: '#fee2e2' },
  pillText: { fontSize: 10, fontWeight: '900', writingDirection: 'rtl' },
  pillTextUp: { color: '#15803d' },
  pillTextDown: { color: '#dc2626' },
  unitsText: {
    fontSize: 10,
    fontWeight: '700',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
  },
});
