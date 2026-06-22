import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { treeStageSource } from './components/GrowingTree';
import { FINN_WATERING } from '../retention-loops/finnMascotConfig';
import {
  useKnowledgeTreeStore,
  knowledgeTreeView,
  isWateredToday,
} from './useKnowledgeTreeStore';

/**
 * Profile preview card for "עץ הידע". Shows the current tree stage thumbnail +
 * watering stats; tapping opens the full KnowledgeTreeScreen. When not watered
 * today it surfaces a gentle nudge. Meant to be wrapped by the profile's
 * entrance-animation Animated.View (matches the other profile cards).
 */
export function KnowledgeTreeCard(): React.ReactElement {
  const router = useRouter();
  const wateredDays = useKnowledgeTreeStore((s) => s.wateredDays);
  const lastWateredDate = useKnowledgeTreeStore((s) => s.lastWateredDate);

  const view = knowledgeTreeView(wateredDays);
  const watered = isWateredToday(lastWateredDate);

  return (
    <Pressable
      onPress={() => router.push('/knowledge-tree' as never)}
      accessibilityRole="button"
      accessibilityLabel="עץ הידע"
      style={styles.pressable}
    >
      {/* bg on inner View — RN Pressable drops bg on Android otherwise */}
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.miniScene}>
            <ExpoImage
              source={FINN_WATERING}
              style={styles.miniShark}
              contentFit="contain"
              accessible={false}
            />
            <ExpoImage
              source={treeStageSource(view.displayStage)}
              style={styles.miniTree}
              contentFit="contain"
              accessible={false}
            />
          </View>
          <View style={styles.textBlock}>
            <Text style={styles.title}>עץ הידע</Text>
            <Text style={styles.sub}>
              {wateredDays} ימי השקיה · {view.treesCompleted} עצים
            </Text>
            {!watered && (
              <Text style={styles.nudge}>העץ צמא — השקה אותו היום 🌱</Text>
            )}
          </View>
          <ChevronLeft size={20} color="#059669" strokeWidth={2.4} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { width: '100%', borderRadius: 16, marginBottom: 12 },
  card: {
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(34,197,94,0.45)',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(16,185,129,0.5)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  miniScene: { width: 116, height: 60, position: 'relative' },
  miniShark: { position: 'absolute', left: 0, bottom: 6, width: 74, height: 35 },
  miniTree: { position: 'absolute', right: 0, bottom: 0, width: 46, height: 46 },
  textBlock: { flex: 1, gap: 2 },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#065f46',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  sub: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  nudge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#16a34a',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 1,
  },
});