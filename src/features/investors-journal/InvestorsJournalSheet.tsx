import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import Animated, { FadeIn } from 'react-native-reanimated';
import { tapHaptic } from '../../utils/haptics';
import { getIsraelDateISO } from '../../utils/israelTime';
import { track } from '../../lib/analytics/events';
import { useInvestorsJournalStore, currentJournalMonth } from './useInvestorsJournalStore';
import { JournalEventCard } from './JournalEventCard';
import type { JournalEvent } from './journalTypes';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const FINN_CALM = require('../../../assets/webp/fin-standard.webp');

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const SCREEN_WIDTH = Dimensions.get('window').width;
// Cell width accounts for EVERYTHING around the 7 columns: sheet margins
// (16×2) + grid card padding (8×2) + 6 inter-cell gaps (4×6) + slack. The
// previous math missed the paddings, so Saturday (the last RTL column —
// where "today" sat) clipped off-screen (Yoav 2026-07-04, screenshot).
const CELL = Math.floor((SCREEN_WIDTH - 16 * 2 - 8 * 2 - 4 * 6 - 10) / 7);
const DAY_LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

const HEB_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

interface DayCell {
  day: number | null;
  dateISO: string | null;
  isToday: boolean;
  eventEmoji: string | null;
}

/** The current Israel month as calendar rows (Sun-first, RTL rendered). */
function buildMonthCells(monthISO: string, todayISO: string, events: JournalEvent[]): DayCell[] {
  const [y, m] = monthISO.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = first.getUTCDay(); // 0 = Sunday
  const byDate = new Map<string, string>();
  for (const e of events) {
    if (!byDate.has(e.eventDate)) byDate.set(e.eventDate, e.emoji);
  }
  const cells: DayCell[] = [];
  for (let i = 0; i < lead; i += 1) cells.push({ day: null, dateISO: null, isToday: false, eventEmoji: null });
  for (let d = 1; d <= daysInMonth; d += 1) {
    const iso = `${monthISO}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, dateISO: iso, isToday: iso === todayISO, eventEmoji: byDate.get(iso) ?? null });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, dateISO: null, isToday: false, eventEmoji: null });
  return cells;
}

interface InvestorsJournalSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * יומן משקיעים — the month's REAL macro events in the streak-journal UX:
 * bottom sheet, month grid as a navigator, chronological event cards below.
 * ONE card open at a time (controlled openId); tapping an event day opens
 * THAT event and scrolls to it. The backdrop is a SIBLING Pressable (never
 * an ancestor of the ScrollView) so scrolling is never hijacked — the
 * "נתקע, אי אפשר לעלות חזרה" fix (Yoav 2026-07-04).
 */
export function InvestorsJournalSheet({ visible, onClose }: InvestorsJournalSheetProps): React.ReactElement | null {
  const insets = useSafeAreaInsets();
  const month = currentJournalMonth();
  const events = useInvestorsJournalStore((s) => s.eventsByMonth)[month] ?? [];
  const refresh = useInvestorsJournalStore((s) => s.refresh);

  const scrollRef = useRef<ScrollView>(null);
  const cardOffsets = useRef<Record<string, number>>({});
  const [loadedOnce, setLoadedOnce] = useState(false);
  // ONE open card at a time; null until the events land, then the next
  // upcoming event opens so the sheet lands on "what's next".
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    void refresh(month).finally(() => setLoadedOnce(true));
    try { track({ name: 'social_action', props: { action_type: 'journal_opened', surface: 'investors_journal' } }); } catch { /* non-fatal */ }
  }, [visible, month, refresh]);

  const todayISO = getIsraelDateISO();
  const cells = useMemo(() => buildMonthCells(month, todayISO, events), [month, todayISO, events]);
  const monthTitle = `${HEB_MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;

  const nextUpcomingId = useMemo(() => {
    const upcoming = events.find((e) => e.eventDate >= todayISO);
    return (upcoming ?? events[0])?.id ?? null;
  }, [events, todayISO]);

  useEffect(() => {
    if (visible && openId === null && nextUpcomingId) setOpenId(nextUpcomingId);
  }, [visible, openId, nextUpcomingId]);

  // The open event's date — highlighted on the grid (premium touch).
  const openDate = useMemo(
    () => events.find((e) => e.id === openId)?.eventDate ?? null,
    [events, openId],
  );

  const openDay = (dateISO: string) => {
    const target = events.find((e) => e.eventDate === dateISO);
    if (!target) return;
    tapHaptic();
    setOpenId(target.id); // open THAT event specifically
    // Scroll after the expand/collapse re-layout settles (onLayout refreshes offsets).
    setTimeout(() => {
      const y = cardOffsets.current[target.id];
      if (typeof y === 'number') scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
    }, 180);
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} accessibilityViewIsModal>
      <View style={styles.overlay}>
        {/* Backdrop — a SIBLING of the sheet, never wraps the ScrollView */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="סגירת יומן המשקיעים" />

        <View style={[styles.sheet, { paddingBottom: Math.max(20, insets.bottom + 10) }]}>
          <View style={styles.handle} accessible={false} />

          {/* Header — premium gradient banner */}
          <LinearGradient
            colors={['#1d4ed8', '#3b82f6', '#38bdf8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerIcon}>
              <Text style={styles.headerEmoji} allowFontScaling={false}>📅</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, RTL]} maxFontSizeMultiplier={1.25}>יומן משקיעים</Text>
              <Text style={[styles.headerSub, RTL]} maxFontSizeMultiplier={1.25}>
                האירועים שמזיזים את השוק · {monthTitle}
              </Text>
            </View>
          </LinearGradient>

          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            {/* Month grid — a navigator: tap an event day to open its card */}
            <View style={styles.grid} accessible accessibilityLabel={`לוח ${monthTitle}. ימים עם אירוע מסומנים; הקשה פותחת את האירוע`}>
              <View style={styles.weekRow}>
                {DAY_LETTERS.map((l) => (
                  <Text key={l} style={styles.dayLetter} allowFontScaling={false}>{l}</Text>
                ))}
              </View>
              {Array.from({ length: cells.length / 7 }, (_, w) => (
                <View key={w} style={styles.weekRow}>
                  {cells.slice(w * 7, w * 7 + 7).map((cell, i) => {
                    const isOpenDay = cell.dateISO !== null && cell.dateISO === openDate;
                    return (
                      <Pressable
                        key={i}
                        disabled={!cell.eventEmoji}
                        onPress={() => cell.dateISO && openDay(cell.dateISO)}
                        android_ripple={cell.eventEmoji ? { color: 'rgba(37,99,235,0.12)' } : undefined}
                        accessibilityRole={cell.eventEmoji ? 'button' : undefined}
                        accessibilityLabel={
                          cell.day
                            ? `${cell.day} ב${monthTitle}${cell.eventEmoji ? ', יש אירוע — הקישו לפתיחה' : ''}${cell.isToday ? ', היום' : ''}`
                            : undefined
                        }
                        style={[
                          styles.dayCell,
                          cell.eventEmoji != null && styles.dayCellEvent,
                          cell.isToday && styles.dayCellToday,
                          isOpenDay && styles.dayCellOpen,
                        ]}
                      >
                        {cell.day !== null && (
                          <>
                            <Text style={[styles.dayNum, cell.isToday && { color: '#ea580c', fontWeight: '900' }]} allowFontScaling={false}>
                              {cell.day}
                            </Text>
                            {cell.eventEmoji ? (
                              <Text style={styles.dayEventEmoji} allowFontScaling={false}>{cell.eventEmoji}</Text>
                            ) : (
                              <View style={{ height: 14 }} />
                            )}
                          </>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* Event cards — chronological, one open at a time */}
            {events.length === 0 ? (
              <Animated.View entering={FadeIn.duration(240)} style={styles.emptyWrap}>
                <ExpoImage source={FINN_CALM} style={{ width: 96, height: 96 }} contentFit="contain" autoplay accessible={false} />
                <Text style={[styles.emptyTitle, { textAlign: 'center', writingDirection: 'rtl' }]} maxFontSizeMultiplier={1.3}>
                  {loadedOnce ? 'חודש שקט בשווקים' : 'טוענים את האירועים…'}
                </Text>
                {loadedOnce && (
                  <Text style={[styles.emptySub, { textAlign: 'center', writingDirection: 'rtl' }]} maxFontSizeMultiplier={1.3}>
                    כשיהיו אירועים גדולים — הם יופיעו כאן
                  </Text>
                )}
              </Animated.View>
            ) : (
              events.map((e) => (
                <View
                  key={e.id}
                  onLayout={(ev) => { cardOffsets.current[e.id] = ev.nativeEvent.layout.y; }}
                >
                  <JournalEventCard
                    event={e}
                    open={openId === e.id}
                    onToggle={() => setOpenId((cur) => (cur === e.id ? null : e.id))}
                  />
                </View>
              ))
            )}

            {/* Legal footer — every explanation stays editorial, never advice */}
            <Text style={[styles.disclaimer, RTL]} maxFontSizeMultiplier={1.3}>
              התוכן ביומן הוא הסבר לימודי בלבד — לא ייעוץ השקעות, לא המלצה ולא תחליף לייעוץ מקצועי.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#cbd5e1',
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEmoji: { fontSize: 20 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#ffffff' },
  headerSub: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginTop: 1 },

  grid: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 2,
    shadowColor: '#3e3c8f',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  weekRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 2,
  },
  dayLetter: {
    width: CELL,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
  },
  dayCell: {
    width: CELL,
    height: CELL + 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellEvent: {
    backgroundColor: '#eff6ff',
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: '#f97316',
    backgroundColor: 'rgba(249,115,22,0.08)',
  },
  dayCellOpen: {
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  dayNum: { fontSize: 11, fontWeight: '700', color: '#334155' },
  dayEventEmoji: { fontSize: 12, marginTop: 1 },

  emptyWrap: { alignItems: 'center', paddingVertical: 26, gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 15, fontWeight: '900', color: '#0f172a' },
  emptySub: { fontSize: 12.5, fontWeight: '700', color: '#64748b' },

  disclaimer: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94a3b8',
    lineHeight: 15,
    marginHorizontal: 20,
    marginTop: 6,
  },
});
