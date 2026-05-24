import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { F2_SECTORS, FANTASY, type FantasySectorId } from '../../../constants/theme';
import { F2TickerTile } from '../v2/icons';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const NUM_STYLE = { fontVariant: ['tabular-nums' as const] };

interface Props {
  ticker: string;
  name: string;
  sector: FantasySectorId;
  allocation: number;
  poolMax: number;
  poolRemaining: number;
  isCaptain: boolean;
  isVice: boolean;
  step?: number;
  onAllocationChange: (amount: number) => void;
  onToggleCaptain: () => void;
  onToggleVice: () => void;
}

/**
 * Row for the "הבחירות שלך" screen — single pick with allocation drag bar
 * plus two leverage toggles (×2 captain + ×1.5 vice). Captain/Vice are
 * mutually exclusive per stock; the store handles cross-clearing so the
 * other pill on this same row visually depresses when toggled here.
 *
 * Allocation drag math mirrors `F2PickAllocationRow`: RTL fill from right
 * (0) → left (poolMax), snapped to `step` (default = 5% of pool rounded to
 * nearest 10 coins).
 */
export function YourPicksRow({
  ticker,
  name,
  sector,
  allocation,
  poolMax,
  poolRemaining,
  isCaptain,
  isVice,
  step,
  onAllocationChange,
  onToggleCaptain,
  onToggleVice,
}: Props): React.ReactElement {
  const s = F2_SECTORS[sector];
  const stp = step ?? Math.max(10, Math.round((poolMax * 0.05) / 10) * 10);
  const pct = poolMax > 0 ? Math.round((allocation / poolMax) * 100) : 0;
  const canDec = allocation > 0;
  const canInc = poolRemaining > 0;

  const [barWidth, setBarWidth] = useState(0);
  const stateRef = useRef({ allocation, poolMax, poolRemaining, stp });
  stateRef.current = { allocation, poolMax, poolRemaining, stp };
  const barWidthRef = useRef(0);
  barWidthRef.current = barWidth;

  const computeFromTouchX = (touchX: number): number => {
    const { poolMax: pm, allocation: alloc, poolRemaining: rem, stp: step } = stateRef.current;
    const w = barWidthRef.current;
    if (w <= 0 || pm <= 0) return alloc;
    const filledPx = Math.max(0, Math.min(w, w - touchX));
    const ratio = filledPx / w;
    const raw = Math.round(ratio * pm);
    const snapped = Math.round(raw / step) * step;
    const maxAllowed = alloc + rem;
    return Math.max(0, Math.min(maxAllowed, snapped));
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          const next = computeFromTouchX(e.nativeEvent.locationX);
          if (next !== stateRef.current.allocation) onAllocationChange(next);
        },
        onPanResponderMove: (e) => {
          const next = computeFromTouchX(e.nativeEvent.locationX);
          if (next !== stateRef.current.allocation) onAllocationChange(next);
        },
      }),
    [onAllocationChange],
  );

  const fillColor = isCaptain ? '#f59e0b' : isVice ? '#94a3b8' : s.color;
  const fillColorLight = isCaptain ? '#fbbf24' : isVice ? '#cbd5e1' : s.g1;

  return (
    <View
      style={{
        backgroundColor: isCaptain ? '#fffbeb' : isVice ? '#f8fafc' : FANTASY.surfaceCard,
        borderRadius: 14,
        borderWidth: isCaptain || isVice ? 2 : 1,
        borderColor: isCaptain ? '#facc15' : isVice ? '#cbd5e1' : FANTASY.border,
        paddingVertical: 11,
        paddingHorizontal: 11,
        shadowColor: isCaptain ? '#facc15' : isVice ? '#94a3b8' : '#0f172a',
        shadowOpacity: isCaptain ? 0.3 : isVice ? 0.15 : 0.04,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: isCaptain ? 14 : isVice ? 8 : 2,
        elevation: isCaptain ? 5 : isVice ? 3 : 1,
        gap: 10,
      }}
    >
      {/* Top row: ticker + name + leverage pills */}
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
        <F2TickerTile ticker={ticker} sector={sector} size={36} radius={9} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{ fontSize: 12, fontWeight: '900', color: FANTASY.ink, ...RTL }}
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text style={{ fontSize: 9, fontWeight: '800', color: s.color, marginTop: 2 }}>
            {s.short}
          </Text>
        </View>

        <LeveragePill
          active={isCaptain}
          label="×2"
          activeGradient={['#fde047', '#f59e0b', '#b45309']}
          activeBorder="#78350f"
          activeText="#451a03"
          idleBorder="#fcd34d"
          idleStrong="#f59e0b"
          idleBg="#fffdf5"
          idleText="#92400e"
          onPress={onToggleCaptain}
          accessibilityLabel={`מנף את ${name} פי 2`}
        />
        <LeveragePill
          active={isVice}
          label="×1.5"
          activeGradient={['#e2e8f0', '#cbd5e1', '#94a3b8']}
          activeBorder="#475569"
          activeText="#0f172a"
          idleBorder="#cbd5e1"
          idleStrong="#94a3b8"
          idleBg="#f8fafc"
          idleText="#475569"
          onPress={onToggleVice}
          accessibilityLabel={`מנף את ${name} פי 1.5`}
        />
      </View>

      {/* Amount + percent */}
      <View
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row-reverse', alignItems: 'baseline', gap: 4 }}>
          <Text style={[{ fontSize: 18, fontWeight: '900', color: FANTASY.ink }, NUM_STYLE]}>
            {allocation.toLocaleString('en-US')}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '700', color: FANTASY.inkMuted }}>🪙</Text>
        </View>
        <Text style={[{ fontSize: 11, fontWeight: '800', color: FANTASY.inkFaint }, NUM_STYLE]}>
          {pct}% מהקופה
        </Text>
      </View>

      {/* Stepper + drag bar */}
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
        <StepBtn
          symbol="−"
          enabled={canDec}
          onPress={() => onAllocationChange(allocation - stp)}
          accessibilityLabel="הפחת הקצאה"
        />

        <View
          {...panResponder.panHandlers}
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
          style={{ flex: 1, height: 28, justifyContent: 'center', paddingVertical: 6 }}
          accessibilityRole="adjustable"
          accessibilityLabel={`הקצאת ${name}`}
          accessibilityValue={{ min: 0, max: poolMax, now: allocation }}
        >
          <View
            style={{
              height: 16,
              backgroundColor: FANTASY.surfaceMuted,
              borderRadius: 999,
              overflow: 'hidden',
              flexDirection: 'row-reverse',
              borderWidth: 1,
              borderColor: FANTASY.border,
            }}
          >
            <LinearGradient
              colors={[fillColorLight, fillColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ width: `${pct}%`, height: '100%' }}
            />
          </View>
        </View>

        <StepBtn
          symbol="+"
          enabled={canInc}
          onPress={() => onAllocationChange(allocation + stp)}
          accessibilityLabel="הוסף הקצאה"
        />
      </View>
    </View>
  );
}

// ─── internals ──────────────────────────────────────────────────────────────

function LeveragePill({
  active,
  label,
  activeGradient,
  activeBorder,
  activeText,
  idleBorder,
  idleStrong,
  idleBg,
  idleText,
  onPress,
  accessibilityLabel,
}: {
  active: boolean;
  label: string;
  activeGradient: readonly [string, string, string];
  activeBorder: string;
  activeText: string;
  idleBorder: string;
  idleStrong: string;
  idleBg: string;
  idleText: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        borderRadius: 10,
        overflow: 'hidden',
        transform: [{ scale: pressed ? 0.96 : 1 }],
        shadowColor: active ? activeBorder : 'transparent',
        shadowOpacity: active ? 0.5 : 0,
        shadowRadius: active ? 8 : 0,
        shadowOffset: { width: 0, height: 3 },
        elevation: active ? 4 : 0,
      })}
    >
      {active ? (
        <LinearGradient
          colors={activeGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderBottomWidth: 3,
            borderBottomColor: activeBorder,
          }}
        >
          <Text style={[{ fontSize: 12, fontWeight: '900', color: activeText }, NUM_STYLE]}>
            {label}
          </Text>
        </LinearGradient>
      ) : (
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 8,
            backgroundColor: idleBg,
            borderWidth: 1.5,
            borderColor: idleBorder,
            borderBottomWidth: 3,
            borderBottomColor: idleStrong,
            borderRadius: 10,
          }}
        >
          <Text style={[{ fontSize: 12, fontWeight: '900', color: idleText }, NUM_STYLE]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function StepBtn({
  symbol,
  enabled,
  onPress,
  accessibilityLabel,
}: {
  symbol: '+' | '−';
  enabled: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={enabled ? onPress : undefined}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: enabled ? '#fff' : FANTASY.surfaceLow,
        borderWidth: 1.5,
        borderColor: FANTASY.borderStrong,
        borderBottomWidth: 3,
        borderBottomColor: FANTASY.silver,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: !enabled ? 0.4 : pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ fontSize: 17, fontWeight: '900', color: FANTASY.ink, lineHeight: 17 }}>
        {symbol}
      </Text>
    </Pressable>
  );
}
