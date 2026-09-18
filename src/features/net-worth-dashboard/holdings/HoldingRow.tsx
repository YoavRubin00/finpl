import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { STITCH } from '../../../constants/theme';
import { formatShekel } from '../../../utils/format';
import { tapHaptic } from '../../../utils/haptics';
import { isTaseTicker, unitPriceToIls, type Holding } from './holdingsCatalog';
import type { LiveQuote } from './useHoldingsQuotes';

interface HoldingRowProps {
  holding: Holding;
  /** Live quote for this ticker; undefined while loading OR when the fetch
   *  missed this ticker — `quotesLoaded` tells the two apart. */
  quote: LiveQuote | undefined;
  quotesLoaded: boolean;
  usdIls: number;
  onPress: (holding: Holding) => void;
  onLongPress: (holding: Holding) => void;
}

function formatUsd(n: number): string {
  return `$${n.toLocaleString('en-US', {
    minimumFractionDigits: n < 10 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

function pct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

/**
 * One live holding. Right (RTL start): ticker + Hebrew name + units. Left:
 * live ₪ value, then a day-change pill and, when a buy price exists, total
 * P&L%. Tap → edit; long-press → quick actions. Three price states: loading,
 * live, and "no price right now" (quote missing after load) — never a
 * spinner that lives forever (UX-15).
 */
function HoldingRowInner({ holding, quote, quotesLoaded, usdIls, onPress, onLongPress }: HoldingRowProps): React.ReactElement {
  const tase = isTaseTicker(holding.ticker);
  const unitIls = quote ? unitPriceToIls(quote.price, quote.currency, holding.ticker, usdIls) : null;
  const valueIls = unitIls !== null ? holding.units * unitIls : null;

  const dayPct =
    quote && quote.previousClose !== null
      ? ((quote.price - quote.previousClose) / quote.previousClose) * 100
      : null;

  // Buy price is entered in the display currency (₪ for TASE, $ otherwise),
  // so compare it against the same-currency unit price (UX-31).
  const buy = holding.avgBuyPrice;
  const unitDisplay = quote ? (tase ? unitIls : quote.price) : null;
  const pnlPct =
    unitDisplay !== null && typeof buy === 'number' && buy > 0
      ? ((unitDisplay - buy) / buy) * 100
      : null;

  const priceLabel = !quote
    ? quotesLoaded
      ? 'אין מחיר כרגע'
      : 'מחיר בטעינה…'
    : tase
      ? `₪${(unitIls ?? 0).toLocaleString('he-IL', { maximumFractionDigits: 2 })}`
      : formatUsd(quote.price);

  const a11y = [
    holding.nameHe,
    valueIls !== null ? formatShekel(valueIls) : priceLabel,
    dayPct !== null ? `שינוי יומי ${pct(dayPct)}` : null,
    pnlPct !== null ? `רווח כולל ${pct(pnlPct)}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      onPress={() => {
        tapHaptic();
        onPress(holding);
      }}
      onLongPress={() => onLongPress(holding)}
      delayLongPress={350}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityHint="הקשה לעריכה, לחיצה ארוכה לפעולות"
    >
      <View style={styles.tickerTile}>
        <Text style={styles.tickerText} numberOfLines={1}>
          {holding.ticker.replace('.TA', '')}
        </Text>
        {tase ? <Text style={styles.tickerSub}>ת"א</Text> : null}
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
          <Text style={[styles.priceText, !quote && quotesLoaded && styles.priceMissing]}>{priceLabel}</Text>
          {dayPct !== null ? (
            <View style={[styles.pill, dayPct >= 0 ? styles.pillUp : styles.pillDown]}>
              <Text style={[styles.pillText, dayPct >= 0 ? styles.pillTextUp : styles.pillTextDown]}>
                {pct(dayPct)} היום
              </Text>
            </View>
          ) : null}
          {pnlPct !== null ? (
            <View style={[styles.pill, pnlPct >= 0 ? styles.pillUp : styles.pillDown]}>
              <Text style={[styles.pillText, pnlPct >= 0 ? styles.pillTextUp : styles.pillTextDown]}>
                {pct(pnlPct)} סה"כ
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
  tickerSub: {
    fontSize: 9,
    fontWeight: '800',
    color: STITCH.onSurfaceVariant,
    marginTop: 1,
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
  priceMissing: { color: '#b45309' },
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
