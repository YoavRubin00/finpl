import React from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { CLASH } from '../../../constants/theme';
import type { StockCategoryId, StockCategory } from '../fantasyTypes';

interface Props {
  categories: StockCategory[];
  activeId: StockCategoryId;
  pickedCategories: StockCategoryId[];
  onSelect: (id: StockCategoryId) => void;
}

export function DraftCategoryTabs({ categories, activeId, pickedCategories, onSelect }: Props): React.ReactElement {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
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
                ? CLASH.goldBorder
                : 'rgba(255,255,255,0.15)',
              backgroundColor: isActive
                ? 'rgba(212,160,23,0.15)'
                : pressed
                ? 'rgba(255,255,255,0.06)'
                : 'rgba(255,255,255,0.04)',
            })}
          >
            <Text style={{ fontSize: 16 }}>{cat.emoji}</Text>
            <Text
              style={{
                fontSize: 13,
                fontWeight: isActive ? '800' : '600',
                color: isActive ? CLASH.goldLight : 'rgba(255,255,255,0.65)',
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
                  backgroundColor: '#4ade80',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 9, fontWeight: '900', color: '#000' }}>✓</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
