import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Text, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FANTASY } from '../../../constants/theme';
import type { StockCategoryId, StockCategory } from '../fantasyTypes';

interface Props {
  categories: StockCategory[];
  activeId: StockCategoryId;
  pickedCategories: StockCategoryId[];
  onSelect: (id: StockCategoryId) => void;
}

// Each category gets a distinct, vivid palette so the bar reads at a glance.
const TAB_PALETTE: Record<
  StockCategoryId,
  {
    /** Active gradient (top → bottom). */
    g1: string;
    g2: string;
    /** Strong line color used for active border/shadow & inactive accent. */
    color: string;
    /** Soft tinted background for the inactive state. */
    bg: string;
    /** Inactive border. */
    border: string;
  }
> = {
  tech:        { g1: '#60a5fa', g2: '#1d4ed8', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' }, // electric blue
  spec_growth: { g1: '#c084fc', g2: '#7c3aed', color: '#9333ea', bg: '#faf5ff', border: '#e9d5ff' }, // violet
  energy:      { g1: '#fbbf24', g2: '#b45309', color: '#d97706', bg: '#fffbeb', border: '#fde68a' }, // gold (ערך)
  israel:      { g1: '#38bdf8', g2: '#0369a1', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' }, // sky cyan
  crypto:      { g1: '#fb923c', g2: '#c2410c', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' }, // bitcoin orange
  hype:        { g1: '#fb7185', g2: '#be123c', color: '#e11d48', bg: '#fff1f2', border: '#fecdd3' }, // hype rose-red
};

export function DraftCategoryTabs({ categories, activeId, pickedCategories, onSelect }: Props): React.ReactElement {
  // Items use row-reverse so item[0] sits at the visual right (Hebrew RTL).
  // We measure each tab's layout and auto-scroll so the *active* tab is always
  // centered — solves the "I can't reach crypto" problem.
  const scrollRef = useRef<ScrollView>(null);
  const [layouts, setLayouts] = useState<Record<string, { x: number; width: number }>>({});
  const viewportWidth = Dimensions.get('window').width;

  useEffect(() => {
    const layout = layouts[activeId];
    if (!layout || !scrollRef.current) return;
    const target = Math.max(0, layout.x - viewportWidth / 2 + layout.width / 2);
    scrollRef.current.scrollTo({ x: target, animated: true });
  }, [activeId, layouts, viewportWidth]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onContentSizeChange={() => {
        const layout = layouts[activeId];
        if (layout) {
          const target = Math.max(0, layout.x - viewportWidth / 2 + layout.width / 2);
          scrollRef.current?.scrollTo({ x: target, animated: false });
        } else {
          scrollRef.current?.scrollToEnd({ animated: false });
        }
      }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 8,
        flexDirection: 'row-reverse',
      }}
    >
      {categories.map((cat) => {
        const isActive = cat.id === activeId;
        const isPicked = pickedCategories.includes(cat.id);
        const palette = TAB_PALETTE[cat.id];

        return (
          <Pressable
            key={cat.id}
            onPress={() => onSelect(cat.id)}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              setLayouts((prev) => {
                const cur = prev[cat.id];
                if (cur && Math.abs(cur.x - x) < 1 && Math.abs(cur.width - width) < 1) return prev;
                return { ...prev, [cat.id]: { x, width } };
              });
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={cat.label}
            style={({ pressed }) => ({
              opacity: pressed ? 0.92 : 1,
              borderRadius: 22,
              shadowColor: isActive ? palette.color : 'transparent',
              shadowOpacity: isActive ? 0.35 : 0,
              shadowRadius: isActive ? 10 : 0,
              shadowOffset: { width: 0, height: 4 },
              elevation: isActive ? 6 : 0,
            })}
          >
            {isActive ? (
              <LinearGradient
                colors={[palette.g1, palette.g2]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{
                  flexDirection: 'row-reverse',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderRadius: 22,
                  borderWidth: 1.5,
                  borderColor: '#ffffff',
                  borderBottomWidth: 3,
                  borderBottomColor: palette.g2,
                }}
              >
                <Text style={{ fontSize: 16, color: '#fff' }}>{cat.emoji}</Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '900',
                    color: '#ffffff',
                    writingDirection: 'rtl',
                    letterSpacing: 0.2,
                  }}
                >
                  {cat.label}
                </Text>
                {isPicked && (
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: '#ffffff',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: palette.color,
                    }}
                  >
                    <Text style={{ fontSize: 9, fontWeight: '900', color: palette.color }}>✓</Text>
                  </View>
                )}
              </LinearGradient>
            ) : (
              <View
                style={{
                  flexDirection: 'row-reverse',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderRadius: 22,
                  borderWidth: 1.5,
                  borderColor: isPicked ? palette.color : palette.border,
                  backgroundColor: palette.bg,
                }}
              >
                <Text style={{ fontSize: 15 }}>{cat.emoji}</Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '800',
                    color: palette.color,
                    writingDirection: 'rtl',
                  }}
                >
                  {cat.label}
                </Text>
                {isPicked && (
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: FANTASY.positive,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#fff' }}>✓</Text>
                  </View>
                )}
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
