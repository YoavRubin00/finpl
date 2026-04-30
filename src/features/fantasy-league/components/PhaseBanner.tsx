import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { CLASH, DUO } from '../../../constants/theme';
import type { CompetitionPhase } from '../fantasyTypes';
import { getCompetitionEnd, getDraftClose, getNextDraftOpen } from '../fantasyData';

interface Props {
  phase: CompetitionPhase;
}

const PHASE_CONFIG: Record<CompetitionPhase, { label: string; emoji: string; color: string }> = {
  pre_draft:   { label: 'ממתין לדראפט',  emoji: '⏳', color: '#94a3b8' },
  draft:       { label: 'דראפט פתוח!',   emoji: '🏹', color: CLASH.goldBorder },
  competition: { label: 'תחרות פעילה',   emoji: '📈', color: '#4ade80' },
  results:     { label: 'הכרזת תוצאות', emoji: '🏆', color: '#f59e0b' },
};

function getTargetDate(phase: CompetitionPhase): Date {
  const now = new Date();
  if (phase === 'pre_draft') return getNextDraftOpen(now);
  if (phase === 'draft') return getDraftClose(now);
  if (phase === 'competition') return getCompetitionEnd(now);
  return getNextDraftOpen(now);
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (days > 0) return `${days}י ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function PhaseBanner({ phase }: Props): React.ReactElement {
  const config = PHASE_CONFIG[phase];
  const [msLeft, setMsLeft] = useState(() => getTargetDate(phase).getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setMsLeft(getTargetDate(phase).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  const isUrgent = phase === 'draft' && msLeft < 3 * 3600 * 1000;

  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginHorizontal: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
      }}
    >
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 18 }}>{config.emoji}</Text>
        <Text
          style={{
            fontSize: 13,
            fontWeight: '800',
            color: config.color,
            writingDirection: 'rtl',
          }}
        >
          {config.label}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-start' }}>
        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', writingDirection: 'rtl' }}>
          {phase === 'pre_draft' ? 'נפתח בעוד' : phase === 'results' ? 'דראפט בעוד' : 'נסגר בעוד'}
        </Text>
        <Text
          style={{
            fontSize: 15,
            fontWeight: '900',
            color: isUrgent ? DUO.red : '#ffffff',
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatCountdown(msLeft)}
        </Text>
      </View>
    </View>
  );
}
