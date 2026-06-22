import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { BackButton } from '../../components/ui/BackButton';
import { GrowingTree } from './components/GrowingTree';
import { FINN_WATERING } from '../retention-loops/finnMascotConfig';
import {
  useKnowledgeTreeStore,
  knowledgeTreeView,
  isWateredToday,
} from './useKnowledgeTreeStore';

/**
 * Full-screen "עץ הידע" (Knowledge Tree). The hero is the growing tree at its
 * current cycle stage; below it Captain Shark "waters" it with a speech bubble
 * that either nudges the user to do a value action (not watered today) or
 * celebrates (watered today). Cumulative + cyclical — see useKnowledgeTreeStore.
 */
export function KnowledgeTreeScreen(): React.ReactElement {
  const router = useRouter();
  const wateredDays = useKnowledgeTreeStore((s) => s.wateredDays);
  const lastWateredDate = useKnowledgeTreeStore((s) => s.lastWateredDate);

  const view = knowledgeTreeView(wateredDays);
  const watered = isWateredToday(lastWateredDate);

  // Responsive "watering scene" sizing. The watering webp is wide (Captain
  // Shark on the left + a long water arc); the real GrowingTree sits at the
  // arc's landing point on the right, so the water lands on the tree and the
  // shark never covers it. Proportions match the approved design comp.
  const { width: screenW } = useWindowDimensions();
  const sceneW = Math.min(screenW - 40, 470);
  const sceneH = sceneW * 0.72;
  const sharkW = sceneW * 0.77;
  const sharkH = sharkW * (180 / 384); // animated watering webp aspect ratio
  const treeSize = sceneW * 0.49; // the tree is the hero — keep it large

  const bubbleText = watered
    ? view.isFull
      ? 'יפה! העץ שלך פרח במלואו 🌳 כל הכבוד — מחר מתחיל עץ חדש.'
      : `יפה! השקית את העץ היום 🌱 עוד ${view.daysToNextTree} ${view.daysToNextTree === 1 ? 'יום' : 'ימים'} לעץ מלא.`
    : 'זה עץ הידע שלך, אני לא יכול להשקות אותו לבד. תעשה פעולה אחת היום — שיעור, כלי או אתגר — והעץ יגדל.';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#ecfdf5', '#d1fae5', '#a7f3d0']}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <BackButton color="#047857" />
          <Text style={styles.headerTitle}>עץ הידע</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Scene — Captain Shark (left) waters the REAL GrowingTree (right):
              his long water arc lands on the tree's base, with a clear gap so he
              never covers it. Absolute-positioned to match the design comp. */}
          <Animated.View
            entering={FadeIn.duration(400)}
            style={{ width: sceneW, height: sceneH, alignSelf: 'center', marginTop: 6, marginBottom: 12 }}
          >
            <ExpoImage
              source={FINN_WATERING}
              style={{ position: 'absolute', left: sceneW * 0.01, bottom: sceneH * 0.18, width: sharkW, height: sharkH }}
              contentFit="contain"
              accessible={false}
            />
            <View style={{ position: 'absolute', right: sceneW * 0.04, bottom: sceneH * 0.03 }}>
              <GrowingTree stageIndex={view.displayStage} size={treeSize} />
            </View>
          </Animated.View>

          {/* Speech bubble */}
          <Animated.View entering={FadeInDown.duration(400).delay(140)} style={styles.bubbleWrap}>
            <View style={styles.bubble}>
              <View style={styles.bubbleTail} />
              <Text style={styles.bubbleText}>{bubbleText}</Text>
            </View>
          </Animated.View>

          {/* Forest stats */}
          <Animated.View entering={FadeInDown.duration(400).delay(220)} style={styles.statsRow}>
            <Stat value={String(wateredDays)} label="ימי השקיה" />
            <View style={styles.statDivider} />
            <Stat value={String(view.treesCompleted)} label="עצים גידלת" />
          </Animated.View>

          {/* CTA — only when the tree hasn't been watered today */}
          {!watered && (
            <Animated.View entering={FadeInDown.duration(400).delay(320)} style={{ width: '100%' }}>
              <Pressable
                onPress={() => router.replace('/(tabs)/learn' as never)}
                accessibilityRole="button"
                accessibilityLabel="עשה פעולה והשקה את העץ"
                style={styles.ctaPressable}
              >
                {/* bg on inner View — RN Pressable drops bg on Android otherwise */}
                <View style={styles.cta}>
                  <Text style={styles.ctaText}>בוא נשקה אותו — נלמד משהו</Text>
                </View>
              </Pressable>
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }): React.ReactElement {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ecfdf5' },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#047857',
    writingDirection: 'rtl',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    alignItems: 'center',
  },
  bubbleWrap: { width: '100%', marginBottom: 16 },
  statsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 18,
  },
  stat: { alignItems: 'center', minWidth: 80 },
  statValue: { fontSize: 24, fontWeight: '900', color: '#065f46' },
  statLabel: { fontSize: 12, fontWeight: '700', color: '#059669', writingDirection: 'rtl' },
  statDivider: { width: 1, height: 32, backgroundColor: '#a7f3d0' },
  bubble: {
    width: '100%',
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    position: 'relative',
  },
  bubbleTail: {
    position: 'absolute',
    top: -8,
    left: '50%',
    marginLeft: -7,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#bbf7d0',
  },
  bubbleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#047857',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 21,
  },
  ctaPressable: { width: '100%', borderRadius: 16 },
  cta: {
    backgroundColor: '#10b981',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  ctaText: { fontSize: 16, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl' },
});
