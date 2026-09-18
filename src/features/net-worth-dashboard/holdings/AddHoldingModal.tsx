import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Search, X } from 'lucide-react-native';

import { STITCH } from '../../../constants/theme';
import { successHaptic, tapHaptic } from '../../../utils/haptics';
import { CalculateButton, SectionLabel } from '../../financial-tools/components/atoms';
import { searchCatalog, type CatalogEntry } from '../../breaking-news/tickerCatalog';
import { track } from '../../../lib/analytics/events';
import { HOLDABLE_CATALOG, findHoldable, isTaseTicker, type Holding } from './holdingsCatalog';
import { useHoldingsStore } from './useHoldingsStore';

interface AddHoldingModalProps {
  visible: boolean;
  /** When provided → edit mode (units/buy-price only; ticker is fixed). */
  holding: Holding | null;
  onClose: () => void;
  /** Fired after the very first holding is saved — the section celebrates. */
  onFirstHolding?: () => void;
}

const ACCENT = '#ec4899';

/** Search over the holdable universe only (index rows filtered out). */
function searchHoldable(query: string, limit = 8): CatalogEntry[] {
  const holdable = new Set(HOLDABLE_CATALOG.map((e) => e.ticker));
  return searchCatalog(query, limit + 2)
    .filter((e) => holdable.has(e.ticker))
    .slice(0, limit);
}

/** Numeric field in the atoms' visual language — the shared LabeledTextInput
 *  has no keyboardType, and MoneyInput is ₪-suffixed (wrong for units). */
function NumericField({
  label,
  value,
  onChangeText,
  placeholder,
  suffix,
  hint,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  suffix?: string;
  hint?: string;
  error?: string | null;
}): React.ReactElement {
  return (
    <View style={[styles.fieldCard, error ? styles.fieldCardError : null]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldInputRow}>
        {suffix ? <Text style={styles.fieldSuffix}>{suffix}</Text> : null}
        <TextInput
          value={value}
          onChangeText={(t) => onChangeText(t.replace(/[^0-9.]/g, ''))}
          placeholder={placeholder}
          placeholderTextColor={STITCH.onSurfaceVariant}
          keyboardType="decimal-pad"
          returnKeyType="done"
          style={styles.fieldInput}
          accessibilityLabel={label}
        />
      </View>
      {error ? (
        <Text style={styles.fieldError} accessibilityLiveRegion="polite">{error}</Text>
      ) : hint ? (
        <Text style={styles.fieldHint}>{hint}</Text>
      ) : null}
    </View>
  );
}

/**
 * Add / edit one real holding. Add mode: ticker autocomplete over the
 * breaking-news catalog + units + optional avg buy price (₪ for TASE, $
 * otherwise — UX-31). Edit mode: units and buy price only, with delete.
 * Inline validation (no modal-over-modal), manual safe-area insets (the
 * iOS Modal + SafeAreaView trap), single keyboard-avoidance strategy.
 */
export function AddHoldingModal({
  visible,
  holding,
  onClose,
  onFirstHolding,
}: AddHoldingModalProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const addHolding = useHoldingsStore((s) => s.addHolding);
  const updateHolding = useHoldingsStore((s) => s.updateHolding);
  const removeHolding = useHoldingsStore((s) => s.removeHolding);
  const holdingsCount = useHoldingsStore((s) => s.holdings.length);

  const isEdit = holding !== null;

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CatalogEntry | null>(null);
  const [units, setUnits] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [tickerError, setTickerError] = useState<string | null>(null);
  const [unitsError, setUnitsError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setTickerError(null);
    setUnitsError(null);
    if (holding) {
      setSelected(findHoldable(holding.ticker) ?? null);
      setQuery('');
      setUnits(String(holding.units));
      setBuyPrice(typeof holding.avgBuyPrice === 'number' ? String(holding.avgBuyPrice) : '');
    } else {
      setSelected(null);
      setQuery('');
      setUnits('');
      setBuyPrice('');
    }
  }, [visible, holding]);

  const suggestions = useMemo(() => (selected ? [] : searchHoldable(query)), [query, selected]);

  const ticker = isEdit && holding ? holding.ticker : selected?.ticker;
  const tase = ticker ? isTaseTicker(ticker) : false;
  const currencySuffix = tase ? '₪' : '$';

  function handlePick(entry: CatalogEntry) {
    tapHaptic();
    setSelected(entry);
    setQuery('');
    setTickerError(null);
  }

  function handleSave() {
    const parsedUnits = Number(units);
    const parsedBuy = Number(buyPrice);
    let ok = true;
    if (!ticker) {
      setTickerError('בחרו מניה או מטבע מהרשימה.');
      ok = false;
    }
    if (!(parsedUnits > 0)) {
      setUnitsError('כמה יחידות יש לכם? אפשר גם חלקי, למשל 0.5.');
      ok = false;
    } else {
      setUnitsError(null);
    }
    if (!ok) return;

    if (isEdit && holding) {
      tapHaptic();
      updateHolding(holding.id, {
        units: parsedUnits,
        avgBuyPrice: parsedBuy > 0 ? parsedBuy : 0,
      });
    } else if (selected) {
      const isFirst = holdingsCount === 0;
      addHolding({
        ticker: selected.ticker,
        nameHe: selected.nameHe,
        units: parsedUnits,
        avgBuyPrice: parsedBuy > 0 ? parsedBuy : undefined,
      });
      track({
        name: 'holding_added',
        props: {
          ticker: selected.ticker,
          has_buy_price: parsedBuy > 0,
          holdings_count: holdingsCount + 1,
        },
      });
      if (isFirst) {
        // The user's first REAL financial move inside FinPlay (UX-17).
        successHaptic();
        track({ name: 'first_real_holding_added', props: { ticker: selected.ticker, is_tase: tase } });
        onFirstHolding?.();
      } else {
        tapHaptic();
      }
    }
    onClose();
  }

  function handleDelete() {
    if (!holding) return;
    Alert.alert('הסרה מהמעקב', `להסיר את ${holding.nameHe} מהתיק?`, [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'הסרה',
        style: 'destructive',
        onPress: () => {
          removeHolding(holding.id);
          track({
            name: 'holding_removed',
            props: { ticker: holding.ticker, holdings_count: holdingsCount - 1 },
          });
          onClose();
        },
      },
    ]);
  }

  const displayName = isEdit && holding ? holding.nameHe : selected?.nameHe;

  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="slide" presentationStyle="formSheet">
      {/* Manual insets: SafeAreaView inside a Modal drops the top inset on
          iOS new-arch (memory: ios_modal_safearea_trap). formSheet already
          sits below the status bar, so only a small top pad is needed. */}
      <View style={[styles.safe, { paddingTop: Platform.OS === 'ios' ? 8 : insets.top }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="סגירה" hitSlop={10}>
              <X size={22} color={STITCH.onSurface} strokeWidth={2.6} />
            </Pressable>
            <Text style={styles.title}>{isEdit ? 'עריכת אחזקה' : 'הוספה לתיק'}</Text>
            <View style={styles.closeBtn} />
          </View>

          <ScrollView
            contentContainerStyle={[styles.scroll, { paddingBottom: 120 + insets.bottom }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <SectionLabel>נייר ערך</SectionLabel>

            {ticker ? (
              <View style={styles.selectedCard}>
                {!isEdit ? (
                  <Pressable onPress={() => setSelected(null)} hitSlop={8} accessibilityRole="button" accessibilityLabel="החלפת נייר">
                    <X size={16} color={STITCH.onSurfaceVariant} strokeWidth={2.6} />
                  </Pressable>
                ) : (
                  <View style={{ width: 16 }} />
                )}
                <View style={styles.selectedTextWrap}>
                  <Text style={styles.selectedName}>{displayName}</Text>
                  <Text style={styles.selectedTicker}>
                    {ticker.replace('.TA', '')}
                    {tase ? ' · הבורסה בת"א' : ''}
                  </Text>
                </View>
                <View style={styles.selectedCheck}>
                  <Check size={16} color="#15803d" strokeWidth={3} />
                </View>
              </View>
            ) : (
              <>
                <View style={[styles.searchCard, tickerError ? styles.fieldCardError : null]}>
                  <Search size={16} color={STITCH.onSurfaceVariant} strokeWidth={2.4} />
                  <TextInput
                    value={query}
                    onChangeText={(t) => {
                      setQuery(t);
                      if (tickerError) setTickerError(null);
                    }}
                    placeholder="חיפוש: אפל, לאומי, S&P 500…"
                    placeholderTextColor={STITCH.onSurfaceVariant}
                    style={styles.searchInput}
                    autoCorrect={false}
                    autoFocus={!isEdit}
                    returnKeyType="search"
                    accessibilityLabel="חיפוש נייר ערך"
                  />
                </View>
                {tickerError ? <Text style={styles.fieldError}>{tickerError}</Text> : (
                  <Text style={styles.universeHint}>מניות מארה"ב, הבורסה בתל אביב וקריפטו</Text>
                )}
                <View style={styles.suggestionList}>
                  {suggestions.map((entry) => (
                    <Pressable
                      key={entry.ticker}
                      onPress={() => handlePick(entry)}
                      style={styles.suggestionRow}
                      accessibilityRole="button"
                      accessibilityLabel={`בחירת ${entry.nameHe}`}
                    >
                      <Text style={styles.suggestionTicker}>
                        {entry.ticker.replace('.TA', '')}
                        {entry.exchange === 'TASE' ? ' · ת"א' : ''}
                      </Text>
                      <Text style={styles.suggestionName} numberOfLines={1}>
                        {entry.nameHe}
                      </Text>
                    </Pressable>
                  ))}
                  {suggestions.length === 0 ? (
                    <Text style={styles.noResults}>אין תוצאה ברשימה — מוסיפים ניירות חדשים כל הזמן.</Text>
                  ) : null}
                </View>
              </>
            )}

            <SectionLabel>כמה מחזיקים?</SectionLabel>

            <NumericField
              label="כמות יחידות"
              value={units}
              onChangeText={(v) => {
                setUnits(v);
                if (unitsError) setUnitsError(null);
              }}
              placeholder="למשל 2.5"
              hint="אפשר גם חלקי מניה — כמו אצל הברוקר."
              error={unitsError}
            />

            <NumericField
              label={`מחיר קנייה ממוצע (לא חובה) · ב${tase ? 'שקלים' : 'דולרים'}`}
              value={buyPrice}
              onChangeText={setBuyPrice}
              placeholder="0.00"
              suffix={currencySuffix}
              hint={tase ? 'המחיר למניה בשקלים, כמו שמופיע אצלכם בברוקר (לא באגורות).' : 'עם מחיר קנייה נציג גם רווח/הפסד כולל.'}
            />

            {isEdit ? (
              <Pressable style={styles.deleteBtn} onPress={handleDelete} accessibilityRole="button" accessibilityLabel="הסרת אחזקה">
                <Text style={styles.deleteBtnText}>הסרה מהתיק</Text>
              </Pressable>
            ) : null}

            <Text style={styles.disclaimer}>מעקב בלבד — לא מחובר לחשבון מסחר ולא מהווה ייעוץ השקעות.</Text>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
            <CalculateButton label={isEdit ? 'שמירת שינויים' : 'הוספה לתיק'} variant="pink" onPress={handleSave} />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: STITCH.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: STITCH.surfaceLowest,
    borderBottomWidth: 1,
    borderBottomColor: STITCH.surfaceHighest,
  },
  title: { fontSize: 17, fontWeight: '900', color: STITCH.onSurface, writingDirection: 'rtl' },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 12 },

  searchCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '700',
    color: STITCH.onSurface,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  universeHint: {
    fontSize: 11,
    fontWeight: '600',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
    textAlign: 'right',
    marginTop: -4,
  },
  suggestionList: { gap: 6 },
  suggestionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
  },
  suggestionName: { flex: 1, fontSize: 13, fontWeight: '800', color: STITCH.onSurface, writingDirection: 'rtl', textAlign: 'right' },
  suggestionTicker: { fontSize: 12, fontWeight: '900', color: STITCH.onSurfaceVariant, letterSpacing: 0.3 },
  noResults: { fontSize: 12, fontWeight: '600', color: STITCH.onSurfaceVariant, textAlign: 'center', writingDirection: 'rtl', paddingVertical: 8 },

  selectedCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#86efac',
  },
  selectedTextWrap: { flex: 1, alignItems: 'flex-end' },
  selectedName: { fontSize: 14, fontWeight: '900', color: STITCH.onSurface, writingDirection: 'rtl' },
  selectedTicker: { fontSize: 11, fontWeight: '800', color: STITCH.onSurfaceVariant, letterSpacing: 0.3, marginTop: 1, writingDirection: 'rtl' },
  selectedCheck: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },

  fieldCard: {
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    gap: 6,
  },
  fieldCardError: { borderColor: '#fca5a5' },
  fieldLabel: { fontSize: 12, fontWeight: '900', color: STITCH.onSurface, writingDirection: 'rtl', textAlign: 'right' },
  fieldInputRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  fieldInput: { flex: 1, fontSize: 16, fontWeight: '900', color: STITCH.onSurface, paddingVertical: 6, textAlign: 'right' },
  fieldSuffix: { fontSize: 14, fontWeight: '900', color: ACCENT },
  fieldHint: { fontSize: 11, fontWeight: '600', color: STITCH.onSurfaceVariant, writingDirection: 'rtl', textAlign: 'right' },
  fieldError: { fontSize: 11.5, fontWeight: '800', color: '#dc2626', writingDirection: 'rtl', textAlign: 'right' },

  disclaimer: { fontSize: 11, fontWeight: '600', color: STITCH.onSurfaceVariant, textAlign: 'center', writingDirection: 'rtl', marginTop: 4 },
  deleteBtn: { marginTop: 4, paddingVertical: 12, alignItems: 'center' },
  deleteBtnText: { fontSize: 13, fontWeight: '900', color: '#dc2626', writingDirection: 'rtl' },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: STITCH.surfaceLowest,
    borderTopWidth: 1,
    borderTopColor: STITCH.surfaceHighest,
  },
});
