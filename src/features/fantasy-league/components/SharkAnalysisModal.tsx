import React from 'react';
import { Modal, View, Text, Pressable, ScrollView } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { CLASH } from '../../../constants/theme';
import { FINN_TABLET } from '../../retention-loops/finnMascotConfig';
import type { DraftStock } from '../fantasyTypes';

interface Props {
  stock: DraftStock | null;
  visible: boolean;
  onClose: () => void;
  onPick: () => void;
  isPicked: boolean;
}

const CATEGORY_SHARK_INTRO: Record<string, string> = {
  tech: 'כשאני מנתח טכנולוגיה, אני מסתכל על צמיחה ב-Revenue ועל ה-moat. הנה הדעה שלי:',
  banks: 'בנקים הם בסיס כל כלכלה — ואני יודע איפה הכסף הגדול מסתתר:',
  energy: 'שוק האנרגיה הוא מורכב, אבל עם הניתוח הנכון אפשר לנצח:',
  health: 'בריאות זה שוק שצומח תמיד — בין מגפות ובין מהפכות:',
  crypto: 'קריפטו הוא עולם בפני עצמו — ספקולציה, טכנולוגיה ופסיכולוגיה:',
};

export function SharkAnalysisModal({ stock, visible, onClose, onPick, isPicked }: Props): React.ReactElement {
  if (!stock) return <></>;

  const intro = CATEGORY_SHARK_INTRO[stock.categoryId] ?? '';
  const changePositive = stock.mockWeeklyChange >= 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable onPress={() => {}}>
          <View
            style={{
              backgroundColor: CLASH.bgPrimary,
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
                borderBottomColor: 'rgba(255,255,255,0.08)',
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '900',
                    color: '#ffffff',
                    writingDirection: 'rtl',
                    textAlign: 'right',
                  }}
                >
                  {stock.name}
                </Text>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <View
                    style={{
                      backgroundColor: 'rgba(212,160,23,0.2)',
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderWidth: 1,
                      borderColor: CLASH.goldBorder + '60',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '800', color: CLASH.goldLight }}>
                      {stock.ticker}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: changePositive ? '#4ade80' : '#f87171',
                    }}
                  >
                    {changePositive ? '+' : ''}{stock.mockWeeklyChange}% השבוע
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.7)' }}>
                ${stock.mockPrice.toLocaleString('en-US')}
              </Text>
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
                {/* Finn tablet image */}
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: 'rgba(56,189,248,0.15)',
                    borderWidth: 2,
                    borderColor: 'rgba(56,189,248,0.3)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  <ExpoImage
                    source={FINN_TABLET}
                    style={{ width: 56, height: 56 }}
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
                      color: CLASH.goldLight,
                      writingDirection: 'rtl',
                      textAlign: 'right',
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                    }}
                  >
                    🦈 קפטן שארק אומר:
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.55)',
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
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: 14,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: 'rgba(212,160,23,0.15)',
                  borderRightWidth: 3,
                  borderRightColor: CLASH.goldBorder,
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    color: 'rgba(255,255,255,0.9)',
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
                  { label: 'מחיר כניסה', value: `$${stock.mockPrice.toLocaleString('en-US')}` },
                  { label: 'שינוי שבועי', value: `${stock.mockWeeklyChange >= 0 ? '+' : ''}${stock.mockWeeklyChange}%`, color: stock.mockWeeklyChange >= 0 ? '#4ade80' : '#f87171' },
                ].map((stat) => (
                  <View
                    key={stat.label}
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      borderRadius: 10,
                      padding: 10,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '900', color: stat.color ?? '#ffffff' }}>
                      {stat.value}
                    </Text>
                    <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2, writingDirection: 'rtl' }}>
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
                  backgroundColor: isPicked ? '#334155' : pressed ? CLASH.goldLight : CLASH.goldBorder,
                  borderRadius: 14,
                  paddingVertical: 15,
                  alignItems: 'center',
                  borderWidth: isPicked ? 1 : 0,
                  borderColor: isPicked ? 'rgba(255,255,255,0.2)' : 'transparent',
                })}
                accessibilityRole="button"
                accessibilityLabel={isPicked ? 'הסר בחירה' : `בחר ${stock.name}`}
              >
                <Text style={{ fontSize: 16, fontWeight: '900', color: isPicked ? 'rgba(255,255,255,0.7)' : '#000000' }}>
                  {isPicked ? '✓ נבחרה — הסר בחירה' : `✚ בחר ${stock.ticker} לתיק`}
                </Text>
              </Pressable>
              <Pressable
                onPress={onClose}
                style={{ paddingVertical: 10, alignItems: 'center' }}
                accessibilityRole="button"
                accessibilityLabel="סגור"
              >
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>סגור</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}