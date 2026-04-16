import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AnimatedPressable } from '../../../../components/ui/AnimatedPressable';
import { SIM4, RTL } from '../simTheme';
import type { StockOption } from '../indexRaceTypes';
import {
  INDEX_RACE_SCREEN_WIDTH as SCREEN_WIDTH,
  INDEX_RACE_LINE_COLORS as LINE_COLORS,
} from './indexRaceConstants';

interface StockPickCardProps {
  stock: StockOption;
  isSelected: boolean;
  disabled: boolean;
  onPress: () => void;
}

function StockPickCardImpl({ stock, isSelected, disabled, onPress }: StockPickCardProps) {
  return (
    <AnimatedPressable
      onPress={onPress}
      style={[
        pickStyles.card,
        isSelected && pickStyles.cardSelected,
        disabled && !isSelected && pickStyles.cardDisabled,
      ]}
      accessibilityRole="button"
      accessibilityLabel={stock.name}
    >
      <View style={[pickStyles.idChip, isSelected && pickStyles.idChipSelected]}>
        <Text style={pickStyles.idText}>{stock.id}</Text>
      </View>
      <Text
        style={[
          pickStyles.stockName,
          isSelected && pickStyles.stockNameSelected,
        ]}
      >
        {stock.name}
      </Text>
      <Text style={[pickStyles.sector, RTL]}>{stock.sector}</Text>
      {isSelected && (
        <View style={pickStyles.checkBadge}>
          <Text style={pickStyles.checkText}>✓</Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

export const StockPickCard = React.memo(StockPickCardImpl);

export const pickGridCellWidth = (SCREEN_WIDTH - 42) / 2;

const pickStyles = StyleSheet.create({
  card: {
    backgroundColor: SIM4.cardBg,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: SIM4.cardBorder,
    shadowColor: SIM4.dark,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardSelected: {
    borderColor: LINE_COLORS.portfolio,
    backgroundColor: '#fffbeb',
    shadowColor: LINE_COLORS.portfolio,
    shadowOpacity: 0.3,
  },
  cardDisabled: {
    opacity: 0.45,
  },
  idChip: {
    backgroundColor: '#0c4a6e',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 2,
  },
  idChipSelected: {
    backgroundColor: '#0369a1',
  },
  idText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  stockName: {
    fontSize: 14,
    fontWeight: '800',
    color: SIM4.textPrimary,
    textAlign: 'center',
    marginTop: 6,
  },
  stockNameSelected: {
    color: '#b45309',
  },
  sector: {
    fontSize: 11,
    fontWeight: '600',
    color: SIM4.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: LINE_COLORS.portfolio,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
});
