import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { StockHorizon } from '../types';
import { tapHaptic } from '../../../utils/haptics';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface HorizonMeta {
  label: string;
  windowLabel: string; // shown small under the active selection
  description: string; // explainer text below the selector
}

const META: Record<StockHorizon, HorizonMeta> = {
  swing: {
    label: 'סווינג',
    windowLabel: 'ימים – שבועות',
    description: 'מסחר סווינג, ימים עד שבועות. דגש על סנטימנט, מומנטום וקטליסטים קצרי טווח.',
  },
  short: {
    label: 'קצר',
    windowLabel: '1–3 חודשים',
    description: 'טווח קצר, עד 3 חודשים. שילוב של מומנטום עם אירועים פונדמנטליים קרובים (דוחות, רגולציה).',
  },
  medium: {
    label: 'בינוני',
    windowLabel: '3–12 חודשים',
    description: 'טווח בינוני, עד שנה. דגש מאוזן על רווחיות, צמיחה, וסיכון סקטוריאלי.',
  },
  long: {
    label: 'ארוך',
    windowLabel: '1–3 שנים',
    description: 'טווח ארוך, שנה עד שלוש. דגש על חפיר תחרותי (Moat), ניהול וצמיחה בת קיימא.',
  },
};

const ORDER: StockHorizon[] = ['swing', 'short', 'medium', 'long'];

interface Props {
  value: StockHorizon;
  onChange: (h: StockHorizon) => void;
}

export function HorizonSelector({ value, onChange }: Props): React.ReactElement {
  return (
    <View style={{ gap: 6 }}>
      <View
        style={{
          flexDirection: 'row-reverse',
          backgroundColor: '#f1f5f9',
          borderRadius: 10,
          padding: 3,
          gap: 3,
        }}
      >
        {ORDER.map((h) => {
          const active = h === value;
          const meta = META[h];
          return (
            <Pressable
              key={h}
              onPress={() => {
                if (h !== value) {
                  tapHaptic();
                  onChange(h);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={`${meta.label} (${meta.windowLabel})`}
              style={{
                flex: 1,
                backgroundColor: active ? '#0f172a' : 'transparent',
                borderRadius: 8,
                paddingVertical: 7,
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: active ? '800' : '700',
                  color: active ? '#ffffff' : '#475569',
                  writingDirection: 'rtl',
                }}
              >
                {meta.label}
              </Text>
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: '600',
                  color: active ? '#94a3b8' : '#94a3b8',
                  writingDirection: 'rtl',
                }}
              >
                {meta.windowLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text
        style={[
          RTL,
          { fontSize: 11, color: '#64748b', lineHeight: 16, paddingHorizontal: 4 },
        ]}
      >
        {META[value].description}
      </Text>
    </View>
  );
}
