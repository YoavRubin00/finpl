import React from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { FANTASY } from '../../../constants/theme';
import { FINN_TABLET } from '../../retention-loops/finnMascotConfig';
import type { FantasyTier } from '../fantasyTypes';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Generic tone — used when `tier` is not provided. */
  tone?: 'gold' | 'danger' | 'primary';
  /** When set, the primary CTA gradient + border match the league's tier. */
  tier?: FantasyTier;
  onConfirm: () => void;
  onCancel: () => void;
}

interface ToneStyle {
  g: readonly [string, string];
  border: string;
  text: string;
  shadow: string;
}

const TONE: Record<'gold' | 'danger' | 'primary', ToneStyle> = {
  gold: {
    g: ['#facc15', '#f59e0b'],
    border: '#92400e',
    text: '#451a03',
    shadow: 'rgba(245,158,11,0.4)',
  },
  primary: {
    g: ['#005bb1', '#0077d6'],
    border: '#1e3a8a',
    text: '#ffffff',
    shadow: 'rgba(0,91,177,0.35)',
  },
  danger: {
    g: ['#dc2626', '#ef4444'],
    border: '#7f1d1d',
    text: '#ffffff',
    shadow: 'rgba(220,38,38,0.35)',
  },
};

// Per-tier CTA palette — sourced from LeagueShield.tsx so the modal CTA
// matches the league emblem the user is about to join.
const TIER_STYLE: Record<FantasyTier, ToneStyle> = {
  silver: {
    g: ['#e2e8f0', '#94a3b8'],
    border: '#475569',
    text: '#0f172a',
    shadow: 'rgba(100,116,139,0.35)',
  },
  gold: {
    g: ['#fcd34d', '#d97706'],
    border: '#92570a',
    text: '#451a03',
    shadow: 'rgba(217,119,6,0.4)',
  },
  diamond: {
    g: ['#bae6fd', '#0284c7'],
    border: '#075985',
    text: '#ffffff',
    shadow: 'rgba(2,132,199,0.4)',
  },
};

export function SharkConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'אישור',
  cancelLabel = 'ביטול',
  tone = 'gold',
  tier,
  onConfirm,
  onCancel,
}: Props): React.ReactElement {
  const t = tier ? TIER_STYLE[tier] : TONE[tone];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        onPress={onCancel}
        style={{
          flex: 1,
          backgroundColor: 'rgba(15,23,42,0.55)',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
        }}
      >
        <Pressable onPress={() => {}}>
          <View
            style={{
              width: '100%',
              maxWidth: 340,
              backgroundColor: FANTASY.surfaceCard,
              borderRadius: 22,
              paddingHorizontal: 20,
              paddingTop: 60,
              paddingBottom: 18,
              shadowColor: '#0f172a',
              shadowOpacity: 0.25,
              shadowOffset: { width: 0, height: 8 },
              shadowRadius: 24,
              elevation: 12,
              alignItems: 'center',
            }}
          >
            {/* Captain Shark — floats above the card */}
            <View
              style={{
                position: 'absolute',
                top: -48,
                alignSelf: 'center',
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: FANTASY.bg,
                borderWidth: 3,
                borderColor: '#7dd3fc',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                shadowColor: '#facc15',
                shadowOpacity: 0.5,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 4 },
                elevation: 10,
              }}
            >
              <ExpoImage
                source={FINN_TABLET}
                style={{ width: 84, height: 84 }}
                contentFit="contain"
                accessible={false}
              />
            </View>

            {/* Eyebrow */}
            <Text
              style={{
                fontSize: 10,
                fontWeight: '900',
                color: FANTASY.gold,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              קפטן שארק
            </Text>

            {/* Title */}
            <Text
              style={{
                fontSize: 18,
                fontWeight: '900',
                color: FANTASY.ink,
                textAlign: 'center',
                writingDirection: 'rtl',
                marginBottom: 8,
              }}
            >
              {title}
            </Text>

            {/* Message */}
            <Text
              style={{
                fontSize: 13,
                color: FANTASY.inkMuted,
                textAlign: 'center',
                writingDirection: 'rtl',
                lineHeight: 19,
                marginBottom: 18,
              }}
            >
              {message}
            </Text>

            {/* Buttons — stacked, full-width. Primary on top, secondary below. */}
            <View style={{ width: '100%', gap: 10 }}>
              <Pressable
                onPress={onConfirm}
                accessibilityRole="button"
                accessibilityLabel={confirmLabel}
                style={({ pressed }) => ({
                  width: '100%',
                  borderRadius: 14,
                  overflow: 'hidden',
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  shadowColor: t.shadow,
                  shadowOpacity: 0.85,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 10,
                })}
              >
                <LinearGradient
                  colors={t.g}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    paddingVertical: 15,
                    paddingHorizontal: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderBottomWidth: 4,
                    borderBottomColor: t.border,
                    borderTopWidth: 1,
                    borderTopColor: 'rgba(255,255,255,0.35)',
                  }}
                >
                  {/* Top highlight strip for a glossy feel */}
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: 1,
                      left: 8,
                      right: 8,
                      height: 14,
                      borderRadius: 999,
                      backgroundColor: 'rgba(255,255,255,0.18)',
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '900',
                      color: t.text,
                      letterSpacing: 0.4,
                      textShadowColor: 'rgba(0,0,0,0.18)',
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 2,
                    }}
                  >
                    {confirmLabel}
                  </Text>
                </LinearGradient>
              </Pressable>
              <Pressable
                onPress={onCancel}
                accessibilityRole="button"
                accessibilityLabel={cancelLabel}
                style={({ pressed }) => ({
                  width: '100%',
                  borderRadius: 14,
                  backgroundColor: pressed ? FANTASY.surfaceMuted : FANTASY.surfaceLow,
                  borderWidth: 1.5,
                  borderColor: FANTASY.borderStrong,
                  borderBottomWidth: 3,
                  borderBottomColor: FANTASY.silver,
                  paddingVertical: 13,
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: FANTASY.inkMuted }}>
                  {cancelLabel}
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
