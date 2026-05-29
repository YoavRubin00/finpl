import { View, Text, StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { GoldCoinIcon } from '../../components/ui/GoldCoinIcon';
import { REFERRAL_SIGNUP_BONUS_COINS } from './referralConstants';

/**
 * Referral signup-bonus headline rendered with the wallet's gold-coin icon
 * instead of the 🪙 emoji — the emoji (Unicode 13.0) falls back to a "moon"
 * glyph on older OS emoji fonts, which was visibly wrong on user devices.
 */
export function SignupBonusHeadline({ textStyle, iconSize = 14 }: {
  textStyle?: StyleProp<TextStyle>;
  iconSize?: number;
}) {
  return (
    <View style={styles.row}>
      <Text style={textStyle}>{REFERRAL_SIGNUP_BONUS_COINS}</Text>
      <GoldCoinIcon size={iconSize} />
      <Text style={textStyle}>לחבר + {REFERRAL_SIGNUP_BONUS_COINS}</Text>
      <GoldCoinIcon size={iconSize} />
      <Text style={textStyle}>לכם</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
  },
});
