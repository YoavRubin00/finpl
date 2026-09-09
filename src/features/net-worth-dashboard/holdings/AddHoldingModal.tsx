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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Search, X } from 'lucide-react-native';

import { STITCH } from '../../../constants/theme';
import { tapHaptic } from '../../../utils/haptics';
import { CalculateButton, SectionLabel } from '../../financial-tools/components/atoms';
import { searchCatalog, type CatalogEntry } from '../../breaking-news/tickerCatalog';
import { track } from '../../../lib/analytics/events';
import { HOLDABLE_CATALOG, findHoldable, type Holding } from './holdingsCatalog';
import { useHoldingsStore } from './useHoldingsStore';

interface AddHoldingModalProps {
  visible: boolean;
  /** When provided → edit mode (units/buy-price only; ticker is fixed). */
  holding: Holding | null;
  onClose: () => void;
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
 *  has no keyboardType, and MoneyInput is ₪-suffixed (wrong for units/USD). */
function NumericField({
  label,
  value,
  onChangeText,
  placeholder,
  suffix,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  suffix?: string;
  hint?: string;
}): React.ReactElement {
  return (
    <View style={styles.fieldCard}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldInputRow}>
        {suffix ? <Text style={styles.fieldSuffix}>{suffix}</Text> : null}
        <TextInput
          value={value}
          onChangeText={(t) => onChangeText(t.replace(/[^0-9.]/g, ''))}
          placeholder={placeholder}
          placeholderTextColor={STITCH.onSurfaceVariant}
          keyboardType="decimal-pad"
          style={styles.fieldInput}
          accessibilityLabel={label}
        />
      </View>
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

/**
 * Add / edit one real holding. Add mode: ticker autocomplete over the
 * breaking-news catalog + units + optional avg buy price. Edit mode: units
 * and buy price only, with delete. Mirrors AssetEditModal's formSheet idiom.
 */
export function AddHoldingModal({
  visible,
  holding,
  onClose,
}: AddHoldingModalProps): React.ReactElement {
  const addHolding = useHoldingsStore((s) => s.addHolding);
  const updateHolding = useHoldingsStore((s) => s.updateHolding);
  const removeHolding = useHoldingsStore((s) => s.removeHolding);
  const holdingsCount = useHoldingsStore((s) => s.holdings.length);

  const isEdit = holding !== null;

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CatalogEntry | null>(null);
  const [units, setUnits] = useState('');
  const [buyPrice, setBuyPrice] = useState('');

  useEffect(() => {
    if (!visible) return;
    if (holding) {
      setSelected(findHoldable(holding.ticker) ?? null);
      setQuery('');
      setUnits(String(holding.units));
      setBuyPrice(
        typeof holding.avgBuyPriceUsd === 'number' ? String(holding.avgBuyPriceUsd) : '',
      );
    } else {
      setSelected(null);
      setQuery('');
      setUnits('');
      setBuyPrice('');
    }
  }, [visible, holding]);

  const suggestions = useMemo(
    () => (selected ? [] : searchHoldable(query)),
    [query, selected],
  );

  function handlePick(entry: CatalogEntry) {
    tapHaptic();
    setSelected(entry);
    setQuery('');
  }

  function handleSave() {
    const parsedUnits = Number(units);
    const parsedBuy = Number(buyPrice);
    const ticker = isEdit && holding ? holding.ticker : selected?.ticker;
    if (!ticker) {
      Alert.alert('בחירת נייר', 'בחרו מניה או מטבע מהרשימה כדי להוסיף לתיק.');
      return;
    }
    if (!(parsedUnits > 0)) {
      Alert.alert('כמות נדרשת', 'כמה יחידות יש לכם? אפשר גם חלקי (למשל 0.5).');
      return;
    }
    tapHaptic();
    if (isEdit && holding) {
      updateHolding(holding.id, {
        units: parsedUnits,
        avgBuyPriceUsd: parsedBuy > 0 ? parsedBuy : 0,
      });
    } else if (selected) {
      addHolding({
        ticker: selected.ticker,
        nameHe: selected.nameHe,
        units: parsedUnits,
        avgBuyPriceUsd: parsedBuy > 0 ? parsedBuy : undefined,
      });
      track({
        name: 'holding_added',
        props: {
          ticker: selected.ticker,
          has_buy_price: parsedBuy > 0,
          holdings_count: holdingsCount + 1,
        },
      });
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
  const displayTicker = isEdit && holding ? holding.ticker : selected?.ticker;

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      presentationStyle="formSheet"
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <View style={styles.header}>
            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="סגירה"
              hitSlop={10}
            >
              <X size={22} color={STITCH.onSurface} strokeWidth={2.6} />
            </Pressable>
            <Text style={styles.title}>{isEdit ? 'עריכת אחזקה' : 'הוספה לתיק'}</Text>
            <View style={styles.closeBtn} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets
          >
            <SectionLabel>נייר ערך</SectionLabel>

            {displayTicker ? (
              <View style={styles.selectedCard}>
                {!isEdit ? (
                  <Pressable
                    onPress={() => setSelected(null)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="החלפת נייר"
                  >
                    <X size={16} color={STITCH.onSurfaceVariant} strokeWidth={2.6} />
                  </Pressable>
                ) : (
                  <View style={{ width: 16 }} />
                )}
                <View style={styles.selectedTextWrap}>
                  <Text style={styles.selectedName}>{displayName}</Text>
                  <Text style={styles.selectedTicker}>{displayTicker}</Text>
                </View>
                <View style={styles.selectedCheck}>
                  <Check size={16} color="#15803d" strokeWidth={3} />
                </View>
              </View>
            ) : (
              <>
                <View style={styles.searchCard}>
                  <Search size={16} color={STITCH.onSurfaceVariant} strokeWidth={2.4} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="חיפוש: אפל, טסלה, S&P 500…"
                    placeholderTextColor={STITCH.onSurfaceVariant}
                    style={styles.searchInput}
                    autoCorrect={false}
                    accessibilityLabel="חיפוש נייר ערך"
                  />
                </View>
                <View style={styles.suggestionList}>
                  {suggestions.map((entry) => (
                    <Pressable
                      key={entry.ticker}
                      onPress={() => handlePick(entry)}
                      style={styles.suggestionRow}
                      accessibilityRole="button"
                      accessibilityLabel={`בחירת ${entry.nameHe}`}
                    >
                      <Text style={styles.suggestionTicker}>{entry.ticker}</Text>
                      <Text style={styles.suggestionName} numberOfLines={1}>
                        {entry.nameHe}
                      </Text>
                    </Pressable>
                  ))}
                  {suggestions.length === 0 ? (
                    <Text style={styles.noResults}>
                      אין תוצאה ברשימה — מוסיפים ניירות חדשים כל הזמן.
                    </Text>
                  ) : null}
                </View>
              </>
            )}

            <SectionLabel>כמה מחזיקים?</SectionLabel>

            <NumericField
              label="כמות יחידות"
              value={units}
              onChangeText={setUnits}
              placeholder="למשל 2.5"
              hint="אפשר גם חלקי מניה — כמו אצל הברוקר."
            />

            <NumericField
              label="מחיר קנייה ממוצע (לא חובה)"
              value={buyPrice}
              onChangeText={setBuyPrice}
              placeholder="0.00"
              suffix="$"
              hint="עם מחיר קנייה נציג גם רווח/הפסד כולל."
            />

            <Text style={styles.disclaimer}>
              מעקב בלבד — לא מחובר לחשבון מסחר ולא מהווה ייעוץ השקעות.
            </Text>

            {isEdit ? (
              <Pressable
                style={styles.deleteBtn}
                onPress={handleDelete}
                accessibilityRole="button"
                accessibilityLabel="הסרת אחזקה"
              >
                <Text style={styles.deleteBtnText}>הסרה מהתיק</Text>
              </Pressable>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <CalculateButton
              label={isEdit ? 'שמירת שינויים' : 'הוספה לתיק'}
              variant="pink"
              onPress={handleSave}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
  },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, paddingBottom: 120, gap: 12 },

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
  suggestionName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  suggestionTicker: {
    fontSize: 12,
    fontWeight: '900',
    color: STITCH.onSurfaceVariant,
    letterSpacing: 0.3,
  },
  noResults: {
    fontSize: 12,
    fontWeight: '600',
    color: STITCH.onSurfaceVariant,
    textAlign: 'center',
    writingDirection: 'rtl',
    paddingVertical: 8,
  },

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
  selectedName: {
    fontSize: 14,
    fontWeight: '900',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
  },
  selectedTicker: {
    fontSize: 11,
    fontWeight: '800',
    color: STITCH.onSurfaceVariant,
    letterSpacing: 0.3,
    marginTop: 1,
  },
  selectedCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  fieldCard: {
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  fieldInputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
    color: STITCH.onSurface,
    paddingVertical: 6,
    textAlign: 'right',
  },
  fieldSuffix: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ec4899',
  },
  fieldHint: {
    fontSize: 11,
    fontWeight: '600',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
    textAlign: 'right',
  },

  disclaimer: {
    fontSize: 11,
    fontWeight: '600',
    color: STITCH.onSurfaceVariant,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 4,
  },

  deleteBtn: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#dc2626',
    writingDirection: 'rtl',
  },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 22,
    backgroundColor: STITCH.surfaceLowest,
    borderTopWidth: 1,
    borderTopColor: STITCH.surfaceHighest,
  },
});
