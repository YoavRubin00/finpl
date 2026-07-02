import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import LottieView from 'lottie-react-native';
import { FANTASY } from '../../../constants/theme';
import type { StockCategory, DraftPick } from '../fantasyTypes';

interface Props {
  categories: StockCategory[];
  picks: DraftPick[];
  onLock: () => void;
  locked: boolean;
  /** Optional: when false (and provided), the lock CTA shows a "not yet" hint instead of being active. */
  lockReady?: boolean;
  lockBlockReason?: string;
}

export function DraftProgressBar({ categories, picks, onLock, locked, lockReady, lockBlockReason }: Props): React.ReactElement {
  const pickedCount = picks.length;
  const total = categories.length;
  const allPicked = pickedCount === total;
  const canLock = allPicked && (lockReady ?? true);
  const checkRef = useRef<LottieView>(null);
  const prevCount = useRef(pickedCount);

  useEffect(() => {
    if (pickedCount === total && prevCount.current < total) {
      checkRef.current?.play();
    }
    prevCount.current = pickedCount;
  }, [pickedCount, total]);

  return (
    <View
      style={{
        backgroundColor: FANTASY.surfaceCard,
        borderTopWidth: 1,
        borderTopColor: FANTASY.border,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 28,
        gap: 12,
      }}
    >
      {/* Category dots row */}
      <View
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {categories.map((cat) => {
          const isPicked = picks.some((p) => p.categoryId === cat.id);
          return (
            <View key={cat.id} style={{ alignItems: 'center', gap: 4 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: isPicked ? FANTASY.primaryTint : FANTASY.surfaceLow,
                  borderWidth: 1.5,
                  borderColor: isPicked ? FANTASY.primary : FANTASY.borderStrong,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: isPicked ? 16 : 14, opacity: isPicked ? 1 : 0.4 }}>
                  {cat.emoji}
                </Text>
              </View>
              {isPicked && (
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: FANTASY.primary,
                  }}
                />
              )}
            </View>
          );
        })}
      </View>

      {/* Counter + status */}
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {allPicked && (
          <LottieView
            ref={checkRef}
            source={require("../../../../assets/lottie/wired-flat-24-approved-checked-hover-pinch.json")}
            style={{ width: 22, height: 22 }}
            autoPlay={false}
            loop={false}
          />
        )}
        <Text
          style={{
            fontSize: 13,
            fontWeight: '700',
            color: canLock ? FANTASY.positiveDark : FANTASY.inkMuted,
            textAlign: 'center',
            writingDirection: 'rtl',
          }}
        >
          {!allPicked
            ? `בחרת ${pickedCount}/${total} מניות`
            : !canLock
              ? (lockBlockReason ?? 'יש להשלים את ההקצאה')
              : 'הכל מוכן — לנעול!'}
        </Text>
      </View>

      {/* Progress track — fills right→left for RTL */}
      <View
        style={{
          height: 4,
          backgroundColor: FANTASY.surfaceMuted,
          borderRadius: 2,
          overflow: 'hidden',
          flexDirection: 'row-reverse',
        }}
      >
        <View
          style={{
            height: 4,
            width: `${(pickedCount / total) * 100}%`,
            backgroundColor: allPicked ? FANTASY.gold : FANTASY.primary,
            borderRadius: 2,
          }}
        />
      </View>

      {/* Lock CTA — only shown when all picked AND lockReady (allocation balanced) */}
      {allPicked && !locked && (
        <Pressable
          onPress={onLock}
          disabled={!canLock}
          accessibilityRole="button"
          accessibilityLabel="נעל דראפט"
          style={({ pressed }) => ({
            backgroundColor: !canLock
              ? FANTASY.surfaceMuted
              : pressed
                ? '#fbbf24'
                : FANTASY.gold,
            borderRadius: 14,
            paddingVertical: 15,
            alignItems: 'center',
            shadowColor: canLock ? FANTASY.gold : 'transparent',
            shadowOpacity: canLock ? 0.5 : 0,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 4 },
            elevation: canLock ? 8 : 0,
            opacity: !canLock ? 0.7 : 1,
          })}
        >
          <Text style={{
            fontSize: 16,
            fontWeight: '900',
            color: canLock ? '#451a03' : FANTASY.inkFaint,
            letterSpacing: 0.3,
          }}>
            🔒 נעל את הדראפט לשבוע!
          </Text>
        </Pressable>
      )}

      {locked && (
        <View
          style={{
            backgroundColor: FANTASY.positiveSoft,
            borderRadius: 14,
            paddingVertical: 13,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: FANTASY.positiveStroke,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '800', color: FANTASY.positiveDark }}>
            ✅ הדראפט נעול — בהצלחה!
          </Text>
        </View>
      )}
    </View>
  );
}