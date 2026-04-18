import { View, Text, Pressable, Modal, StyleSheet, Dimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import Svg, { Polyline, Line } from 'react-native-svg';
import { FINN_STANDARD } from '../retention-loops/finnMascotConfig';
import type { ChartMode } from './tradingHubTypes';
import { tapHaptic, successHaptic } from '../../utils/haptics';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface ChartModeOnboardingProps {
  visible: boolean;
  onChoose: (mode: ChartMode) => void;
}

export function ChartModeOnboarding({ visible, onChoose }: ChartModeOnboardingProps) {
  const insets = useSafeAreaInsets();
  const windowHeight = Dimensions.get('window').height;
  const availableHeight = windowHeight - insets.top - insets.bottom - 32;

  const handlePick = (mode: ChartMode) => {
    successHaptic();
    onChoose(mode);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { /* cannot dismiss without choice */ }} accessibilityViewIsModal>
      <View style={styles.backdrop}>
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={[
            styles.sheet,
            {
              maxHeight: availableHeight,
              paddingBottom: Math.max(insets.bottom + 16, 24),
            },
          ]}
        >
          <View style={styles.handleBar} />

          {/* Shark hero */}
          <View style={styles.heroRow}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatarBackdrop} />
              <ExpoImage source={FINN_STANDARD} style={styles.avatarImage} contentFit="contain" />
            </View>
            <View style={styles.speechWrap}>
              <Text style={[RTL, styles.speechLabel]}>קפטן שארק</Text>
              <Text style={[RTL, styles.speechText]}>איך אתה מעדיף לראות את הגרף?</Text>
            </View>
          </View>

          <Text style={[RTL, styles.hint]}>אפשר לשנות בכל רגע מ-toggle בתחתית הגרף.</Text>

          {/* Simple option */}
          <Animated.View entering={FadeIn.delay(140).duration(260)}>
            <Pressable
              onPress={() => { tapHaptic(); handlePick('simple'); }}
              accessibilityRole="button"
              accessibilityLabel="גרף פשוט. רק מחיר ונפח מסחר, קריא וברור"
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardTextCol}>
                  <Text style={[RTL, styles.cardTitle]}>גרף פשוט</Text>
                  <Text style={[RTL, styles.cardDesc]}>רק מחיר ונפח מסחר — קריא, בלי רעש</Text>
                </View>
                <View style={styles.cardIconWrap}>
                  <SimpleChartIcon />
                </View>
              </View>
            </Pressable>
          </Animated.View>

          {/* Advanced option */}
          <Animated.View entering={FadeIn.delay(200).duration(260)}>
            <Pressable
              onPress={() => { tapHaptic(); handlePick('advanced'); }}
              accessibilityRole="button"
              accessibilityLabel="גרף למתקדמים. כולל ממוצע נע ו-RSI עם הסברים"
              style={({ pressed }) => [styles.card, styles.cardAdvanced, pressed && styles.cardPressed]}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardTextCol}>
                  <Text style={[RTL, styles.cardTitle]}>גרף למתקדמים</Text>
                  <Text style={[RTL, styles.cardDesc]}>מחיר, נפח, MA20 ו-RSI — עם הסברים</Text>
                </View>
                <View style={styles.cardIconWrap}>
                  <AdvancedChartIcon />
                </View>
              </View>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── Mini icons (pure SVG, no network) ────────────────────────────────────────

function SimpleChartIcon() {
  return (
    <Svg width={72} height={52} viewBox="0 0 72 52">
      <Polyline points="4,40 16,28 28,34 40,18 52,22 68,10" fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="0" y1="48" x2="72" y2="48" stroke="#e2e8f0" strokeWidth="1" />
    </Svg>
  );
}

function AdvancedChartIcon() {
  return (
    <Svg width={72} height={52} viewBox="0 0 72 52">
      {/* Price line */}
      <Polyline points="4,32 16,24 28,28 40,14 52,18 68,8" fill="none" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* MA20 line */}
      <Polyline points="4,30 16,27 28,26 40,22 52,19 68,15" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {/* RSI mini below */}
      <Line x1="0" y1="40" x2="72" y2="40" stroke="#e2e8f0" strokeWidth="1" />
      <Polyline points="4,46 16,44 28,42 40,45 52,41 68,43" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handleBar: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginBottom: 12,
  },
  heroRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  avatarWrap: {
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBackdrop: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#e0f2fe',
    borderWidth: 2,
    borderColor: '#bae6fd',
  },
  avatarImage: {
    width: 72,
    height: 72,
  },
  speechWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  speechLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284c7',
    marginBottom: 2,
  },
  speechText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  hint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 16,
    marginStart: 4,
  },
  card: {
    backgroundColor: '#f0f9ff',
    borderWidth: 2,
    borderColor: '#bae6fd',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  cardAdvanced: {
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  cardContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
  },
  cardTextCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  cardDesc: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginTop: 3,
    lineHeight: 17,
  },
  cardIconWrap: {
    width: 72,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
