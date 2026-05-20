import { View, Text, Image, Pressable, Modal, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import { GoldCoinIcon } from '../../components/ui/GoldCoinIcon';
import { LottieIcon } from '../../components/ui/LottieIcon';

import type { Benefit } from './types';

interface RedemptionModalProps {
  visible: boolean;
  benefit: Benefit | null;
  isRedeemed?: boolean;
  canAfford?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RedemptionModal({ visible, benefit, isRedeemed = false, canAfford = true, onConfirm, onCancel }: RedemptionModalProps) {
  const insets = useSafeAreaInsets();
  if (!benefit) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        {/* Soft backdrop above the sheet — taking only the remaining space so it
            never steals taps from the sheet below it. */}
        <Pressable style={styles.backdropTouchable} onPress={onCancel}>
          <Animated.View entering={FadeIn.duration(220)} style={styles.backdrop} />
        </Pressable>

        {/* Bottom sheet, single smooth entrance, no springy bounce */}
        <Animated.View
          entering={FadeInUp.duration(280)}
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom + 16, 28), maxHeight: '90%' },
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Close button */}
          <Pressable onPress={onCancel} style={styles.closeBtn} hitSlop={12}>
            <X size={18} color="#64748b" />
          </Pressable>

          {/* Scrollable content — keeps CTA reachable on small viewports
              (iPhone SE / 8 / mini) where description + info row could
              push the button below the fold. */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 4 }}
          >
            {/* Partner logo + name */}
            <View style={styles.partnerRow}>
              <View style={styles.partnerLogoCircle}>
                {benefit.partnerLogoImage
                  ? <Image source={benefit.partnerLogoImage} style={{ width: 36, height: 36, borderRadius: 6 }} resizeMode="contain" />
                  : benefit.lottieSource
                    ? <LottieIcon source={benefit.lottieSource} size={28} autoPlay loop />
                    : <Text style={{ fontSize: 22 }}>{benefit.partnerLogo}</Text>
                }
              </View>
              <Text style={styles.partnerName}>{benefit.partnerName}</Text>
            </View>

            {/* Title + description */}
            <Text style={styles.title}>{benefit.title}</Text>
            <Text style={styles.description}>{benefit.description}</Text>

            {/* Combined info row */}
            <View style={styles.infoRow}>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>מה מקבלים</Text>
                <Text style={styles.infoValue}>{benefit.reward}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>עלות</Text>
                <View style={styles.costValueRow}>
                  {isRedeemed ? (
                    <Text style={[styles.costValue, { color: '#0369a1', fontSize: 15 }]}>הומר בהצלחה ✓</Text>
                  ) : (
                    <>
                      <GoldCoinIcon size={16} />
                      <Text style={styles.costValue}>{benefit.costCoins.toLocaleString()}</Text>
                    </>
                  )}
                </View>
              </View>
            </View>
          </ScrollView>

          {/* CTA — gradient + rim + 3D border. iOS-safe (no uneven borders that
              cause the white-on-white bg-loss bug). */}
          <Pressable
            onPress={onConfirm}
            disabled={!canAfford && !isRedeemed}
            style={({ pressed }) =>
              !canAfford && !isRedeemed
                ? styles.confirmBtnDisabled
                : [
                    styles.confirmBtnShell,
                    pressed && styles.confirmBtnShellPressed,
                  ]
            }
            accessibilityRole="button"
            accessibilityState={{ disabled: !canAfford && !isRedeemed }}
            accessibilityLabel={isRedeemed ? 'למעבר לאתר השותף' : canAfford ? 'המרה כעת' : 'אין מספיק מטבעות'}
          >
            {!canAfford && !isRedeemed ? (
              <Text style={styles.confirmBtnTextDisabled}>אין מספיק מטבעות</Text>
            ) : (
              <View style={styles.confirmBtnInner}>
                <LinearGradient
                  colors={['#67E8F9', '#0EA5E9', '#0284C7']}
                  locations={[0, 0.45, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.confirmBtnRim} pointerEvents="none" />
                <Text style={styles.confirmBtnText}>
                  {isRedeemed ? 'למעבר לאתר השותף' : 'המרה כעת'}
                </Text>
              </View>
            )}
          </Pressable>

          {/* Cancel */}
          <Pressable onPress={onCancel} style={styles.cancelBtn} hitSlop={8}>
            <Text style={styles.cancelBtnText}>חזרה</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    shadowColor: '#0c4a6e',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginBottom: 16,
  },

  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  partnerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  partnerLogoCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369a1',
  },

  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    color: '#64748b',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 16,
  },

  // Combined info row
  infoRow: {
    flexDirection: 'row-reverse',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 18,
    alignItems: 'center',
  },
  infoCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  infoDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 8,
  },
  costValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  costValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0ea5e9',
  },

  /* Outer shell: carries 3D border + drop-shadow (no overflow clip so
   * borderBottomWidth is visible). Press state sinks the button. */
  confirmBtnShell: {
    borderRadius: 999,
    borderBottomWidth: 5,
    borderBottomColor: '#0369a1',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 14,
    marginTop: 4,
    marginBottom: 8,
    alignSelf: 'stretch',
  },
  confirmBtnShellPressed: {
    transform: [{ translateY: 3 }],
    borderBottomWidth: 2,
    marginTop: 7,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
  },
  /* Inner: clips gradient to pill shape */
  confirmBtnInner: {
    height: 58,
    borderRadius: 999,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnRim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '38%',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
  },
  confirmBtnText: {
    fontSize: 19,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
    textAlign: 'center',
    textShadowColor: 'rgba(2, 84, 155, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  /* Disabled state — pleasant blue-ghost. Says "not yet, but on the path"
   * without alarming red or muddy grey. */
  confirmBtnDisabled: {
    backgroundColor: 'rgba(14, 165, 233, 0.10)',
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    width: '100%',
    borderWidth: 1.5,
    borderColor: 'rgba(14, 165, 233, 0.45)',
    marginBottom: 8,
  },
  confirmBtnTextDisabled: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0369A1',
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  cancelBtn: {
    alignSelf: 'center',
    paddingVertical: 6,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
});
