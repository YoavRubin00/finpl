import React from 'react';
import { Modal, View, Text, Pressable, ScrollView } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { LUXE, LUXE_GRADIENTS } from '../../../constants/theme';
import { FINN_TABLET } from '../../retention-loops/finnMascotConfig';
import { GoldCoinIcon } from '../../../components/ui/GoldCoinIcon';
import type { DraftStock, StockCategoryId } from '../fantasyTypes';

interface Props {
  stock: DraftStock | null;
  visible: boolean;
  onClose: () => void;
  onPick: () => void;
  isPicked: boolean;
}

const CATEGORY_SHARK_INTRO: Record<StockCategoryId, string> = {
  tech: 'כשאני מנתח טכנולוגיה, אני מסתכל על צמיחה ב-Revenue ועל ה-moat. הנה הדעה שלי:',
  spec_growth: 'צמיחה ספקולטיביות זה Bet על העתיד — סיכון גבוה, תשואה אפשרית מטורפת. הניתוח שלי:',
  energy: 'שוק האנרגיה הוא מורכב, אבל עם הניתוח הנכון אפשר לנצח:',
  israel: 'שוק תל אביב פחות תנודתי, אבל יש פנינים. הנה הראייה שלי:',
  crypto: 'קריפטו הוא עולם בפני עצמו — ספקולציה, טכנולוגיה ופסיכולוגיה:',
};

function formatPriceAmount(price: number): string {
  return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function SharkAnalysisModal({ stock, visible, onClose, onPick, isPicked }: Props): React.ReactElement {
  if (!stock) return <></>;

  const intro = CATEGORY_SHARK_INTRO[stock.categoryId] ?? '';
  const changePositive = stock.mockWeeklyChange >= 0;
  const priceFormatted = formatPriceAmount(stock.mockPrice);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable onPress={() => {}}>
          <View
            style={{
              backgroundColor: LUXE.bgPrimary,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingBottom: 40,
            }}
          >
            {/* Handle */}
            <View
              style={{
                width: 48,
                height: 5,
                borderRadius: 3,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignSelf: 'center',
                marginTop: 12,
                marginBottom: 0,
              }}
            />

            {/* Stock header */}
            <View
              style={{
                flexDirection: 'row-reverse',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingTop: 18,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: LUXE.borderSubtle,
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '900',
                    color: LUXE.textPrimary,
                    writingDirection: 'rtl',
                    textAlign: 'right',
                  }}
                >
                  {stock.name}
                </Text>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <View
                    style={{
                      backgroundColor: 'rgba(251,191,36,0.18)',
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderWidth: 1,
                      borderColor: 'rgba(251,191,36,0.45)',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '800', color: LUXE.goldLight }}>
                      {stock.ticker}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: changePositive ? LUXE.positive : LUXE.negative,
                    }}
                  >
                    {changePositive ? '+' : ''}{stock.mockWeeklyChange}% השבוע
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                <GoldCoinIcon size={14} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.78)' }}>
                  {priceFormatted}
                </Text>
              </View>
            </View>

            {/* Finn + Analysis */}
            <ScrollView
              contentContainerStyle={{ padding: 20, gap: 16 }}
              showsVerticalScrollIndicator={false}
            >
              <View
                style={{
                  flexDirection: 'row-reverse',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                {/* Shark + tablet image — premium frame */}
                <View
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: 34,
                    backgroundColor: 'rgba(125,211,252,0.18)',
                    borderWidth: 2,
                    borderColor: LUXE.blueLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0,
                    shadowColor: LUXE.gold,
                    shadowOpacity: 0.35,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 3 },
                    elevation: 6,
                  }}
                >
                  <ExpoImage
                    source={FINN_TABLET}
                    style={{ width: 60, height: 60 }}
                    contentFit="contain"
                    accessible={false}
                  />
                </View>

                {/* Shark label */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '800',
                      color: LUXE.goldLight,
                      writingDirection: 'rtl',
                      textAlign: 'right',
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                    }}
                  >
                    קפטן שארק אומר:
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: LUXE.textMuted,
                      writingDirection: 'rtl',
                      textAlign: 'right',
                      marginTop: 2,
                    }}
                  >
                    {intro}
                  </Text>
                </View>
              </View>

              {/* Analysis text */}
              <View
                style={{
                  backgroundColor: LUXE.surfaceCard,
                  borderRadius: 14,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: 'rgba(251,191,36,0.20)',
                  borderRightWidth: 3,
                  borderRightColor: LUXE.gold,
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    color: 'rgba(255,255,255,0.92)',
                    writingDirection: 'rtl',
                    textAlign: 'right',
                    lineHeight: 24,
                  }}
                >
                  {stock.sharkAnalysis}
                </Text>
              </View>

              {/* Price context */}
              <View
                style={{
                  flexDirection: 'row-reverse',
                  gap: 10,
                }}
              >
                {[
                  { label: 'מחיר כניסה', value: priceFormatted },
                  { label: 'שינוי שבועי', value: `${stock.mockWeeklyChange >= 0 ? '+' : ''}${stock.mockWeeklyChange}%`, color: stock.mockWeeklyChange >= 0 ? LUXE.positive : LUXE.negative },
                ].map((stat) => (
                  <View
                    key={stat.label}
                    style={{
                      flex: 1,
                      backgroundColor: LUXE.surfaceCard,
                      borderRadius: 10,
                      padding: 10,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: LUXE.borderSubtle,
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '900', color: stat.color ?? LUXE.textPrimary }}>
                      {stat.value}
                    </Text>
                    <Text style={{ fontSize: 10, color: LUXE.textFaint, marginTop: 2, writingDirection: 'rtl' }}>
                      {stat.label}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* CTA */}
            <View style={{ paddingHorizontal: 20, gap: 10 }}>
              <Pressable
                onPress={() => { onPick(); onClose(); }}
                style={({ pressed }) => ({
                  borderRadius: 14,
                  overflow: 'hidden',
                  opacity: pressed ? 0.92 : 1,
                  shadowColor: isPicked ? 'transparent' : LUXE.gold,
                  shadowOpacity: isPicked ? 0 : 0.55,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: isPicked ? 0 : 8,
                })}
                accessibilityRole="button"
                accessibilityLabel={isPicked ? 'הסר בחירה' : `בחר ${stock.name}`}
              >
                {isPicked ? (
                  <View
                    style={{
                      backgroundColor: '#334155',
                      paddingVertical: 15,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.2)',
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '900', color: 'rgba(255,255,255,0.75)' }}>
                      ✓ נבחרה — הסר בחירה
                    </Text>
                  </View>
                ) : (
                  <LinearGradient
                    colors={LUXE_GRADIENTS.ctaGold}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ paddingVertical: 15, alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '900', color: LUXE.textOnGold, letterSpacing: 0.3 }}>
                      ✚ בחר {stock.ticker} לתיק
                    </Text>
                  </LinearGradient>
                )}
              </Pressable>
              <Pressable
                onPress={onClose}
                style={{ paddingVertical: 10, alignItems: 'center' }}
                accessibilityRole="button"
                accessibilityLabel="סגור"
              >
                <Text style={{ fontSize: 14, color: LUXE.textFaint }}>סגור</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
