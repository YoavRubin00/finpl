import { View, Text, TextStyle } from 'react-native';
import { GoldCoinIcon } from './GoldCoinIcon';

interface CoinLabelProps {
  /** Text to display (e.g. "+50", "1,200", "חסרים 300") */
  children: string | number;
  /** Font size for the text (coin icon scales accordingly) */
  size?: number;
  /** Text color */
  color?: string;
  /** Font weight */
  weight?: TextStyle['fontWeight'];
  /** Additional text style */
  style?: TextStyle;
  /** Suffix after coin icon (e.g. "/יום", "/חודש") */
  suffix?: string;
}

/**
 * Inline text + gold coin icon — replaces 🪙 emoji for visual consistency.
 * Usage: <CoinLabel>+50</CoinLabel> or <CoinLabel suffix="/יום">+12</CoinLabel>
 */
export function CoinLabel({ children, size = 14, color = '#0f172a', weight = '700', style, suffix }: CoinLabelProps) {
  const coinSize = Math.max(10, size - 2);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Text style={[{ fontSize: size, fontWeight: weight, color, writingDirection: 'rtl' }, style]}>
        {children}
      </Text>
      <GoldCoinIcon size={coinSize} />
      {suffix ? (
        <Text style={[{ fontSize: size, fontWeight: weight, color, writingDirection: 'rtl' }, style]}>
          {suffix}
        </Text>
      ) : null}
    </View>
  );
}