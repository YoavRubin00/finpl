import React, { useEffect, useMemo } from 'react';
import { View, Text } from 'react-native';
import { getIsraelDateISO, israelDatePlusDays } from '../../utils/israelTime';
import { useInvestorsJournalStore, currentJournalMonth } from './useInvestorsJournalStore';
import { ForecastSection } from './JournalEventCard';
import { COUNTRY_FLAG } from './journalTypes';

/**
 * The Investors-Journal ↔ Crowd-Wisdom bridge (Yoav 2026-07-04): the friends
 * hub's crowd-wisdom card pins the NEAREST upcoming journal event as a poll.
 * It reuses the exact same store + crowd-question rails as the journal sheet,
 * so one vote counts once and the same real percentages show on both screens.
 * Renders nothing when no event is close (within 10 days) — no filler.
 */
export function JournalEventPoll(): React.ReactElement | null {
  const month = currentJournalMonth();
  const eventsByMonth = useInvestorsJournalStore((s) => s.eventsByMonth);
  const refresh = useInvestorsJournalStore((s) => s.refresh);

  useEffect(() => { void refresh(month); }, [refresh, month]);

  const event = useMemo(() => {
    const today = getIsraelDateISO();
    const horizon = israelDatePlusDays(today, 10);
    const events = eventsByMonth[month] ?? [];
    return events.find((e) => e.outcome === null && e.eventDate >= today && e.eventDate <= horizon) ?? null;
  }, [eventsByMonth, month]);

  if (!event) return null;

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: '#eef2f7' }}>
      {/* Journal-blue accent line */}
      <View style={{ height: 3, backgroundColor: '#2563eb', opacity: 0.85 }} />
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 10 }}>
        <View style={{ flexDirection: 'row-reverse', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#dbeafe', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#93c5fd' }}>
            <Text style={{ fontSize: 10, fontWeight: '900', color: '#1d4ed8' }} maxFontSizeMultiplier={1.2}>
              📅 יומן משקיעים
            </Text>
          </View>
          <Text
            style={{ flexShrink: 1, fontSize: 12, fontWeight: '800', color: '#334155', writingDirection: 'rtl', textAlign: 'right' }}
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
          >
            {COUNTRY_FLAG[event.country]} {event.title}
          </Text>
        </View>
        <ForecastSection event={event} />
      </View>
    </View>
  );
}
