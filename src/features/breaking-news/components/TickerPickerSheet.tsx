import React, { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Search, X, TrendingUp } from 'lucide-react-native';

import { STITCH } from '../../../constants/theme';
import { tapHaptic } from '../../../utils/haptics';
import { searchCatalog, type CatalogEntry } from '../tickerCatalog';

interface TickerPickerSheetProps {
  visible: boolean;
  /** Tickers the user already tracks — disabled in the result list to prevent duplicates. */
  alreadyTracked: readonly string[];
  onClose: () => void;
  /** Called when the user picks a ticker. Caller handles the network + store ops. */
  onPick: (ticker: string) => void;
}

/**
 * Ticker autocomplete picker.
 *
 * Implementation note: we deliberately avoid React Native's `<Modal>` here.
 * On React Native Web (Expo web), `<Modal>` consistently breaks nested
 * Pressable / TouchableOpacity tap handling — the row tap never fires.
 * Rendering this sheet as a conditionally-mounted absolutely-positioned
 * overlay instead sidesteps the entire problem and behaves identically
 * across native + web.
 */
export function TickerPickerSheet({
  visible,
  alreadyTracked,
  onClose,
  onPick,
}: TickerPickerSheetProps): React.ReactElement | null {
  const [query, setQuery] = useState('');

  const matches = useMemo(() => searchCatalog(query, 30), [query]);
  const trimmed = query.trim();
  const rawMatch =
    trimmed.length > 0 && !matches.some((m) => m.ticker.toLowerCase() === trimmed.toLowerCase())
      ? trimmed.toUpperCase().replace(/[^A-Z0-9.]/g, '')
      : null;

  if (!visible) return null;

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  const handlePick = (ticker: string) => {
    // eslint-disable-next-line no-console
    console.log('[BreakingNews] picker handlePick fired:', ticker);
    try { tapHaptic(); } catch { /* haptics may throw on web — never block the pick */ }
    setQuery('');
    onPick(ticker);
  };

  return (
    <View style={styles.overlay}>
      {/* Dim backdrop — taps here close the sheet.
       *  z-index 0 (explicit) so the sheet at z-index 1 reliably paints AND
       *  hit-tests on top. On web the default stacking puts a positioned
       *  sibling (backdrop) above a static one (sheet), which was eating
       *  every row tap and silently calling handleClose. */}
      <Pressable
        style={styles.backdrop}
        onPress={handleClose}
        accessibilityLabel="סגור"
      />

      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.title} allowFontScaling={false}>הוסף מניה למעקב</Text>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="סגור"
            hitSlop={10}
          >
            <X size={20} color={STITCH.onSurfaceVariant} strokeWidth={2.4} />
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <Search size={18} color={STITCH.onSurfaceVariant} strokeWidth={2.2} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="חיפוש לפי שם / סימול (NVDA, אנבידיה)"
            placeholderTextColor="#94a3b8"
            accessibilityLabel="חיפוש מניה"
          />
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          {matches.length === 0 && !rawMatch ? (
            <Text style={styles.emptyText} allowFontScaling={false}>
              לא נמצאו מניות מתאימות
            </Text>
          ) : null}

          {matches.map((entry) => (
            <CatalogRow
              key={entry.ticker}
              entry={entry}
              disabled={alreadyTracked.includes(entry.ticker)}
              onPick={() => handlePick(entry.ticker)}
            />
          ))}

          {rawMatch ? (
            <Pressable
              onPress={() => handlePick(rawMatch)}
              style={({ pressed }) => [styles.rawRow, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={`הוסף סימול ${rawMatch}`}
            >
              <TrendingUp size={18} color={STITCH.primary} strokeWidth={2.4} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rawTitle} allowFontScaling={false}>
                  {rawMatch}
                </Text>
                <Text style={styles.rawSub} allowFontScaling={false}>
                  הוספה כסימול חופשי — ננסה למצוא חדשות
                </Text>
              </View>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

function CatalogRow({
  entry,
  disabled,
  onPick,
}: {
  entry: CatalogEntry;
  disabled: boolean;
  onPick: () => void;
}): React.ReactElement {
  const handlePress = () => {
    // eslint-disable-next-line no-console
    console.log('[BreakingNews] CatalogRow tap:', entry.ticker, 'disabled?', disabled);
    if (!disabled) onPick();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.row,
        disabled && styles.rowDisabled,
        pressed && !disabled && { opacity: 0.55, backgroundColor: '#f1f5f9' },
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={`${entry.nameHe} (${entry.ticker})`}
    >
      <View style={styles.tickerCol}>
        <Text style={styles.ticker} allowFontScaling={false}>{entry.ticker}</Text>
        <Text style={styles.exchange} allowFontScaling={false}>{entry.exchange}</Text>
      </View>
      <View style={styles.nameCol}>
        <Text style={styles.nameHe} numberOfLines={1} allowFontScaling={false}>
          {entry.nameHe}
        </Text>
        <Text style={styles.nameEn} numberOfLines={1} allowFontScaling={false}>
          {entry.nameEn}
        </Text>
      </View>
      {disabled ? (
        <View style={styles.alreadyChip}>
          <Text style={styles.alreadyText}>במעקב</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Fills the whole screen above the sibling content. `position: 'absolute'`
  // with all four anchors at 0 is the cross-platform equivalent of fixed.
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    // Native uses zIndex via the underlying stack; web honors this directly.
    zIndex: 1000,
    ...(Platform.OS === 'web' ? { position: 'fixed' as 'absolute' } : {}),
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.55)',
    zIndex: 0,
  },
  sheet: {
    // Must be positioned + z-indexed so it paints/hit-tests above the
    // backdrop on web (default stacking would otherwise paint absolute
    // siblings above static ones, eating every tap).
    position: 'relative',
    zIndex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  searchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    marginVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: STITCH.onSurface,
    textAlign: 'right',
    writingDirection: 'rtl',
    minHeight: 36,
    padding: 0,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingBottom: 12,
    gap: 4,
  },
  emptyText: {
    fontSize: 13,
    color: STITCH.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: 24,
    writingDirection: 'rtl',
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rowDisabled: {
    opacity: 0.5,
  },
  tickerCol: {
    alignItems: 'flex-end',
    minWidth: 70,
  },
  ticker: {
    fontSize: 14,
    fontWeight: '900',
    color: STITCH.onSurface,
    letterSpacing: -0.3,
  },
  exchange: {
    fontSize: 10,
    fontWeight: '600',
    color: STITCH.onSurfaceVariant,
  },
  nameCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  nameHe: {
    fontSize: 13,
    fontWeight: '700',
    color: STITCH.onSurface,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  nameEn: {
    fontSize: 11,
    fontWeight: '500',
    color: STITCH.onSurfaceVariant,
    textAlign: 'right',
  },
  alreadyChip: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  alreadyText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803d',
    writingDirection: 'rtl',
  },
  rawRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: STITCH.primary + '10',
    borderRadius: 12,
    marginTop: 8,
  },
  rawTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: STITCH.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  rawSub: {
    fontSize: 11,
    fontWeight: '500',
    color: STITCH.onSurfaceVariant,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
