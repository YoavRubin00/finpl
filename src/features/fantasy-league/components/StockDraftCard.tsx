import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { CLASH } from '../../../constants/theme';
import type { DraftStock } from '../fantasyTypes';

interface Props {
  stock: DraftStock;
  isPicked: boolean;
  onPick: () => void;
  onAnalysis: () => void;
}

export function StockDraftCard({ stock, isPicked, onPick, onAnalysis }: Props): React.ReactElement {
  const changePositive = stock.mockWeeklyChange >= 0;

  return (
    <Pressable
      onPress={onPick}
      accessibilityRole="button"
      accessibilityLabel={`${stock.name} ${stock.ticker} — ${isPicked ? 'נבחרה' : 'לא נבחרה'}`}
      accessibilityState={{ selected: isPicked }}
      style={({ pressed }) => ({
        flex: 1,
        margin: 5,
        borderRadius: 16,
        borderWidth: isPicked ? 2 : 1,
        borderColor: isPicked ? CLASH.goldBorder : 'rgba(255,255,255,0.12)',
        backgroundColor: isPicked
          ? 'rgba(212,160,23,0.12)'
          : pressed
          ? 'rgba(255,255,255,0.07)'
          : 'rgba(255,255,255,0.04)',
        overflow: 'hidden',
        shadowColor: isPicked ? CLASH.goldGlow : 'transparent',
        shadowOpacity: isPicked ? 1 : 0,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
        elevation: isPicked ? 6 : 1,
      })}
    >
      {/* Picked overlay indicator */}
      {isPicked && (
        <View
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: CLASH.goldBorder,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '900', color: '#000' }}>✓</Text>
        </View>
      )}

      <View style={{ padding: 12, gap: 6 }}>
        {/* Ticker badge */}
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <View
            style={{
              backgroundColor: 'rgba(212,160,23,0.18)',
              borderRadius: 6,
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderWidth: 1,
              borderColor: CLASH.goldBorder + '50',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '900', color: CLASH.goldLight }}>
              {stock.ticker}
            </Text>
          </View>
          {/* Weekly change chip */}
          <View
            style={{
              backgroundColor: changePositive ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
              borderRadius: 6,
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '800',
                color: changePositive ? '#4ade80' : '#f87171',
              }}
            >
              {changePositive ? '+' : ''}{stock.mockWeeklyChange}%
            </Text>
          </View>
        </View>

        {/* Company name */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: '800',
            color: '#ffffff',
            writingDirection: 'rtl',
            textAlign: 'right',
          }}
          numberOfLines={1}
        >
          {stock.name}
        </Text>

        {/* Tagline */}
        <Text
          style={{
            fontSize: 10,
            color: 'rgba(255,255,255,0.5)',
            writingDirection: 'rtl',
            textAlign: 'right',
          }}
          numberOfLines={1}
        >
          {stock.tagline}
        </Text>

        {/* Price */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: '700',
            color: 'rgba(255,255,255,0.85)',
            writingDirection: 'rtl',
            textAlign: 'right',
          }}
        >
          ${stock.mockPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}
        </Text>

        {/* Shark analysis button */}
        <Pressable
          onPress={(e) => { e.stopPropagation?.(); onAnalysis(); }}
          style={({ pressed }) => ({
            flexDirection: 'row-reverse',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            backgroundColor: pressed ? 'rgba(56,189,248,0.2)' : 'rgba(56,189,248,0.1)',
            borderRadius: 8,
            paddingVertical: 7,
            borderWidth: 1,
            borderColor: 'rgba(56,189,248,0.25)',
            marginTop: 4,
          })}
          accessibilityRole="button"
          accessibilityLabel={`ניתוח קפטן שארק על ${stock.name}`}
        >
          <Text style={{ fontSize: 11 }}>🦈</Text>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#7dd3fc' }}>
            ניתוח הכריש
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}