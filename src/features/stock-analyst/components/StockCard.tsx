import React from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bookmark, Sparkles, Share2 } from 'lucide-react-native';
import type { StockAnalysisQuick } from '../types';
import { RecommendationChip } from './RecommendationChip';
import { ConfidenceBar } from './ConfidenceBar';
import { SparkLine } from './SparkLine';
import { tapHaptic } from '../../../utils/haptics';
import { shareQuickAnalysis } from '../services/shareAnalysis';

interface Props {
  data: StockAnalysisQuick;
  onSaveForLater?: () => void;
  onOpenSimulator?: () => void;
}

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

/**
 * Quick analysis card — matches the mockup the user shared:
 * ticker badge + recommendation chip + price/% + sparkline + confidence bar
 * + captain's analysis note + action row + tiny legal footer.
 */
export function StockCard({ data, onSaveForLater, onOpenSimulator }: Props): React.ReactElement {
  const isUp = data.priceChangePct >= 0;
  const screenW = Dimensions.get('window').width;
  const cardInnerW = Math.min(screenW - 64, 360); // padding inside the chat feed

  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 22,
        padding: 16,
        gap: 14,
        shadowColor: '#0369a1',
        shadowOpacity: 0.18,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 5,
        borderWidth: 1,
        borderColor: '#e0f2fe',
      }}
    >
      {/* Header row: recommendation chip · price/% · ticker badge */}
      <View
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        {/* Ticker badge (rightmost in RTL) */}
        <View
          style={{
            backgroundColor: '#0f172a',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
            alignItems: 'center',
            minWidth: 70,
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 }}>
            {data.ticker}
          </Text>
          <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '600', marginTop: 2 }}>
            {data.exchange}
          </Text>
        </View>

        {/* Center: company name + price + % change */}
        <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
          <Text style={[RTL, { color: '#0f172a', fontSize: 15, fontWeight: '700' }]}>
            {data.companyName}
          </Text>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'baseline', gap: 8 }}>
            <Text style={{ color: '#0f172a', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 }}>
              ${data.price.toFixed(2)}
            </Text>
            <Text
              style={{
                color: isUp ? '#16a34a' : '#dc2626',
                fontSize: 14,
                fontWeight: '700',
              }}
            >
              {isUp ? '+' : ''}{data.priceChangePct.toFixed(2)}%
            </Text>
          </View>
        </View>

        {/* Leftmost in RTL: verdict chip */}
        <RecommendationChip verdict={data.verdict} size="sm" />
      </View>

      {/* Sparkline */}
      <View style={{ alignItems: 'center' }}>
        <SparkLine data={data.spark} width={cardInnerW} height={60} />
      </View>

      {/* Confidence */}
      <ConfidenceBar value={data.confidence} />

      {/* Captain's analysis */}
      <View
        style={{
          backgroundColor: '#f0f9ff',
          borderRadius: 14,
          padding: 12,
          borderWidth: 1,
          borderColor: '#bae6fd',
          gap: 4,
        }}
      >
        <Text style={[RTL, { color: '#0c4a6e', fontSize: 12, fontWeight: '800' }]}>
          תובנת השארק
        </Text>
        <Text style={[RTL, { color: '#0f172a', fontSize: 14, lineHeight: 22 }]}>
          {data.captainNote}
        </Text>
        {data.targetNote ? (
          <Text style={[RTL, { color: '#0369a1', fontSize: 13, marginTop: 4 }]}>
            {data.targetNote}
          </Text>
        ) : null}
      </View>

      {/* Action row */}
      <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
        <Pressable
          onPress={() => {
            tapHaptic();
            onOpenSimulator?.();
          }}
          accessibilityRole="button"
          accessibilityLabel="פתח בסימולטור"
          style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}
        >
          <LinearGradient
            colors={['#0ea5e9', '#0369a1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              flexDirection: 'row-reverse',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 12,
            }}
          >
            <Sparkles size={16} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>סימולטור</Text>
          </LinearGradient>
        </Pressable>
        <Pressable
          onPress={() => {
            tapHaptic();
            void shareQuickAnalysis(data);
          }}
          accessibilityRole="button"
          accessibilityLabel="שתף ניתוח"
          style={{
            backgroundColor: '#0f172a',
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 14,
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Share2 size={15} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>שתף</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            tapHaptic();
            onSaveForLater?.();
          }}
          accessibilityRole="button"
          accessibilityLabel="שמור לאחר"
          style={{
            backgroundColor: '#f1f5f9',
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 14,
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 6,
            borderWidth: 1,
            borderColor: '#e2e8f0',
          }}
        >
          <Bookmark size={15} color="#475569" />
          <Text style={{ color: '#475569', fontWeight: '700', fontSize: 13 }}>שמור</Text>
        </Pressable>
      </View>

      {/* Legal footer */}
      <Text style={[RTL, { color: '#94a3b8', fontSize: 10, fontWeight: '600' }]}>
        תובנה חינוכית בלבד · לא ייעוץ השקעות
      </Text>
    </View>
  );
}
