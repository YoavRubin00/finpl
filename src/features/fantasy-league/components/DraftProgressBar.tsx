import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import LottieView from 'lottie-react-native';
import { CLASH, DUO } from '../../../constants/theme';
import type { StockCategory, DraftPick } from '../fantasyTypes';

interface Props {
  categories: StockCategory[];
  picks: DraftPick[];
  onLock: () => void;
  locked: boolean;
}

export function DraftProgressBar({ categories, picks, onLock, locked }: Props): React.ReactElement {
  const pickedCount = picks.length;
  const total = categories.length;
  const allPicked = pickedCount === total;
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
        backgroundColor: CLASH.bgPrimary,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
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
                  backgroundColor: isPicked ? 'rgba(212,160,23,0.2)' : 'rgba(255,255,255,0.06)',
                  borderWidth: 1.5,
                  borderColor: isPicked ? CLASH.goldBorder : 'rgba(255,255,255,0.12)',
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
                    backgroundColor: CLASH.goldBorder,
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
            color: allPicked ? '#4ade80' : 'rgba(255,255,255,0.6)',
            textAlign: 'center',
            writingDirection: 'rtl',
          }}
        >
          {allPicked
            ? 'כל המניות נבחרו — מוכן לנעול!'
            : `בחרת ${pickedCount}/${total} מניות`}
        </Text>
      </View>

      {/* Progress track */}
      <View
        style={{
          height: 4,
          backgroundColor: DUO.border,
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: 4,
            width: `${(pickedCount / total) * 100}%`,
            backgroundColor: allPicked ? DUO.green : DUO.blue,
            borderRadius: 2,
          }}
        />
      </View>

      {/* Lock CTA — only shown when all picked */}
      {allPicked && !locked && (
        <Pressable
          onPress={onLock}
          accessibilityRole="button"
          accessibilityLabel="נעל דראפט"
          style={({ pressed }) => ({
            backgroundColor: pressed ? CLASH.goldLight : CLASH.goldBorder,
            borderRadius: 14,
            paddingVertical: 15,
            alignItems: 'center',
            shadowColor: CLASH.goldGlow,
            shadowOpacity: 0.8,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 8,
          })}
        >
          <Text style={{ fontSize: 16, fontWeight: '900', color: '#000000' }}>
            🔒 נעל את הדראפט לשבוע!
          </Text>
        </Pressable>
      )}

      {locked && (
        <View
          style={{
            backgroundColor: 'rgba(74,222,128,0.1)',
            borderRadius: 14,
            paddingVertical: 13,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: 'rgba(74,222,128,0.3)',
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#4ade80' }}>
            ✅ הדראפט נעול — בהצלחה!
          </Text>
        </View>
      )}
    </View>
  );
}