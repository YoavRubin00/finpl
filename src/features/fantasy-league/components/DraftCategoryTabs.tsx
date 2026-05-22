import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Text, Pressable, Dimensions } from 'react-native';
import { FANTASY } from '../../../constants/theme';
import type { StockCategoryId, StockCategory } from '../fantasyTypes';

interface Props {
  categories: StockCategory[];
  activeId: StockCategoryId;
  pickedCategories: StockCategoryId[];
  onSelect: (id: StockCategoryId) => void;
}

export function DraftCategoryTabs({ categories, activeId, pickedCategories, onSelect }: Props): React.ReactElement {
  // The bar uses LTR-native scroll with a row-reverse container, so item[0]
  // (tech) sits at the visual right and item[N-1] (crypto) at the visual left.
  // We measure each tab's layout and auto-scroll so the *active* tab is always
  // centered in view — solves the "I can't reach crypto" problem.
  const scrollRef = useRef<ScrollView>(null);
  const [layouts, setLayouts] = useState<Record<string, { x: number; width: number }>>({});
  const viewportWidth = Dimensions.get('window').width;

  useEffect(() => {
    const layout = layouts[activeId];
    if (!layout || !scrollRef.current) return;
    // Center the active tab horizontally; clamp to ≥ 0.
    const target = Math.max(0, layout.x - viewportWidth / 2 + layout.width / 2);
    scrollRef.current.scrollTo({ x: target, animated: true });
  }, [activeId, layouts, viewportWidth]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onContentSizeChange={() => {
        // On first layout, snap to the right edge so tech is visible immediately.
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
              flexDirection: 'row-reverse',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
              borderWidth: isActive ? 1.5 : 1,
              borderColor: isActive
                ? FANTASY.primary
                : FANTASY.border,
              backgroundColor: isActive
                ? FANTASY.primaryTint
                : pressed
                ? FANTASY.surfaceLow
                : FANTASY.surfaceCard,
            })}
          >
            <Text style={{ fontSize: 16 }}>{cat.emoji}</Text>
            <Text
              style={{
                fontSize: 13,
                fontWeight: isActive ? '800' : '600',
                color: isActive ? FANTASY.primary : FANTASY.inkLabel,
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
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
