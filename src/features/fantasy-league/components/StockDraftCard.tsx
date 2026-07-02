import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LUXE } from '../../../constants/theme';
import { FINN_TABLET } from '../../retention-loops/finnMascotConfig';
import { GoldCoinIcon } from '../../../components/ui/GoldCoinIcon';
import type { DraftStock } from '../fantasyTypes';

interface Props {
  stock: DraftStock;
  isPicked: boolean;
  onPick: () => void;
  onAnalysis: () => void;
}

function formatPriceAmount(price: number): string {
  return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
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
        borderColor: isPicked ? LUXE.gold : LUXE.borderSubtle,
        backgroundColor: isPicked
          ? 'rgba(251,191,36,0.12)'
          : pressed
          ? LUXE.surfaceCardHi
          : LUXE.surfaceCard,
        overflow: 'hidden',
        shadowColor: isPicked ? LUXE.gold : 'transparent',
        shadowOpacity: isPicked ? 0.45 : 0,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
        elevation: isPicked ? 8 : 1,
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
            backgroundColor: LUXE.gold,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '900', color: LUXE.textOnGold }}>✓</Text>
        </View>
      )}

      <View style={{ padding: 12, gap: 6 }}>
        {/* Ticker badge */}
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <View
            style={{
              backgroundColor: 'rgba(251,191,36,0.18)',
              borderRadius: 6,
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderWidth: 1,
              borderColor: 'rgba(251,191,36,0.45)',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '900', color: LUXE.goldLight }}>
              {stock.ticker}
            </Text>
          </View>
          {/* Weekly change chip */}
          <View
            style={{
              backgroundColor: changePositive ? LUXE.positiveTint : LUXE.negativeTint,
              borderRadius: 6,
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '800',
                color: changePositive ? LUXE.positive : LUXE.negative,
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
            color: LUXE.textPrimary,
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
            color: LUXE.textFaint,
            writingDirection: 'rtl',
            textAlign: 'right',
          }}
          numberOfLines={1}
        >
          {stock.tagline}
        </Text>

        {/* Price — in-game coins */}
        <View
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 4,
            alignSelf: 'flex-start',
          }}
        >
          <GoldCoinIcon size={14} />
          <Text
            style={{
              fontSize: 13,
              fontWeight: '700',
              color: 'rgba(255,255,255,0.85)',
              writingDirection: 'rtl',
              textAlign: 'right',
            }}
          >
            {formatPriceAmount(stock.mockPrice)}
          </Text>
        </View>

        {/* Shark analysis button */}
        <Pressable
          onPress={(e) => { e.stopPropagation?.(); onAnalysis(); }}
          style={({ pressed }) => ({
            flexDirection: 'row-reverse',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            backgroundColor: pressed ? 'rgba(125,211,252,0.22)' : 'rgba(125,211,252,0.10)',
            borderRadius: 8,
            paddingVertical: 7,
            borderWidth: 1,
            borderColor: 'rgba(125,211,252,0.32)',
            marginTop: 4,
          })}
          accessibilityRole="button"
          accessibilityLabel={`ניתוח קפטן שארק על ${stock.name}`}
        >
          <ExpoImage
            source={FINN_TABLET}
            style={{ width: 16, height: 16 }}
            contentFit="contain"
            accessible={false}
          />
          <Text style={{ fontSize: 11, fontWeight: '700', color: LUXE.blueLight }}>
            ניתוח הכריש
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
