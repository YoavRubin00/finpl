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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Search, X, TrendingUp, Flame, Sparkles, Check } from 'lucide-react-native';

import { STITCH } from '../../../constants/theme';
import { searchCatalog, type CatalogEntry } from '../tickerCatalog';

const FLAME_GRADIENT = ['#dc2626', '#f97316', '#fbbf24'] as const;
const ACCENT_RED = '#dc2626';

interface TickerPickerSheetProps {
  visible: boolean;
  alreadyTracked: readonly string[];
  onClose: () => void;
  onPick: (ticker: string) => void;
}

/**
 * Ticker autocomplete picker — Supercell-style bottom sheet with flame
 * gradient header, animated rows, and press feedback.
 *
 * Implementation note: we deliberately avoid React Native's `<Modal>` here.
 * On React Native Web (Expo web), `<Modal>` consistently breaks nested
 * Pressable / TouchableOpacity tap handling — the row tap never fires.
 * Rendering as a conditionally-mounted absolutely-positioned overlay
 * sidesteps the entire problem and behaves identically across native + web.
 */
export function TickerPickerSheet({
  visible,
  alreadyTracked,
  onClose,
  onPick,
}: TickerPickerSheetProps): React.ReactElement | null {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const matches = useMemo(() => searchCatalog(query, 30), [query]);
  const trimmed = query.trim();
  const rawMatch =
    trimmed.length > 0 && !matches.some((m) => m.ticker.toLowerCase() === trimmed.toLowerCase())
      ? trimmed.toUpperCase().replace(/[^A-Z0-9.]/g, '')
      : null;

  if (!visible) return null;

  const handleClose = () => {
    setQuery('');
    setSearchFocused(false);
    onClose();
  };

  const handlePick = (ticker: string) => {
    // No haptic here — this screen is intentionally vibration-free.
    setQuery('');
    setSearchFocused(false);
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

      <Animated.View
        entering={FadeInDown.duration(240)}
        style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 8, 16) }]}
      >
        {/* Flame gradient hero header — matches the breaking-news brand. */}
        <LinearGradient
          colors={FLAME_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          <View style={styles.handle} />

          <View style={styles.heroRow}>
            <View style={styles.heroIconWrap}>
              <Flame size={22} color="#ffffff" strokeWidth={2.6} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle} allowFontScaling={false}>
                הוסף מניה למעקב
              </Text>
              <Text style={styles.heroSubtitle} allowFontScaling={false}>
                סיכום AI יומי יחכה לך כל בוקר
              </Text>
            </View>
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.92 }] }]}
              accessibilityRole="button"
              accessibilityLabel="סגור"
              hitSlop={10}
            >
              <X size={18} color="#ffffff" strokeWidth={2.6} />
            </Pressable>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <View
            style={[
              styles.searchRow,
              searchFocused && styles.searchRowFocused,
            ]}
          >
            <Search
              size={18}
              color={searchFocused ? ACCENT_RED : STITCH.onSurfaceVariant}
              strokeWidth={2.4}
            />
            <TextInput
              style={styles.input}
              value={query}
              onChangeText={setQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="חיפוש לפי שם / סימול (NVDA, אנבידיה)"
              placeholderTextColor="#94a3b8"
              accessibilityLabel="חיפוש מניה"
            />
            {query.length > 0 ? (
              <Pressable
                onPress={() => setQuery('')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="נקה חיפוש"
              >
                <View style={styles.clearBtn}>
                  <X size={12} color="#ffffff" strokeWidth={2.8} />
                </View>
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
          >
            {matches.length === 0 && !rawMatch ? (
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIconBg}>
                  <Search size={28} color={STITCH.onSurfaceVariant} strokeWidth={2.2} />
                </View>
                <Text style={styles.emptyTitle} allowFontScaling={false}>
                  לא נמצאו מניות
                </Text>
                <Text style={styles.emptyHint} allowFontScaling={false}>
                  נסה לחפש בסימול באנגלית (לדוגמה: AAPL)
                </Text>
              </View>
            ) : null}

            {matches.map((entry, i) => (
              <CatalogRow
                key={entry.ticker}
                entry={entry}
                index={i}
                disabled={alreadyTracked.includes(entry.ticker)}
                onPick={() => handlePick(entry.ticker)}
              />
            ))}

            {rawMatch ? <RawAddRow ticker={rawMatch} onPick={() => handlePick(rawMatch)} /> : null}
          </ScrollView>
        </View>
      </Animated.View>
    </View>
  );
}

/* ─────────────── Animated Catalog Row ─────────────── */

function CatalogRow({
  entry,
  index,
  disabled,
  onPick,
}: {
  entry: CatalogEntry;
  index: number;
  disabled: boolean;
  onPick: () => void;
}): React.ReactElement {
  const scale = useSharedValue(1);
  const bgOpacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pressOverlayStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const handlePress = () => {
    // eslint-disable-next-line no-console
    console.log('[BreakingNews] CatalogRow tap:', entry.ticker, 'disabled?', disabled);
    if (!disabled) onPick();
  };

  // Stagger first 8 rows for the lovely cascade reveal; remaining rows pop in
  // immediately so a long scroll doesn't feel laggy.
  const delay = index < 8 ? index * 32 : 0;

  return (
    <Animated.View
      entering={FadeInDown.duration(200).delay(delay)}
      style={animatedStyle}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={() => {
          if (disabled) return;
          scale.value = withSpring(0.97, { damping: 18, stiffness: 320 });
          bgOpacity.value = withTiming(1, { duration: 80 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 18, stiffness: 320 });
          bgOpacity.value = withTiming(0, { duration: 160 });
        }}
        style={[styles.row, disabled && styles.rowDisabled]}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        accessibilityLabel={`${entry.nameHe} (${entry.ticker})`}
      >
        {/* Animated press overlay — soft red wash on tap to signal action. */}
        <Animated.View style={[styles.rowPressOverlay, pressOverlayStyle]} pointerEvents="none" />

        <View style={styles.tickerBadge}>
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
            <Check size={11} color="#15803d" strokeWidth={3} />
            <Text style={styles.alreadyText} allowFontScaling={false}>במעקב</Text>
          </View>
        ) : (
          <View style={styles.addChip}>
            <TrendingUp size={13} color={ACCENT_RED} strokeWidth={2.6} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

/* ─────────────── Free-text "raw add" row ─────────────── */

function RawAddRow({
  ticker,
  onPick,
}: {
  ticker: string;
  onPick: () => void;
}): React.ReactElement {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      style={animatedStyle}
    >
      <Pressable
        onPress={onPick}
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 18, stiffness: 320 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 18, stiffness: 320 }); }}
        accessibilityRole="button"
        accessibilityLabel={`הוסף סימול ${ticker}`}
      >
        <LinearGradient
          colors={['#fee2e2', '#fef3c7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.rawRow}
        >
          <View style={styles.rawIconWrap}>
            <Sparkles size={18} color="#ffffff" strokeWidth={2.6} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rawTitle} allowFontScaling={false}>
              הוסף "{ticker}" כסימול חופשי
            </Text>
            <Text style={styles.rawSub} allowFontScaling={false}>
              ננסה למצוא לך חדשות גם אם הסימול לא ברשימה
            </Text>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

/* ─────────────── Styles ─────────────── */

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 1000,
    ...(Platform.OS === 'web' ? { position: 'fixed' as 'absolute' } : {}),
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.6)',
    zIndex: 0,
  },
  sheet: {
    position: 'relative',
    zIndex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 24,
    overflow: 'hidden',
  },

  /* Hero header (gradient) */
  heroGradient: {
    paddingTop: 8,
    paddingBottom: 18,
    paddingHorizontal: 18,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.55)',
    marginBottom: 14,
  },
  heroRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  heroIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    writingDirection: 'rtl',
    textAlign: 'right',
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.88)',
    writingDirection: 'rtl',
    textAlign: 'right',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  /* Body */
  body: {
    paddingHorizontal: 16,
    paddingTop: 12,
    flexShrink: 1,
  },
  searchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  searchRowFocused: {
    backgroundColor: '#fef2f2',
    borderColor: ACCENT_RED,
    shadowColor: ACCENT_RED,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
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
  clearBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* List */
  list: {
    flexShrink: 1,
  },
  listContent: {
    paddingTop: 10,
    paddingBottom: 16,
    gap: 8,
  },

  /* Empty state */
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 12,
    fontWeight: '500',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
    textAlign: 'center',
  },

  /* Catalog row */
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  rowDisabled: {
    backgroundColor: '#f8fafc',
    opacity: 0.7,
  },
  rowPressOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fee2e2',
    borderRadius: 16,
  },
  tickerBadge: {
    minWidth: 78,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#0f172a',
  },
  ticker: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  exchange: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
    marginTop: 1,
    letterSpacing: 0.4,
  },
  nameCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  nameHe: {
    fontSize: 15,
    fontWeight: '800',
    color: STITCH.onSurface,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  nameEn: {
    fontSize: 11,
    fontWeight: '500',
    color: STITCH.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
  },
  alreadyChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  alreadyText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#15803d',
    writingDirection: 'rtl',
  },
  addChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Raw add (free-text) row */
  rawRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginTop: 4,
    borderWidth: 1.5,
    borderColor: '#fca5a5',
  },
  rawIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ACCENT_RED,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT_RED,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  rawTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#7f1d1d',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  rawSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9a3412',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 2,
  },
});
