import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { X, RotateCw } from 'lucide-react-native';
import { tapHaptic } from '../../../utils/haptics';
import { pickRandomGame, pickNextDifferent, type WaitGame } from '../data/waitStateGames';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * Floating overlay that hosts a random inter-module minigame on top of the
 * Stock Analyst screen while a deep analysis is in flight. Pattern mirrors
 * `TickerPickerSheet` — absolutely positioned (NOT React Native `<Modal>`,
 * which leaves iOS touches tangled after dismissal — same bug we hit in the
 * tool tutorials).
 *
 * Each game is rendered with `freePlay={true}` so playing here does NOT
 * consume the user's daily-challenge quota for that game.
 */
export function WaitGameOverlay({ visible, onClose }: Props): React.ReactElement | null {
  // Pick the initial game ONCE when the overlay opens. Re-mounting the
  // component (visible flipping false→true) reseeds. Tapping "משחק חדש"
  // swaps to a different one without unmounting.
  const [game, setGame] = useState<WaitGame>(pickRandomGame);
  // Sheet is absolute-positioned and anchored bottom:0. SafeAreaView edges
  // bottom prop is unreliable inside absolute containers on Android — read
  // the inset directly and pad the scroll content so the inner card's
  // "המשך" CTA clears the home indicator on every device.
  const insets = useSafeAreaInsets();

  const swapGame = useCallback(() => {
    tapHaptic();
    setGame((g) => pickNextDifferent(g.id));
  }, []);

  const handleClose = useCallback(() => {
    tapHaptic();
    onClose();
  }, [onClose]);

  // Reseed on each fresh open so the user doesn't keep getting the same one
  // round after round. (Effect runs once per visible→true transition.)
  React.useEffect(() => {
    if (visible) setGame(pickRandomGame());
  }, [visible]);

  if (!visible) return null;

  const GameCard = game.Component;

  return (
    <View style={s.overlay} pointerEvents="box-none">
      {/* Backdrop — tap-through closes. Separate Pressable instead of an
          on-the-view onPress so the sheet's own taps don't bubble up. */}
      <Pressable
        style={s.backdrop}
        onPress={handleClose}
        accessibilityRole="button"
        accessibilityLabel="סגירת המשחק"
      />

      <Animated.View
        entering={FadeInDown.duration(260)}
        style={s.sheet}
        pointerEvents="auto"
      >
        <SafeAreaView edges={['bottom']} style={{ flex: 0 }}>
          {/* Header row: title + emoji RTL, X close on the visual right (RTL
              trailing edge), swap button on the visual left (RTL leading). */}
          <View style={s.header}>
            <Pressable
              onPress={handleClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="סגירת המשחק"
              style={s.closeBtn}
            >
              <X size={20} color="#0c4a6e" strokeWidth={2.6} />
            </Pressable>
            <View style={s.titleWrap}>
              <Text style={s.titleEmoji}>{game.emoji}</Text>
              <Text style={s.titleText} numberOfLines={1}>{game.titleHe}</Text>
            </View>
            <Pressable
              onPress={swapGame}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="משחק אחר"
              style={s.swapBtn}
            >
              <RotateCw size={16} color="#0369a1" strokeWidth={2.6} />
              <Text style={s.swapBtnText}>אחר</Text>
            </Pressable>
          </View>

          <Animated.View entering={FadeIn.duration(220)} style={{ flex: 0 }}>
            <ScrollView
              style={s.scroll}
              contentContainerStyle={[s.scrollContent, { paddingBottom: 16 + insets.bottom }]}
              showsVerticalScrollIndicator={false}
            >
              {/* Each card normalizes its "finished" callback under either
                  onComplete or onContinue. After a finish: swap to a different
                  game so chaining rounds doesn't repeat. */}
              {game.finishProp === 'onComplete' ? (
                <GameCard isActive freePlay onComplete={swapGame} />
              ) : (
                <GameCard isActive freePlay onContinue={swapGame} />
              )}
            </ScrollView>
          </Animated.View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 900,
    ...(Platform.OS === 'web' ? { position: 'fixed' as 'absolute' } : {}),
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2,6,23,0.55)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f0f9ff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    shadowColor: '#0369a1',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -8 },
    elevation: 20,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 10,
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  titleEmoji: { fontSize: 18 },
  titleText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0c4a6e',
    writingDirection: 'rtl',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: 'rgba(14,165,233,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(14,165,233,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.25)',
  },
  swapBtnText: {
    color: '#0369a1',
    fontSize: 12,
    fontWeight: '800',
  },
  scroll: {
    maxHeight: '100%',
  },
  scrollContent: {
    paddingBottom: 12,
  },
});
