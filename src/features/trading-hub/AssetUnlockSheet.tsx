import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView, Dimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FINN_HAPPY } from '../retention-loops/finnMascotConfig';
import { LiquidButton } from '../../components/ui/LiquidButton';
import { successHaptic, tapHaptic } from '../../utils/haptics';
import type { AssetType } from './tradingHubTypes';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface AssetUnlockSheetProps {
  visible: boolean;
  unlockedType: AssetType;
  onClose: () => void;
}

interface UnlockCopy {
  title: string;
  subtitle: string;
  body: string;
  cta: string;
}

const COPY_BY_TYPE: Record<AssetType, UnlockCopy> = {
  stock: {
    title: 'פתחת מניות בודדות!',
    subtitle: 'AAPL, MSFT, NVDA ועוד',
    body: 'מעכשיו אפשר לסחור גם במניות בודדות. זכור — תנודתיות גבוהה יותר ממדד, אבל גם פוטנציאל רווח גבוה יותר.',
    cta: 'יאללה נסחור',
  },
  crypto: {
    title: 'פתחת קריפטו!',
    subtitle: 'Bitcoin, Ethereum',
    body: 'סיימת את פרק 5 — כל הכבוד. קריפטו נע 24/7 ותנודתיות "קיצונית". התחל בסכומים קטנים, וסחר רק בפלטפורמות מפוקחות.',
    cta: 'בוא נלמד',
  },
  index: {
    title: 'פתחת מדדים',
    subtitle: 'SPY, QQQ, TA-125',
    body: 'מדדים הם הדרך הבטוחה ביותר להתחיל — פיזור מובנה בנכס אחד.',
    cta: 'בוא נתחיל',
  },
  commodity: {
    title: 'פתחת סחורות',
    subtitle: 'זהב וכסף',
    body: 'סחורות הן מגן מפני משברים — לרוב נעות הפוך מהשוק.',
    cta: 'מעניין',
  },
};

export function AssetUnlockSheet({ visible, unlockedType, onClose }: AssetUnlockSheetProps) {
  const insets = useSafeAreaInsets();
  const copy = COPY_BY_TYPE[unlockedType];

  // Cap the sheet's height so it can never exceed the visible screen on either edge.
  const windowHeight = Dimensions.get('window').height;
  const availableHeight = windowHeight - insets.top - insets.bottom - 24;

  useEffect(() => {
    if (visible) successHaptic();
  }, [visible]);

  const handleClose = () => {
    tapHaptic();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          entering={FadeInDown.duration(280)}
          style={[
            styles.sheet,
            {
              maxHeight: availableHeight,
              paddingBottom: Math.max(insets.bottom + 12, 20),
            },
          ]}
          // Prevent backdrop dismiss from propagating when tapping inside.
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.handleBar} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            {/* Mascot — chat-style: image peeks out of a soft circular background,
                no emoji decoration, no hard circular clip. */}
            <View style={styles.avatarWrap}>
              <View style={styles.avatarBackdrop} />
              <ExpoImage
                source={FINN_HAPPY}
                style={styles.avatarImage}
                contentFit="contain"
              />
            </View>

            <Text style={[RTL, styles.title]}>{copy.title}</Text>
            <Text style={[RTL, styles.subtitle]}>{copy.subtitle}</Text>

            <View style={styles.bodyWrap}>
              <Text style={[RTL, styles.body]}>{copy.body}</Text>
            </View>
          </ScrollView>

          <LiquidButton
            onPress={handleClose}
            style={{
              borderRadius: 28,
              width: '100%',
              height: 56,
              borderBottomWidth: 4,
              borderBottomColor: '#0369a1',
              marginTop: 12,
            }}
            color="#0284c7"
          >
            <Text style={styles.ctaText}>{copy.cta}</Text>
          </LiquidButton>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const AVATAR_SIZE = 120;
const AVATAR_BG_SIZE = 84;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#f0f9ff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'stretch',
  },
  handleBar: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#bae6fd',
    alignSelf: 'center',
    marginBottom: 8,
  },
  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  avatarBackdrop: {
    position: 'absolute',
    width: AVATAR_BG_SIZE,
    height: AVATAR_BG_SIZE,
    borderRadius: AVATAR_BG_SIZE / 2,
    backgroundColor: '#e0f2fe',
    borderWidth: 2,
    borderColor: '#bae6fd',
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0284c7',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  bodyWrap: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#e0f2fe',
  },
  body: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    lineHeight: 20,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ffffff',
  },
});
