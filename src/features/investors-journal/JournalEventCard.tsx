import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { tapHaptic } from '../../utils/haptics';
import { getIsraelDateISO } from '../../utils/israelTime';
import { useLivePercents } from '../crowd-question/computeLiveStats';
import { GoldCoinIcon } from '../../components/ui/GoldCoinIcon';
import { journalQuestionId, journalVoteBucket, useJournalVote } from './journalCrowd';
import { useInvestorsJournalStore } from './useInvestorsJournalStore';
import { termForKind } from './journalGlossary';
import { KIND_LABEL, COUNTRY_FLAG, type JournalEvent, type JournalKind } from './journalTypes';
import type { CrowdQuestionStats } from '../../db/sync/syncCrowdQuestion';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

/** Per-kind accent — fun, scannable, consistent (Yoav: כיפי וברור). */
const KIND_COLOR: Record<JournalKind, { main: string; soft: string }> = {
  earnings: { main: '#2563eb', soft: '#dbeafe' },
  rate: { main: '#7c3aed', soft: '#ede9fe' },
  cpi: { main: '#ea580c', soft: '#ffedd5' },
  jobs: { main: '#16a34a', soft: '#dcfce7' },
  other: { main: '#0891b2', soft: '#cffafe' },
};

function diffDaysIL(dateISO: string): number {
  const today = new Date(`${getIsraelDateISO()}T00:00:00Z`).getTime();
  const target = new Date(`${dateISO}T00:00:00Z`).getTime();
  return Math.round((target - today) / 86_400_000);
}

function relativeLabel(dateISO: string): { label: string; isToday: boolean; isPast: boolean } {
  const diff = diffDaysIL(dateISO);
  if (diff === 0) return { label: 'היום!', isToday: true, isPast: false };
  if (diff === 1) return { label: 'מחר', isToday: false, isPast: false };
  if (diff > 1) return { label: `בעוד ${diff} ימים`, isToday: false, isPast: false };
  if (diff === -1) return { label: 'אתמול', isToday: false, isPast: true };
  return { label: 'עבר', isToday: false, isPast: true };
}

function dayMonthLabel(dateISO: string): string {
  const d = new Date(`${dateISO}T12:00:00Z`);
  return `${d.getUTCDate()}.${d.getUTCMonth() + 1}`;
}

/** "מה זה ריבית?" pill + sheet — the same make-it-approachable pattern as the
 *  minigames' GlossaryTermPill (Yoav: "שיונגש כמו מה זה דיבידנד במשחקים"). */
function JournalTermPill({ kind }: { kind: JournalKind }): React.ReactElement {
  const [open, setOpen] = useState(false);
  const entry = termForKind(kind);
  return (
    <>
      <Pressable
        onPress={() => { tapHaptic(); setOpen(true); }}
        accessibilityRole="button"
        accessibilityLabel={`פתחו הסבר: מה זה ${entry.term}`}
        hitSlop={10}
        style={styles.termPill}
      >
        <View style={styles.termBadge}>
          <Text style={styles.termBadgeText} allowFontScaling={false}>?</Text>
        </View>
        <Text style={[styles.termLabel, RTL]} maxFontSizeMultiplier={1.2}>מה זה {entry.term}?</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(160)} style={styles.termBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="סגירת ההסבר" />
          <Animated.View entering={SlideInDown.duration(240)} exiting={SlideOutDown.duration(200)} style={styles.termSheet}>
            <View style={styles.termHandle} accessible={false} />
            <View style={styles.termTitleRow}>
              <Text style={styles.termTitleQ} allowFontScaling={false}>?</Text>
              <Text style={[styles.termTitle, RTL]} maxFontSizeMultiplier={1.3}>{entry.term}</Text>
            </View>
            <Text style={[styles.termDefinition, RTL]} maxFontSizeMultiplier={1.4}>{entry.definition}</Text>
            <View style={styles.termExampleBox}>
              <Text style={[styles.termExampleLabel, RTL]} maxFontSizeMultiplier={1.2}>דוגמה</Text>
              <Text style={[styles.termExampleText, RTL]} maxFontSizeMultiplier={1.4}>{entry.example}</Text>
            </View>
            <Pressable
              onPress={() => setOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="הבנתי, סגירה"
              style={styles.termCloseBtn}
              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            >
              <Text style={styles.termCloseText} maxFontSizeMultiplier={1.2}>הבנתי!</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}

function ExplainBlock({ emoji, title, body }: { emoji: string; title: string; body: string }): React.ReactElement {
  return (
    <View style={styles.explainBlock} accessible accessibilityLabel={`${title}: ${body}`}>
      <View style={styles.explainHeader}>
        <Text style={styles.explainEmoji} allowFontScaling={false}>{emoji}</Text>
        <Text style={[styles.explainTitle, RTL]} maxFontSizeMultiplier={1.25}>{title}</Text>
      </View>
      <Text style={[styles.explainBody, RTL]} maxFontSizeMultiplier={1.4}>{body}</Text>
    </View>
  );
}

/** Forecast — vote then REAL community percentages (crowd-question rails).
 *  Exported: the friends-hub CrowdWisdomCard renders the SAME section for the
 *  nearest journal event, so a vote in either surface is one vote everywhere
 *  (Yoav 2026-07-04: "שיתקשרו עם חכמת ההמונים של מסך חברים"). */
export function ForecastSection({ event }: { event: JournalEvent }): React.ReactElement {
  const { votedIndex, submitting, optimisticStats, vote } = useJournalVote(event.id);

  return (
    <View style={styles.forecastWrap}>
      <Text style={[styles.forecastQuestion, RTL]} maxFontSizeMultiplier={1.3}>{event.question}</Text>
      {votedIndex === null && event.outcome === null ? (
        <View style={{ gap: 6 }}>
          {/* Two-camp options — the same green/red visual language as the
              crowd-wisdom card on the friends screen (Yoav 2026-07-04). */}
          {([0, 1] as const).map((idx) => (
            <Pressable
              key={idx}
              onPress={() => vote(idx)}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel={`התחזית שלי: ${idx === 0 ? event.optionA : event.optionB}`}
              style={[idx === 0 ? styles.voteBtnGreen : styles.voteBtnRed, submitting && { opacity: 0.6 }]}
              android_ripple={{ color: idx === 0 ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)' }}
            >
              <Text
                style={[styles.voteBtnText, RTL, { color: idx === 0 ? '#166534' : '#991b1b' }]}
                maxFontSizeMultiplier={1.2}
                numberOfLines={1}
              >
                {idx === 0 ? event.optionA : event.optionB}
              </Text>
            </Pressable>
          ))}
          <Text style={[styles.forecastHint, RTL]} maxFontSizeMultiplier={1.2}>
            בחרו תחזית — ותגלו מה הקהילה חושבת
          </Text>
        </View>
      ) : (
        <ForecastResults event={event} votedIndex={votedIndex} optimisticStats={optimisticStats} />
      )}
    </View>
  );
}

function ForecastResults({
  event,
  votedIndex,
  optimisticStats,
}: {
  event: JournalEvent;
  votedIndex: 0 | 1 | null;
  optimisticStats: CrowdQuestionStats | null;
}): React.ReactElement {
  const live = useLivePercents({
    questionId: journalQuestionId(event.id),
    userVote: votedIndex === null ? null : votedIndex === 0 ? 'a' : 'b',
    optimisticStats,
    voteDateIL: journalVoteBucket(event.id),
  });
  const pcts: [number, number] = [live.pctA, live.pctB];

  // Outcome published → settle up: honest result chip + one-time coins if correct.
  const claimOutcomeReward = useInvestorsJournalStore((s) => s.claimOutcomeReward);
  const [coinsWon, setCoinsWon] = useState(0);
  useEffect(() => {
    if (event.outcome !== null) setCoinsWon(claimOutcomeReward(event));
  }, [event, claimOutcomeReward]);

  const resolved = event.outcome !== null;
  const userCorrect = resolved && votedIndex !== null && votedIndex === event.outcome;

  return (
    <View style={{ gap: 6 }}>
      {/* Same visual language as the Ta35 weekly results on the friends screen:
          green/red camps, fill = real community %, white "הבחירה שלך" pill. */}
      {([0, 1] as const).map((idx) => {
        const isMine = votedIndex === idx;
        const isWinner = resolved && event.outcome === idx;
        const green = idx === 0;
        const pct = pcts[idx];
        return (
          <View
            key={idx}
            accessible
            accessibilityRole="text"
            accessibilityLabel={`${idx === 0 ? event.optionA : event.optionB}: ${live.hasData ? `${pct} אחוז` : 'עדיין אין נתונים'}${isMine ? ', התחזית שלך' : ''}${isWinner ? ', זה מה שקרה' : ''}`}
            style={{
              minHeight: 42,
              borderRadius: 10,
              backgroundColor: '#f1f5f9',
              borderWidth: isMine || isWinner ? 2 : 1,
              borderColor: isWinner ? '#16a34a' : isMine ? (green ? '#16a34a' : '#dc2626') : '#e2e8f0',
              overflow: 'hidden',
              justifyContent: 'center',
            }}
          >
            {live.hasData && (
              <View
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: `${pct}%`,
                  backgroundColor: green ? (isMine ? '#bbf7d0' : '#dcfce7') : isMine ? '#fecaca' : '#fee2e2',
                }}
              />
            )}
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, gap: 6 }}>
              {isWinner && <Text style={{ fontSize: 13 }} allowFontScaling={false}>🎯</Text>}
              <Text
                style={[{ fontSize: 13, fontWeight: isMine ? '900' : '700', color: '#0f172a', flexShrink: 1 }, RTL]}
                maxFontSizeMultiplier={1.2}
                numberOfLines={2}
              >
                {idx === 0 ? event.optionA : event.optionB}
              </Text>
              {isMine && (
                <View
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 6,
                    paddingHorizontal: 5,
                    paddingVertical: 1,
                    borderWidth: 1,
                    borderColor: green ? '#86efac' : '#fecaca',
                  }}
                >
                  <Text
                    style={{ fontSize: 9, fontWeight: '900', color: green ? '#15803d' : '#b91c1c', writingDirection: 'rtl' }}
                    allowFontScaling={false}
                  >
                    ✓ הבחירה שלך
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }} />
              {live.hasData && (
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#0f172a' }} maxFontSizeMultiplier={1.2}>{pct}%</Text>
              )}
            </View>
          </View>
        );
      })}
      <Text style={[styles.forecastHint, RTL]} maxFontSizeMultiplier={1.2}>
        {live.hasData
          ? live.total === 1
            ? 'תחזית אחת — אתם הראשונים!'
            : `${live.total} תחזיות מהקהילה`
          : 'עדיין אוספים תחזיות'}
      </Text>
      {resolved && votedIndex !== null && (
        <View style={[styles.outcomeChip, userCorrect ? styles.outcomeChipWin : styles.outcomeChipMiss]}>
          <Text style={[styles.outcomeChipText, RTL]} maxFontSizeMultiplier={1.2}>
            {userCorrect ? 'צדקתם בתחזית!' : 'לא הפעם — ככה לומדים את השוק'}
          </Text>
          {coinsWon > 0 && (
            <View style={styles.coinWin}>
              <Text style={styles.coinWinText} allowFontScaling={false}>+{coinsWon}</Text>
              <GoldCoinIcon size={13} />
            </View>
          )}
        </View>
      )}
      {resolved && event.outcomeNote ? (
        <Text style={[styles.outcomeNote, RTL]} maxFontSizeMultiplier={1.3}>{event.outcomeNote}</Text>
      ) : null}
    </View>
  );
}

export function JournalEventCard({
  event,
  open,
  onToggle,
}: {
  event: JournalEvent;
  /** Controlled by the sheet — one card open at a time, and a grid-day tap
   *  opens ITS event specifically (Yoav 2026-07-04). */
  open: boolean;
  onToggle: () => void;
}): React.ReactElement {
  const rel = useMemo(() => relativeLabel(event.eventDate), [event.eventDate]);
  const colors = KIND_COLOR[event.kind];
  const resolved = event.outcome !== null;

  return (
    <Animated.View entering={FadeInDown.duration(240)} style={[styles.card, rel.isPast && !resolved && { opacity: 0.82 }]}>
      {/* Premium per-kind accent line */}
      <View style={{ height: 3, backgroundColor: colors.main, opacity: 0.85 }} />
      {/* Header row — always visible */}
      <Pressable
        onPress={() => { tapHaptic(); onToggle(); }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${event.title}, ${KIND_LABEL[event.kind]}, ${rel.label}. הקישו ${open ? 'לסגירה' : 'להרחבה'}`}
        style={styles.headerRow}
        android_ripple={{ color: 'rgba(37,99,235,0.05)' }}
      >
        <View style={[styles.kindCircle, { backgroundColor: colors.soft }, rel.isToday && styles.todayRing]}>
          <Text style={styles.kindEmoji} allowFontScaling={false}>{event.emoji}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, RTL]} numberOfLines={2} maxFontSizeMultiplier={1.25}>{event.title}</Text>
          </View>
          <View style={styles.metaRow}>
            <View style={[styles.kindTag, { backgroundColor: colors.soft }]}>
              <Text style={[styles.kindTagText, { color: colors.main }]} maxFontSizeMultiplier={1.15}>
                {COUNTRY_FLAG[event.country]} {KIND_LABEL[event.kind]}
              </Text>
            </View>
            <Text style={[styles.dateText, rel.isToday && { color: '#ea580c', fontWeight: '900' }]} maxFontSizeMultiplier={1.15}>
              {dayMonthLabel(event.eventDate)} · {rel.label}
            </Text>
            {resolved && (
              <View style={styles.resolvedTag}>
                <Text style={styles.resolvedTagText} maxFontSizeMultiplier={1.15}>יש תוצאה</Text>
              </View>
            )}
          </View>
        </View>
        {open ? <ChevronUp size={18} color="#94a3b8" strokeWidth={2.4} /> : <ChevronDown size={18} color="#94a3b8" strokeWidth={2.4} />}
      </Pressable>

      {/* Expanded body */}
      {open && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.body}>
          {event.teaser.length > 0 && (
            <Text style={[styles.teaser, RTL]} maxFontSizeMultiplier={1.3}>{event.teaser}</Text>
          )}
          <ExplainBlock emoji="🤔" title="מה זה בכלל?" body={event.explainWhat} />
          <ExplainBlock emoji="💡" title="למה אכפת לי?" body={event.explainWhyMe} />
          <ExplainBlock emoji="📈" title="מה זה עושה לשוק?" body={event.explainMarket} />
          <JournalTermPill kind={event.kind} />
          <ForecastSection event={event} />
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginHorizontal: 16,
    marginBottom: 10,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  kindCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayRing: {
    borderWidth: 2.5,
    borderColor: '#f97316',
  },
  kindEmoji: { fontSize: 20 },
  titleRow: { flexDirection: 'row-reverse', alignItems: 'center' },
  title: { flex: 1, fontSize: 14.5, fontWeight: '900', color: '#0f172a', lineHeight: 20 },
  metaRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  kindTag: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  kindTagText: { fontSize: 10.5, fontWeight: '800' },
  dateText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  resolvedTag: { backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  resolvedTagText: { fontSize: 10.5, fontWeight: '800', color: '#15803d' },

  body: { paddingHorizontal: 12, paddingBottom: 14, gap: 10 },
  teaser: { fontSize: 13.5, fontWeight: '800', color: '#334155', lineHeight: 20 },
  explainBlock: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 10, gap: 4 },
  explainHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  explainEmoji: { fontSize: 14 },
  explainTitle: { fontSize: 12.5, fontWeight: '900', color: '#0f172a' },
  explainBody: { fontSize: 13, color: '#334155', lineHeight: 19 },

  termPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(14,165,233,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.3)',
  },
  termBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center' },
  termBadgeText: { fontSize: 12, fontWeight: '900', color: '#ffffff', lineHeight: 18, textAlign: 'center', includeFontPadding: false },
  termLabel: { fontSize: 12.5, fontWeight: '700', color: '#0369a1' },
  termBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  termSheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 34, gap: 14 },
  termHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', marginBottom: 4 },
  termTitleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  termTitleQ: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(14,165,233,0.15)', color: '#0369a1',
    fontSize: 16, fontWeight: '900', textAlign: 'center', lineHeight: 28, overflow: 'hidden',
  },
  termTitle: { flex: 1, fontSize: 20, fontWeight: '900', color: '#0369a1' },
  termDefinition: { fontSize: 15, lineHeight: 24, color: '#1e293b' },
  termExampleBox: { backgroundColor: '#f0f9ff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(14,165,233,0.2)', gap: 4 },
  termExampleLabel: { fontSize: 11, fontWeight: '800', color: '#0891b2', letterSpacing: 0.5 },
  termExampleText: { fontSize: 14, lineHeight: 22, color: '#334155' },
  termCloseBtn: { marginTop: 4, paddingVertical: 14, borderRadius: 14, backgroundColor: '#0369a1', alignItems: 'center' },
  termCloseText: { fontSize: 16, fontWeight: '800', color: '#ffffff' },

  forecastWrap: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    padding: 10,
    gap: 8,
  },
  forecastQuestion: { fontSize: 13.5, fontWeight: '900', color: '#1e3a8a', lineHeight: 19 },
  voteBtnGreen: {
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#86efac',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  voteBtnRed: {
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fecaca',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  voteBtnText: { flex: 1, fontSize: 13, fontWeight: '800' },
  forecastHint: { fontSize: 11, fontWeight: '700', color: '#64748b' },

  outcomeChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  outcomeChipWin: { backgroundColor: '#dcfce7' },
  outcomeChipMiss: { backgroundColor: '#f1f5f9' },
  outcomeChipText: { flex: 1, fontSize: 12.5, fontWeight: '800', color: '#0f172a' },
  coinWin: { flexDirection: 'row-reverse', alignItems: 'center', gap: 3, backgroundColor: '#ffffff', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  coinWinText: { fontSize: 12, fontWeight: '900', color: '#b45309' },
  outcomeNote: { fontSize: 12, color: '#475569', lineHeight: 18 },
});
