import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Plus, Minus, Check, Wand2, Trash2, EyeOff } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { F2_SECTORS, type FantasySectorId } from '../../constants/theme';
import { PORTFOLIO_BUILDER_CATEGORIES } from '../fantasy-league/fantasyData';
import { useLiveReturnsStore } from '../fantasy-league/useLiveReturnsStore';
import { tapHaptic, successHaptic, mediumHaptic } from '../../utils/haptics';
import type { SharedPick } from './portfolioShareTypes';
import { importPortfolioFromScreenshot } from './importFromScreenshot';
import {
  MIN_PICKS,
  MAX_PICKS,
  ALLOCATION_STEP,
  MAX_CAPTION_LENGTH,
  SHARE_REWARD_COINS,
} from './portfolioShareData';

const TEXT_PRIMARY = '#1f2937';
const TEXT_MUTED = '#6b7280';
const FEED_BG = '#f3f4f6';
const NUM_STYLE = { fontVariant: ['tabular-nums' as const] };
const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

// Honest-data rule: DraftPick carries NO weeklyChange — weekly % comes only
// from the live returns store (real Yahoo data) at render/share time, never
// from the stale mockWeeklyChange constants in fantasyData.
interface DraftPick {
  ticker: string;
  name: string;
  sector: FantasySectorId;
  allocationPct: number;
}

interface PortfolioComposerModalProps {
  visible: boolean;
  onClose: () => void;
  onShare: (picks: SharedPick[], caption: string, isAnonymous: boolean) => void;
}

function sectorColor(sector: FantasySectorId): string {
  return (F2_SECTORS[sector] ?? F2_SECTORS.tech).g1;
}

/** Stacked 0→100% allocation bar — the heartbeat of the composer. */
function AllocationBar({ picks }: { picks: DraftPick[] }): React.ReactElement {
  const total = picks.reduce((sum, p) => sum + p.allocationPct, 0);
  const complete = total === 100;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row-reverse', alignItems: 'baseline', gap: 6 }}>
        <Text
          style={[
            { fontSize: 24, fontWeight: '900', color: complete ? '#16a34a' : total > 100 ? '#dc2626' : TEXT_PRIMARY },
            NUM_STYLE,
          ]}
        >
          {total}%
        </Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT_MUTED }}>מתוך 100%</Text>
        {complete && (
          <Animated.View entering={FadeIn.duration(200)} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 3 }}>
            <Check size={14} color="#16a34a" strokeWidth={3} />
            <Text style={{ fontSize: 12, fontWeight: '900', color: '#16a34a' }}>תיק מאוזן</Text>
          </Animated.View>
        )}
      </View>
      <View
        style={{
          height: 18,
          borderRadius: 9,
          backgroundColor: '#e5e7eb',
          overflow: 'hidden',
          flexDirection: 'row-reverse',
          borderWidth: total > 100 ? 1.5 : 0,
          borderColor: '#dc2626',
        }}
      >
        {picks.map((p) => (
          <View
            key={p.ticker}
            style={{
              width: `${Math.min(p.allocationPct, 100)}%`,
              backgroundColor: sectorColor(p.sector),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {p.allocationPct >= 12 && (
              <Text style={{ fontSize: 8, fontWeight: '900', color: '#ffffff' }} numberOfLines={1}>
                {p.ticker}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

export function PortfolioComposerModal({
  visible,
  onClose,
  onShare,
}: PortfolioComposerModalProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [caption, setCaption] = useState('');
  const [customTicker, setCustomTicker] = useState('');
  // Anonymous share (Yoav 2026-07-07): post to the community feed without a
  // name/avatar — the server masks the author for everyone.
  const [anonymous, setAnonymous] = useState(false);

  // Live weekly returns (real market data). Where a ticker has no live value
  // yet, the % is simply hidden — never a fabricated constant.
  const liveReturns = useLiveReturnsStore((s) => s.returns);
  const refreshLiveReturns = useLiveReturnsStore((s) => s.refresh);
  useEffect(() => {
    if (!visible) return;
    const universe = PORTFOLIO_BUILDER_CATEGORIES.flatMap((cat) =>
      cat.stocks.map((stock) => stock.ticker),
    );
    void refreshLiveReturns(universe);
  }, [visible, refreshLiveReturns]);

  const total = useMemo(() => picks.reduce((sum, p) => sum + p.allocationPct, 0), [picks]);
  const canShare = total === 100 && picks.length >= MIN_PICKS;

  const reset = useCallback(() => {
    setPicks([]);
    setCaption('');
    setAnonymous(false);
  }, []);

  // ── Screenshot import (Yoav 11.7) ──
  const [importing, setImporting] = useState(false);
  const handleImportScreenshot = useCallback(async () => {
    if (importing) return;
    tapHaptic();
    setImporting(true);
    try {
      const result = await importPortfolioFromScreenshot();
      if (result.status === 'ok') {
        // Cap to the composer max and re-normalize so the gauge lands on 100.
        const sliced = result.picks.slice(0, MAX_PICKS);
        const total = sliced.reduce((s, p) => s + p.allocationPct, 0);
        const normalized = sliced.map((p, i) => {
          const pct = Math.max(1, Math.round((p.allocationPct / Math.max(1, total)) * 100));
          return { ticker: p.ticker, name: p.name, sector: p.sector, allocationPct: pct, __i: i };
        });
        const drift = 100 - normalized.reduce((s, p) => s + p.allocationPct, 0);
        if (drift !== 0 && normalized.length > 0) {
          const biggest = normalized.reduce((a, b) => (b.allocationPct > a.allocationPct ? b : a), normalized[0]);
          biggest.allocationPct = Math.max(1, biggest.allocationPct + drift);
        }
        successHaptic();
        setPicks(normalized.map(({ __i, ...p }) => p));
        if (result.broker) setCaption((c) => c || `התיק האמיתי שלי (${result.broker}) 📈`);
      } else if (result.status === 'empty') {
        Alert.alert('לא זוהה תיק בצילום', 'ודאו שהצילום מציג את רשימת ההחזקות באפליקציית ההשקעות, ונסו שוב.');
      } else if (result.status === 'error') {
        Alert.alert('הייבוא נכשל', 'משהו השתבש בפענוח. נסו צילום חד יותר, או בנו את התיק ידנית.');
      }
    } finally {
      setImporting(false);
    }
  }, [importing]);

  const handleClose = (): void => {
    reset();
    onClose();
  };

  const togglePick = (ticker: string, name: string, sector: FantasySectorId): void => {
    tapHaptic();
    setPicks((prev) => {
      const exists = prev.find((p) => p.ticker === ticker);
      if (exists) return prev.filter((p) => p.ticker !== ticker);
      if (prev.length >= MAX_PICKS) return prev;
      // Default allocation: whatever is left, capped at 25, floored at 5.
      const used = prev.reduce((sum, p) => sum + p.allocationPct, 0);
      const suggested = Math.max(ALLOCATION_STEP, Math.min(25, 100 - used));
      return [...prev, { ticker, name, sector, allocationPct: suggested }];
    });
  };

  // ── Free-form "build your own" pick: user types a ticker we don't curate ──
  const normalizedCustom = customTicker.trim().toUpperCase();
  const canAddCustom =
    normalizedCustom.length > 0 &&
    normalizedCustom.length <= 6 &&
    picks.length < MAX_PICKS &&
    !picks.some((p) => p.ticker === normalizedCustom);

  const addCustomTicker = (): void => {
    if (!canAddCustom) return;
    tapHaptic();
    setPicks((prev) => {
      if (prev.length >= MAX_PICKS) return prev;
      if (prev.some((p) => p.ticker === normalizedCustom)) return prev;
      // name = the ticker (no fabricated company name); neutral 'tech' sector;
      // same default-allocation logic as togglePick. Weekly % comes from the
      // live store if/when it knows this ticker.
      const used = prev.reduce((sum, p) => sum + p.allocationPct, 0);
      const suggested = Math.max(ALLOCATION_STEP, Math.min(25, 100 - used));
      return [
        ...prev,
        { ticker: normalizedCustom, name: normalizedCustom, sector: 'tech', allocationPct: suggested },
      ];
    });
    setCustomTicker('');
  };

  const bump = (ticker: string, delta: number): void => {
    tapHaptic();
    setPicks((prev) =>
      prev.map((p) =>
        p.ticker === ticker
          ? { ...p, allocationPct: Math.max(ALLOCATION_STEP, Math.min(95, p.allocationPct + delta)) }
          : p,
      ),
    );
  };

  const removePick = (ticker: string): void => {
    tapHaptic();
    setPicks((prev) => prev.filter((p) => p.ticker !== ticker));
  };

  /** Equal split across current picks, in 5% steps, remainder to the first pick. */
  const autoBalance = (): void => {
    if (picks.length === 0) return;
    mediumHaptic();
    setPicks((prev) => {
      const base = Math.floor(100 / prev.length / ALLOCATION_STEP) * ALLOCATION_STEP;
      const remainder = 100 - base * prev.length;
      return prev.map((p, i) => ({ ...p, allocationPct: base + (i === 0 ? remainder : 0) }));
    });
  };

  const handleShare = (): void => {
    if (!canShare) return;
    successHaptic();
    onShare(
      picks.map((p) => ({
        ticker: p.ticker,
        sector: p.sector,
        // Honest "unknown until measured" — the composer no longer carries the
        // stale hardcoded mockWeeklyChange (2026-07-03 audit); 0 renders as no
        // % pill on the shared card, never as a fabricated live move.
        weeklyChange: 0,
        allocationPct: p.allocationPct,
      })),
      caption,
      anonymous,
    );
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top']}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#e5e7eb',
          }}
        >
          <Pressable onPress={handleClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="חזרה">
            <ChevronRight size={26} color={TEXT_PRIMARY} strokeWidth={2.4} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '900', color: TEXT_PRIMARY, ...RTL }}>
              בונה התיקים
            </Text>
            <Text style={{ fontSize: 11, color: TEXT_MUTED, ...RTL }}>
              בחרו מניות, חלקו אחוזים — עד 100% בדיוק
            </Text>
          </View>
          <Image
            source={require('../../../assets/webp/fin-standard.webp')}
            style={{ width: 34, height: 34 }}
            resizeMode="contain"
          />
        </View>

        {/* Sticky allocation gauge */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fafafa', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
          <AllocationBar picks={picks} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {/* Screenshot import (Yoav 11.7): pull the user's REAL portfolio from
              a screenshot of their investing app. The picks land in the editor
              below for mandatory review — nothing shares automatically. */}
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <Pressable
              onPress={handleImportScreenshot}
              disabled={importing}
              accessibilityRole="button"
              accessibilityLabel="ייבוא תיק מצילום מסך"
              style={{
                flexDirection: 'row-reverse',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 12,
                borderRadius: 14,
                backgroundColor: importing ? '#e0f2fe' : '#f0f9ff',
                borderWidth: 1.5,
                borderColor: '#7dd3fc',
                borderStyle: 'dashed',
              }}
            >
              {importing ? (
                <ActivityIndicator size="small" color="#0284c7" />
              ) : (
                <Text style={{ fontSize: 16 }} allowFontScaling={false}>📸</Text>
              )}
              <Text style={{ fontSize: 14, fontWeight: '900', color: '#0369a1', ...RTL }} allowFontScaling={false}>
                {importing ? 'שארק מפענח את הצילום…' : 'ייבאו את התיק האמיתי מצילום מסך'}
              </Text>
            </Pressable>
            <Text style={{ fontSize: 10.5, color: TEXT_MUTED, marginTop: 5, ...RTL, textAlign: 'center' }} allowFontScaling={false}>
              רק אחוזים וסימבולים נקראים — בלי סכומים ובלי פרטי חשבון
            </Text>
          </View>

          {/* Selected picks — allocation editing */}
          {picks.length > 0 && (
            <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 8 }}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                <Text style={{ flex: 1, fontSize: 13, fontWeight: '900', color: TEXT_PRIMARY, ...RTL }}>
                  ההחזקות שלכם ({picks.length}/{MAX_PICKS})
                </Text>
                <Pressable
                  onPress={autoBalance}
                  accessibilityRole="button"
                  accessibilityLabel="חלוקה שווה"
                  style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: '#ede9fe', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}
                >
                  <Wand2 size={12} color="#7c3aed" strokeWidth={2.4} />
                  <Text style={{ fontSize: 11, fontWeight: '900', color: '#7c3aed' }}>חלוקה שווה</Text>
                </Pressable>
              </View>

              {picks.map((p) => {
                const sector = F2_SECTORS[p.sector] ?? F2_SECTORS.tech;
                return (
                  <Animated.View
                    key={p.ticker}
                    entering={FadeInDown.duration(200)}
                    style={{
                      flexDirection: 'row-reverse',
                      alignItems: 'center',
                      gap: 10,
                      backgroundColor: '#ffffff',
                      borderWidth: 1,
                      borderColor: '#e5e7eb',
                      borderRadius: 14,
                      padding: 10,
                    }}
                  >
                    <LinearGradient
                      colors={[sector.g1, sector.g2]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '900', color: '#ffffff' }}>{p.ticker}</Text>
                    </LinearGradient>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '800', color: TEXT_PRIMARY, ...RTL }}>
                        {p.name}
                      </Text>
                      {/* No weekly-% here — the old hardcoded mockWeeklyChange was
                          months-stale data presented as live (2026-07-03 audit). */}
                    </View>

                    {/* Stepper */}
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                      <Pressable
                        onPress={() => bump(p.ticker, ALLOCATION_STEP)}
                        hitSlop={6}
                        accessibilityRole="button"
                        accessibilityLabel={`הגדלת ${p.ticker}`}
                        style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Plus size={16} color="#16a34a" strokeWidth={2.8} />
                      </Pressable>
                      <Text style={[{ fontSize: 16, fontWeight: '900', color: TEXT_PRIMARY, minWidth: 44, textAlign: 'center' }, NUM_STYLE]}>
                        {p.allocationPct}%
                      </Text>
                      <Pressable
                        onPress={() => bump(p.ticker, -ALLOCATION_STEP)}
                        hitSlop={6}
                        accessibilityRole="button"
                        accessibilityLabel={`הקטנת ${p.ticker}`}
                        style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Minus size={16} color="#dc2626" strokeWidth={2.8} />
                      </Pressable>
                    </View>

                    <Pressable onPress={() => removePick(p.ticker)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`הסרת ${p.ticker}`}>
                      <Trash2 size={16} color="#9ca3af" strokeWidth={2.2} />
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          )}

          {/* Stock universe — grouped by category */}
          <View style={{ paddingTop: 16, gap: 14 }}>
            {PORTFOLIO_BUILDER_CATEGORIES.map((cat) => (
              <View key={cat.id} style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: TEXT_PRIMARY, ...RTL, paddingHorizontal: 16 }}>
                  {cat.emoji} {cat.label}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ flexDirection: 'row-reverse', gap: 8, paddingHorizontal: 16 }}
                >
                  {cat.stocks.map((stock) => {
                    const selected = picks.some((p) => p.ticker === stock.ticker);
                    const atCap = !selected && picks.length >= MAX_PICKS;
                    return (
                      <Pressable
                        key={stock.ticker}
                        onPress={() => togglePick(stock.ticker, stock.name, cat.id as FantasySectorId)}
                        disabled={atCap}
                        accessibilityRole="button"
                        accessibilityLabel={`${stock.name} ${selected ? 'הסרה' : 'הוספה'}`}
                        style={{
                          borderRadius: 12,
                          borderWidth: 1.5,
                          borderColor: selected ? sectorColor(cat.id as FantasySectorId) : '#e5e7eb',
                          backgroundColor: selected ? `${sectorColor(cat.id as FantasySectorId)}18` : '#ffffff',
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          alignItems: 'center',
                          gap: 2,
                          opacity: atCap ? 0.4 : 1,
                          minWidth: 86,
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '900', color: TEXT_PRIMARY }}>
                          {selected ? '✓ ' : ''}{stock.ticker}
                        </Text>
                        <Text numberOfLines={1} style={{ fontSize: 10, color: TEXT_MUTED }}>
                          {stock.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ))}
          </View>

          {/* Free-form: build your own — type any ticker (בניית תיק עצמאית) */}
          <View style={{ paddingHorizontal: 16, paddingTop: 18, gap: 8 }}>
            <View style={{ gap: 2 }}>
              <Text style={{ fontSize: 13, fontWeight: '900', color: TEXT_PRIMARY, ...RTL }}>
                בניית תיק עצמאית
              </Text>
              <Text style={{ fontSize: 11, color: TEXT_MUTED, ...RTL }}>
                כל מניה בעולם — הקלידו את הטיקר ונוסיף אותו לתיק
              </Text>
            </View>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
              <TextInput
                value={customTicker}
                onChangeText={(t) => setCustomTicker(t.toUpperCase())}
                onSubmitEditing={addCustomTicker}
                placeholder="הוסיפו טיקר משלכם, למשל AAPL"
                placeholderTextColor="#9ca3af"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={6}
                returnKeyType="done"
                accessibilityLabel="שדה הזנת טיקר"
                style={{
                  flex: 1,
                  backgroundColor: FEED_BG,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  fontSize: 14,
                  fontWeight: '800',
                  letterSpacing: 1,
                  color: TEXT_PRIMARY,
                  textAlign: 'right',
                }}
              />
              <Pressable
                onPress={addCustomTicker}
                disabled={!canAddCustom}
                accessibilityRole="button"
                accessibilityLabel="הוספת הטיקר לתיק"
                style={{
                  flexDirection: 'row-reverse',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: canAddCustom ? '#1877f2' : '#d1d5db',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 11,
                }}
              >
                <Plus size={16} color="#ffffff" strokeWidth={2.8} />
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#ffffff' }}>הוספה</Text>
              </Pressable>
            </View>
            {picks.length >= MAX_PICKS && (
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#dc2626', ...RTL }}>
                הגעתם למקסימום {MAX_PICKS} מניות
              </Text>
            )}
          </View>

          {/* Caption */}
          <View style={{ paddingHorizontal: 16, paddingTop: 18, gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '900', color: TEXT_PRIMARY, ...RTL }}>
              כמה מילים על האסטרטגיה (לא חובה)
            </Text>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="למה דווקא התיק הזה? ספרו לקהילה…"
              placeholderTextColor="#9ca3af"
              multiline
              maxLength={MAX_CAPTION_LENGTH}
              style={{
                backgroundColor: FEED_BG,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                minHeight: 64,
                fontSize: 13,
                color: TEXT_PRIMARY,
                ...RTL,
              }}
            />
          </View>

          {/* Anonymous toggle (Yoav 2026-07-07) — the whole community sees the
              feed, so give sharers a no-name option. Plain Pressable row with
              an inner-View pill (Android function-style bg bug — see memory). */}
          <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
            <Pressable
              onPress={() => { tapHaptic(); setAnonymous((v) => !v); }}
              accessibilityRole="switch"
              accessibilityState={{ checked: anonymous }}
              accessibilityLabel="שיתוף אנונימי"
            >
              <View
                style={{
                  flexDirection: 'row-reverse',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: anonymous ? '#ede9fe' : FEED_BG,
                  borderWidth: 1.5,
                  borderColor: anonymous ? '#7c3aed' : '#e5e7eb',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
              >
                <EyeOff size={18} color={anonymous ? '#7c3aed' : TEXT_MUTED} strokeWidth={2.4} />
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: anonymous ? '#7c3aed' : TEXT_PRIMARY, ...RTL }}>
                    שיתוף בעילום שם
                  </Text>
                  <Text style={{ fontSize: 11, color: TEXT_MUTED, ...RTL }}>
                    {anonymous ? 'התיק יופיע בפיד בתור "משקיע אנונימי" — בלי שם ובלי אווטאר' : 'התיק יופיע עם השם והאווטאר שלך'}
                  </Text>
                </View>
                <View
                  style={{
                    width: 44,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: anonymous ? '#7c3aed' : '#d1d5db',
                    justifyContent: 'center',
                    paddingHorizontal: 3,
                    alignItems: anonymous ? 'flex-start' : 'flex-end',
                  }}
                >
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#ffffff' }} />
                </View>
              </View>
            </Pressable>
          </View>
        </ScrollView>

        {/* Sticky share CTA */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
            padding: 14,
            paddingBottom: Math.max(insets.bottom, 16),
          }}
        >
          <Pressable
            onPress={handleShare}
            disabled={!canShare}
            accessibilityRole="button"
            accessibilityLabel="שיתוף התיק"
            style={{
              backgroundColor: canShare ? '#1877f2' : '#d1d5db',
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#ffffff' }}>
              {canShare
                ? `שתפו את התיק · +${SHARE_REWARD_COINS} מטבעות`
                : picks.length < MIN_PICKS
                  ? `בחרו לפחות ${MIN_PICKS} מניות`
                  : total < 100
                    ? `חסרים עוד ${100 - total}% לתיק מלא`
                    : `יש ${total - 100}% עודף — הורידו קצת`}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
