/**
 * ChapterIntroScreen — entry screen for a chapter, shown before the user
 * starts learning. Displays the chapter's interactive mind map (with per-node
 * completion state) and the modules list, plus a "המשך" CTA.
 */
import { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowRight, Check, Lock, Play } from 'lucide-react-native';
import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { MindMapTree } from '../../components/ui/MindMapTree';
import { useChapterStore } from '../chapter-1-content/useChapterStore';
import {
  isModuleAccessible,
  nextAccessibleModule,
} from '../subscription/moduleAccess';
import { tapHaptic, heavyHaptic } from '../../utils/haptics';
import { CHAPTER_CTA_COLORS } from '../finfeed/types';
import { useChapterMindMap } from './useChapterMindMap';

function chapterStoreKey(chapterId: string): string {
  return `ch-${chapterId.split('-')[1]}`;
}

export function ChapterIntroScreen() {
  const params = useLocalSearchParams<{ chapterId?: string }>();
  const chapterId = params.chapterId ?? 'chapter-0';
  const router = useRouter();

  const setCurrentChapter = useChapterStore((s) => s.setCurrentChapter);
  const setCurrentModule = useChapterStore((s) => s.setCurrentModule);

  const { root, chapter, completedModuleIds, lockedModuleIds, moduleIdByPath } =
    useChapterMindMap(chapterId);

  const accent = (CHAPTER_CTA_COLORS[chapterId] ?? CHAPTER_CTA_COLORS['chapter-1']).bg;

  const visibleModules = useMemo(
    () => chapter?.modules.filter((m) => !m.comingSoon) ?? [],
    [chapter],
  );

  const completedCount = useMemo(
    () => visibleModules.filter((m) => completedModuleIds.has(m.id)).length,
    [visibleModules, completedModuleIds],
  );

  const goToModule = useCallback(
    (moduleId: string) => {
      if (!chapter) return;
      const idx = chapter.modules.findIndex((m) => m.id === moduleId);
      if (idx < 0) return;
      tapHaptic();
      setCurrentChapter(chapterStoreKey(chapter.id));
      setCurrentModule(idx);
      router.push(`/lesson/${moduleId}?chapterId=${chapter.id}`);
    },
    [chapter, router, setCurrentChapter, setCurrentModule],
  );

  const handleNodeTap = useCallback(
    (moduleId: string) => {
      if (lockedModuleIds.has(moduleId)) {
        heavyHaptic();
        Alert.alert('מודול נעול', 'יש להשלים את המודולות הקודמות לפני שניגשים לזה.');
        return;
      }
      goToModule(moduleId);
    },
    [lockedModuleIds, goToModule],
  );

  const handleModuleRowTap = useCallback(
    (moduleId: string) => {
      if (!chapter) return;
      if (!isModuleAccessible(moduleId, chapter.id)) {
        heavyHaptic();
        Alert.alert('מודול נעול', 'יש להשלים את המודולות הקודמות לפני שניגשים לזה.');
        return;
      }
      goToModule(moduleId);
    },
    [chapter, goToModule],
  );

  const handleCta = useCallback(() => {
    const next = nextAccessibleModule();
    if (!next) {
      heavyHaptic();
      return;
    }
    tapHaptic();
    setCurrentChapter(next.storeChapterId);
    const ch = chapter;
    if (ch && next.chapterId === ch.id) {
      const idx = ch.modules.findIndex((m) => m.id === next.moduleId);
      if (idx >= 0) setCurrentModule(idx);
    }
    router.push(`/lesson/${next.moduleId}?chapterId=${next.chapterId}`);
  }, [chapter, router, setCurrentChapter, setCurrentModule]);

  if (!chapter || !root) {
    return (
      <SafeAreaView style={styles.containerCenter} edges={['top', 'bottom']}>
        <Text style={styles.errorText}>פרק לא נמצא</Text>
        <AnimatedPressable onPress={() => router.back()} style={styles.backRoundBtn}>
          <ArrowRight size={20} color="#0369a1" />
        </AnimatedPressable>
      </SafeAreaView>
    );
  }

  const next = nextAccessibleModule();
  const allDone = completedCount === visibleModules.length && visibleModules.length > 0;
  const ctaLabel = completedCount === 0 ? 'התחל פרק' : 'המשך';
  const showCrossChapterBanner = next !== null && next.chapterId !== chapter.id;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <AnimatedPressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="חזור"
        >
          <ArrowRight size={22} color="#0369a1" />
        </AnimatedPressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: accent }]} numberOfLines={1}>
            {chapter.title}
          </Text>
          <View style={[styles.progressChip, { borderColor: accent }]}>
            <Text style={[styles.progressChipText, { color: accent }]}>
              {completedCount}/{visibleModules.length} הושלמו
            </Text>
          </View>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Description */}
        <Text style={styles.description} numberOfLines={3} ellipsizeMode="tail">
          {chapter.description}
        </Text>

        {showCrossChapterBanner && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>המשך מהפרק הקודם</Text>
          </View>
        )}

        {/* Mind map section */}
        <View style={styles.mindMapWrap}>
          <Text style={styles.sectionTitle}>מפת הידע של הפרק</Text>
          <Text style={styles.sectionHint}>
            לחץ על נושא להתחלת המודול, או על ענף כדי להתרחב
          </Text>
          <View style={styles.mindMapBox}>
            <MindMapTree
              data={root}
              accentColor={accent}
              completedModuleIds={completedModuleIds}
              lockedModuleIds={lockedModuleIds}
              moduleIdByPath={moduleIdByPath}
              onNodeTap={handleNodeTap}
            />
          </View>
        </View>

        {/* Modules list */}
        <View style={styles.modulesWrap}>
          <Text style={styles.sectionTitle}>מודולות בפרק</Text>
          {visibleModules.map((m, i) => {
            const isCompleted = completedModuleIds.has(m.id);
            const isLocked = lockedModuleIds.has(m.id);
            return (
              <Pressable
                key={m.id}
                onPress={() => handleModuleRowTap(m.id)}
                accessibilityRole="button"
                accessibilityLabel={`${m.title}${isCompleted ? ', הושלם' : isLocked ? ', נעול' : ''}`}
                accessibilityHint={
                  isLocked
                    ? 'נעול. השלם את המודולות הקודמות כדי לפתוח'
                    : isCompleted
                      ? 'לחץ כדי לחזור על המודול'
                      : 'לחץ להתחלת המודול'
                }
                style={[
                  styles.moduleRow,
                  isCompleted && styles.moduleRowDone,
                  isLocked && styles.moduleRowLocked,
                ]}
              >
                <View style={styles.moduleIconWrap}>
                  {isCompleted ? (
                    <Check size={18} color="#16a34a" />
                  ) : isLocked ? (
                    <Lock size={16} color="#94a3b8" />
                  ) : (
                    <Play size={16} color={accent} fill={accent} />
                  )}
                </View>
                <View style={styles.moduleTextWrap}>
                  <Text style={styles.moduleIndex}>מודול {i + 1}</Text>
                  <Text
                    style={[
                      styles.moduleTitle,
                      isCompleted && { color: '#15803d' },
                      isLocked && { color: '#94a3b8' },
                    ]}
                    numberOfLines={2}
                  >
                    {m.title}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Sticky CTA */}
      {allDone ? (
        <View style={styles.ctaWrap}>
          <Text style={styles.allDoneText}>סיימת את הפרק! 🎉</Text>
        </View>
      ) : next ? (
        <View style={styles.ctaWrap}>
          <AnimatedPressable
            onPress={handleCta}
            style={[styles.ctaButton, { backgroundColor: accent }]}
            accessibilityLabel={ctaLabel}
          >
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          </AnimatedPressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eff6ff',
  },
  containerCenter: {
    flex: 1,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0369a1',
    writingDirection: 'rtl',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#f0f9ff',
    borderBottomWidth: 1,
    borderBottomColor: '#bae6fd',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backRoundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  progressChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  progressChipText: {
    fontSize: 12,
    fontWeight: '800',
    writingDirection: 'rtl',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  description: {
    fontSize: 14,
    color: '#475569',
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 22,
    marginBottom: 16,
  },
  banner: {
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#a16207',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  mindMapWrap: {
    marginBottom: 24,
  },
  modulesWrap: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0369a1',
    writingDirection: 'rtl',
    textAlign: 'right',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    writingDirection: 'rtl',
    textAlign: 'right',
    marginBottom: 10,
  },
  mindMapBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    minHeight: 360,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  moduleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  moduleRowDone: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  moduleRowLocked: {
    opacity: 0.55,
  },
  moduleIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  moduleIndex: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    writingDirection: 'rtl',
    textAlign: 'right',
    marginBottom: 2,
  },
  moduleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  ctaWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f0f9ff',
    borderTopWidth: 1,
    borderTopColor: '#bae6fd',
  },
  ctaButton: {
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0369a1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    writingDirection: 'rtl',
  },
  allDoneText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#15803d',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});