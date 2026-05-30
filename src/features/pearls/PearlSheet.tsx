/**
 * Full-screen Pearl sheet — drops over the learn screen when the user taps
 * a pearl node. Plays a short pager of stages:
 *
 *   [optional] profile-question  →  lifestyle video  →  mini-game
 *
 * On the final stage's onContinue the sheet marks the pearl completed in
 * usePearlsStore, dismisses, and pushes the user straight into the lesson
 * of the next module. Exit-mid-flow (X tap) doesn't penalize — the pearl
 * simply stays unlocked for next time.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  BackHandler,
  FlatList,
  Dimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { X } from 'lucide-react-native';

import { STITCH } from '../../constants/theme';
import { tapHaptic } from '../../utils/haptics';
import { useAuthStore } from '../auth/useAuthStore';
import { GlobalWealthHeader } from '../../components/ui/GlobalWealthHeader';
import {
  LIFESTYLE_VIDEOS,
  pickNextLifestyleVideo,
  type LifestyleVideoSpec,
} from '../inter-module-break/lifestyleVideoConfig';
import type { ProfileQuestionKind } from '../onboarding/InModuleProfileQuestion';

import { usePearlsStore } from './usePearlsStore';
import { pearlIdFor, type PearlContent } from './pearlConfig';
import { PearlProgressBar } from './PearlProgressBar';
import { PearlVideoStage } from './stages/PearlVideoStage';
import { PearlGameStage } from './stages/PearlGameStage';
import { PearlProfileQuestionStage } from './stages/PearlProfileQuestionStage';

const SCREEN_W = Dimensions.get('window').width;

interface PearlSheetProps {
  visible: boolean;
  pearl: PearlContent | null;
  onClose: () => void;
}

type StageKind = 'profile-question' | 'video' | 'game';

interface StageDescriptor {
  kind: StageKind;
  index: number;
}

export function PearlSheet({ visible, pearl, onClose }: PearlSheetProps): React.ReactElement | null {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const markCompleted = usePearlsStore((s) => s.markCompleted);

  // Per-render snapshot of profile completeness — drives whether we include
  // the profile-question stage at all. The Pearl asks ONLY if the user
  // didn't answer during the source module's Continue.
  const knowledgeLevelSet = useAuthStore((s) => Boolean(s.profile?.knowledgeLevel));
  const learningTimeSet = useAuthStore((s) => Boolean(s.profile?.learningTime));
  const dailyGoalSet = useAuthStore((s) => Boolean(s.profile?.dailyGoalMinutes));

  const profileQuestionSet = (kind: ProfileQuestionKind): boolean => {
    if (kind === 'knowledgeLevel') return knowledgeLevelSet;
    if (kind === 'learningTime') return learningTimeSet;
    if (kind === 'dailyGoal') return dailyGoalSet;
    return true;
  };

  // Pick the lifestyle video once per sheet open — keep the same clip for
  // the lifetime of this session so re-tapping a pearl during the same
  // session doesn't shuffle videos mid-flow.
  const [video, setVideo] = useState<LifestyleVideoSpec | null>(null);

  // Stages list is derived from the pearl + profile-question gating, computed
  // once per visible-open so the pager indices stay stable.
  const stages = useMemo<StageDescriptor[]>(() => {
    if (!pearl) return [];
    const list: StageDescriptor[] = [];
    let idx = 0;
    if (pearl.profileQuestion && !profileQuestionSet(pearl.profileQuestion)) {
      list.push({ kind: 'profile-question', index: idx++ });
    }
    list.push({ kind: 'video', index: idx++ });
    list.push({ kind: 'game', index: idx++ });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pearl?.afterModuleId, knowledgeLevelSet, learningTimeSet, dailyGoalSet]);

  const [activePage, setActivePage] = useState(0);
  const listRef = useRef<FlatList<StageDescriptor> | null>(null);

  // Reset state on each open. Picking the video here so it's stable across
  // pager paging within a single session — see LIFESTYLE_VIDEOS comment.
  useEffect(() => {
    if (visible && pearl) {
      setActivePage(0);
      // No history-aware avoidance yet — pickNext just needs the empty
      // history array. (We could later persist a seen-list per-user.)
      setVideo(pickNextLifestyleVideo([], []));
    }
  }, [visible, pearl]);

  // Android back: close gracefully.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const goToPage = useCallback((index: number) => {
    listRef.current?.scrollToIndex({ index, animated: true });
    setActivePage(index);
  }, []);

  const handleStageDone = useCallback(() => {
    if (!pearl) return;
    const nextIdx = activePage + 1;
    if (nextIdx < stages.length) {
      goToPage(nextIdx);
      return;
    }
    // Final stage — mark the pearl complete, close the sheet, and push the
    // user into the next module's lesson. The map will show the pearl as
    // completed when the user returns to it.
    markCompleted(pearlIdFor(pearl));
    onClose();
    // Push, not replace — keeps the map underneath so the back stack works
    // naturally if the user backs out of the lesson without finishing.
    router.push(`/lesson/${pearl.nextModuleId}?chapterId=${pearl.chapterId}` as never);
  }, [pearl, activePage, stages.length, goToPage, markCompleted, onClose, router]);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
      if (idx !== activePage) setActivePage(idx);
    },
    [activePage],
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index != null) setActivePage(first.index);
    },
  ).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const renderPage = useCallback(
    ({ item }: { item: StageDescriptor }) => {
      const isActive = item.index === activePage;
      const containerStyle = { width: SCREEN_W, flex: 1 };

      if (!pearl) return <View style={containerStyle} />;

      if (item.kind === 'profile-question' && pearl.profileQuestion) {
        return (
          <View style={containerStyle}>
            <PearlProfileQuestionStage
              isActive={isActive}
              kind={pearl.profileQuestion}
              onDone={handleStageDone}
            />
          </View>
        );
      }
      if (item.kind === 'video' && video) {
        return (
          <View style={containerStyle}>
            <PearlVideoStage isActive={isActive} video={video} onContinue={handleStageDone} />
          </View>
        );
      }
      if (item.kind === 'game') {
        return (
          <View style={containerStyle}>
            <PearlGameStage
              isActive={isActive}
              gameKey={pearl.gameKey}
              onContinue={handleStageDone}
            />
          </View>
        );
      }
      return <View style={containerStyle} />;
    },
    [pearl, video, activePage, handleStageDone],
  );

  if (!visible || !pearl) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <GlobalWealthHeader compact />

        <View style={styles.topBar}>
          <Pressable
            onPress={() => { tapHaptic(); onClose(); }}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="סגור פנינה"
            hitSlop={10}
          >
            <X size={22} color={STITCH.onSurface} strokeWidth={2.6} />
          </Pressable>

          <View style={styles.titleWrap}>
            <Text style={styles.title} allowFontScaling={false}>פנינה</Text>
            <PearlProgressBar total={stages.length} current={activePage} />
          </View>

          {/* Right-side spacer balancing the close button so the title stays centered. */}
          <View style={styles.spacer} />
        </View>

        <Animated.View entering={FadeIn.duration(220)} style={styles.pagerWrap}>
          <FlatList
            ref={listRef}
            data={stages}
            keyExtractor={(s) => `${s.kind}-${s.index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            renderItem={renderPage}
            onMomentumScrollEnd={onMomentumScrollEnd}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={(_, index) => ({
              length: SCREEN_W,
              offset: SCREEN_W * index,
              index,
            })}
            // RTL: swipe right→left advances forward (matches Hebrew reading).
            inverted
          />
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: { flex: 1, alignItems: 'center', gap: 6 },
  title: {
    fontSize: 13,
    fontWeight: '900',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
  },
  spacer: { width: 36 },
  pagerWrap: { flex: 1 },
});
