import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { GoldCoinIcon } from '../../components/ui/GoldCoinIcon';
import { LottieIcon } from '../../components/ui/LottieIcon';

import type { Benefit } from './types';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface RedemptionModalProps {
  visible: boolean;
  benefit: Benefit | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RedemptionModal({ visible, benefit, onConfirm, onCancel }: RedemptionModalProps) {
  if (!benefit) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        {/* Full-screen soft backdrop */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel}>
          <Animated.View entering={FadeIn.duration(250)} style={styles.backdrop} />
        </Pressable>

        {/* Bottom sheet */}
        <Animated.View
          entering={FadeInUp.duration(400).springify().damping(16)}
          style={styles.sheet}
        >
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Close button */}
          <Pressable onPress={onCancel} style={styles.closeBtn} hitSlop={12}>
            <X size={18} color="#94a3b8" />
          </Pressable>

          {/* Partner logo + name */}
          <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.partnerRow}>
            <View style={styles.partnerLogoCircle}>
              {benefit.lottieSource
                ? <LottieIcon source={benefit.lottieSource} size={28} autoPlay loop />
                : <Text style={{ fontSize: 22 }}>{benefit.partnerLogo}</Text>
              }
            </View>
            <Text style={styles.partnerName}>{benefit.partnerName}</Text>
          </Animated.View>

          {/* Title + description */}
          <Animated.View entering={FadeInDown.delay(150).duration(300)}>
            <Text style={styles.title}>{benefit.title}</Text>
            <Text style={styles.description}>{benefit.description}</Text>
          </Animated.View>

          {/* Combined info row */}
          <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.infoRow}>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>מה מקבלים</Text>
              <Text style={styles.infoValue}>{benefit.reward}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>עלות</Text>
              <View style={styles.costValueRow}>
                <GoldCoinIcon size={16} />
                <Text style={styles.costValue}>{benefit.costCoins.toLocaleString()}</Text>
              </View>
            </View>
          </Animated.View>

          {/* CTA button */}
          <Animated.View entering={FadeInDown.delay(250).duration(300)}>
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [styles.confirmBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
            >
              <Text style={styles.confirmBtnText}>המרה כעת</Text>
            </Pressable>
          </Animated.View>

          {/* Cancel */}
          <Pressable onPress={onCancel} style={styles.cancelBtn}>
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
    paddingBottom: 36,
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
    textAlign: 'center',
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
    color: '#94a3b8',
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
    color: '#b45309',
  },

  confirmBtn: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 8,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },

  cancelBtn: {
    alignSelf: 'center',
    paddingVertical: 6,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
});
