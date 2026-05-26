import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { ChevronRight, Plus } from 'lucide-react-native';

import { STITCH } from '../../constants/theme';
import { tapHaptic } from '../../utils/haptics';
import { FINN_HAPPY, FINN_STANDARD } from '../retention-loops/finnMascotConfig';
import {
  CalculateButton,
  LegalDisclaimer,
  SectionLabel,
} from '../financial-tools/components/atoms';
import { useNetWorthStore } from './useNetWorthStore';
import type { Asset } from './assetCatalog';
import { NetWorthSummary } from './components/NetWorthSummary';
import { AssetRow } from './components/AssetRow';
import { InvestmentNudgeCard } from './components/InvestmentNudgeCard';
import { AssetEditModal } from './AssetEditModal';

/**
 * Main screen — user's real assets dashboard.
 * Empty state nudges to add the first asset; populated state shows a list
 * with a sticky FAB. Tap a row → edit modal. Long-press is delegated to the
 * modal's delete button (cleaner UX than two destructive paths).
 */
export function NetWorthDashboardScreen(): React.ReactElement {
  const router = useRouter();
  const assets = useNetWorthStore((s) => s.assets);
  const totalValue = useNetWorthStore((s) => s.totalValue());
  const totalLiquid = useNetWorthStore((s) => s.totalLiquid());
  const monthlyDeposit = useNetWorthStore((s) => s.totalMonthlyDeposit());
  const annualGrowth = useNetWorthStore((s) => s.projectedAnnualGrowth());
  const yoyDeltaPct = useNetWorthStore((s) => s.yoyDeltaPct());

  const [editing, setEditing] = useState<Asset | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  /** Idle = sitting in cash + checking. These accounts produce no growth, so they're prime targets for the "put it to work" nudge. */
  const idleCash = assets
    .filter((a) => a.type === 'cash' || a.type === 'checking')
    .reduce((s, a) => s + a.value, 0);

  const handleEdit = useCallback((asset: Asset) => {
    setEditing(asset);
    setModalVisible(true);
  }, []);
  const handleAdd = useCallback(() => {
    tapHaptic();
    setEditing(null);
    setModalVisible(true);
  }, []);
  const handleClose = useCallback(() => {
    setModalVisible(false);
    setEditing(null);
  }, []);

  const isEmpty = assets.length === 0;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            tapHaptic();
            // The dashboard is conceptually owned by the Financial Tools hub —
            // always return there, not to whatever screen happened to push it.
            router.replace('/(tabs)/tools' as never);
          }}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="חזרה לכלים"
          hitSlop={10}
        >
          <ChevronRight size={22} color={STITCH.onSurface} strokeWidth={2.6} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text accessibilityRole="header" style={styles.title}>
            הנכסים שלי
          </Text>
          <Text style={styles.subtitle}>המידע נשמר רק במכשיר שלכם</Text>
        </View>
        <ExpoImage
          source={FINN_STANDARD}
          accessible={false}
          style={styles.sharkAvatar}
          contentFit="contain"
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <NetWorthSummary
          totalValue={totalValue}
          totalLiquid={totalLiquid}
          monthlyDeposit={monthlyDeposit}
          annualGrowth={annualGrowth}
          yoyDeltaPct={yoyDeltaPct}
        />

        {isEmpty ? (
          <View style={styles.emptyCard}>
            <ExpoImage
              source={FINN_HAPPY}
              accessible={false}
              style={styles.emptyFinn}
              contentFit="contain"
            />
            <Text style={styles.emptyTitle}>בואו נמפה את התמונה הפיננסית שלכם</Text>
            <Text style={styles.emptyBody}>
              הוסיפו את הנכסים שלכם — קרן פנסיה, השקעות, נדל"ן, מזומן — וקבלו תמונה
              שלמה של השווי הנקי שלכם והפוטנציאל לצמיחה.
            </Text>
            <CalculateButton
              label="הוסיפו את הנכס הראשון"
              variant="pink"
              onPress={handleAdd}
              iconLeft={<Plus size={18} color="#ffffff" strokeWidth={2.8} />}
            />
          </View>
        ) : (
          <>
            <SectionLabel action="+ הוסף נכס" onActionPress={handleAdd}>
              {`${assets.length} נכסים`}
            </SectionLabel>
            <View style={styles.listGap}>
              {assets.map((a) => (
                <AssetRow key={a.id} asset={a} onPress={handleEdit} />
              ))}
            </View>

            <InvestmentNudgeCard idleCash={idleCash} />
          </>
        )}
      </ScrollView>

      {!isEmpty ? (
        <Pressable
          onPress={handleAdd}
          style={styles.fab}
          accessibilityRole="button"
          accessibilityLabel="הוסף נכס"
        >
          <Plus size={26} color="#ffffff" strokeWidth={3} />
        </Pressable>
      ) : null}

      <AssetEditModal
        visible={modalVisible}
        asset={editing}
        onClose={handleClose}
      />
    </SafeAreaView>
  );
}

const ACCENT = '#ec4899';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: STITCH.background },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: STITCH.surfaceLowest,
    borderBottomWidth: 1,
    borderBottomColor: STITCH.surfaceHighest,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: STITCH.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: STITCH.onSurface,
    letterSpacing: -0.3,
    writingDirection: 'rtl',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: STITCH.onSurfaceVariant,
    marginTop: 2,
    writingDirection: 'rtl',
  },
  scroll: { padding: 16, paddingBottom: 120, gap: 14 },
  listGap: { gap: 10 },

  emptyCard: {
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    alignItems: 'center',
    gap: 10,
  },
  emptyFinn: { width: 100, height: 100, marginBottom: 4 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: STITCH.onSurface,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  emptyBody: {
    fontSize: 13,
    fontWeight: '600',
    color: STITCH.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 19,
    writingDirection: 'rtl',
    marginBottom: 6,
  },

  sharkAvatar: { width: 40, height: 40 },
  fab: {
    position: 'absolute',
    bottom: 26,
    left: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: STITCH.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: STITCH.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
