import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronDown, ChevronUp, Share2 } from 'lucide-react-native';
import type { StockAnalysisDeep } from '../types';
import { SharkCommentaryBlock } from './SharkCommentaryBlock';
import { RecommendationChip } from './RecommendationChip';
import { ConfidenceBar } from './ConfidenceBar';
import { shareDeepAnalysis } from '../services/shareAnalysis';
import { tapHaptic } from '../../../utils/haptics';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

/* ────────────────────────────────────────────────────────────────────── */
/* Section primitive: header + collapsible body                           */
/* ────────────────────────────────────────────────────────────────────── */

interface SectionProps {
  title: string;
  emoji?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Section({ title, emoji, defaultOpen = false, children }: SectionProps): React.ReactElement {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e0f2fe',
        overflow: 'hidden',
      }}
    >
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 14,
          backgroundColor: '#f0f9ff',
        }}
      >
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
          {emoji ? <Text style={{ fontSize: 18 }}>{emoji}</Text> : null}
          <Text style={[RTL, { fontWeight: '900', fontSize: 15, color: '#0c4a6e' }]}>
            {title}
          </Text>
        </View>
        {open ? <ChevronUp size={18} color="#0369a1" /> : <ChevronDown size={18} color="#0369a1" />}
      </Pressable>
      {open ? <View style={{ padding: 14, gap: 12 }}>{children}</View> : null}
    </View>
  );
}

function Bullet({ text }: { text: string }): React.ReactElement {
  return (
    <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 8 }}>
      <Text style={{ color: '#0ea5e9', fontSize: 14, marginTop: 2 }}>•</Text>
      <Text style={[RTL, { color: '#0f172a', fontSize: 14, lineHeight: 22, flex: 1 }]}>
        {text}
      </Text>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <View
      style={{
        backgroundColor: '#f8fafc',
        borderRadius: 10,
        padding: 10,
        flex: 1,
        gap: 4,
      }}
    >
      <Text style={[RTL, { color: '#64748b', fontSize: 11, fontWeight: '700' }]}>{label}</Text>
      <Text style={[RTL, { color: '#0f172a', fontSize: 14, fontWeight: '800' }]}>{value}</Text>
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/* Main component                                                         */
/* ────────────────────────────────────────────────────────────────────── */

interface Props {
  data: StockAnalysisDeep;
}

export function DeepAnalysisCard({ data }: Props): React.ReactElement {
  const { fundamental, businessIntel, thesis, sectorMacro, catalysts, summary } = data;

  const sentimentLabelHe: Record<typeof businessIntel.sentiment.label, string> = {
    'very-positive': 'חיובי מאוד',
    positive: 'חיובי',
    neutral: 'ניטרלי',
    negative: 'שלילי',
    'very-negative': 'שלילי מאוד',
    unknown: 'לא ידוע',
  };

  const sectorTrendHe: Record<typeof sectorMacro.sectorTrend, string> = {
    tailwind: 'רוח גבית',
    neutral: 'ניטרלי',
    headwind: 'רוח נגדית',
  };

  return (
    <View style={{ gap: 10 }}>
      {/* Summary header card — always open */}
      <View
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 18,
          padding: 14,
          gap: 12,
          borderWidth: 1,
          borderColor: '#bae6fd',
          shadowColor: '#0369a1',
          shadowOpacity: 0.12,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
        }}
      >
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
            <Text style={[RTL, { color: '#0f172a', fontSize: 18, fontWeight: '900' }]}>
              {data.companyName} ({data.ticker})
            </Text>
            <Text style={[RTL, { color: '#475569', fontSize: 12 }]}>
              דירוג שארק: {summary.ranking === 'Leader' ? 'מוביל' : summary.ranking === 'Challenger' ? 'מתחרה' : 'מאחור'}
            </Text>
          </View>
          <RecommendationChip verdict={summary.verdict} />
        </View>
        <Text style={[RTL, { color: '#0c4a6e', fontSize: 14, lineHeight: 22, fontWeight: '600' }]}>
          {summary.oneLiner}
        </Text>
        <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
          <MiniStat label="פונדמנטלים" value={`${summary.scoreBreakdown.fundamentals.toFixed(1)}/10`} />
          <MiniStat label="מומנטום" value={`${summary.scoreBreakdown.momentum.toFixed(1)}/10`} />
          <MiniStat label="סנטימנט" value={`${summary.scoreBreakdown.sentiment.toFixed(1)}/10`} />
          <MiniStat label="חפיר" value={`${summary.scoreBreakdown.moat.toFixed(1)}/10`} />
        </View>
        <ConfidenceBar value={thesis.conviction * 10} label="קונבישן" />
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[RTL, { color: '#94a3b8', fontSize: 10, fontWeight: '600' }]}>
            הערכה חינוכית בלבד · לא ייעוץ השקעות
          </Text>
          <Pressable
            onPress={() => {
              tapHaptic();
              void shareDeepAnalysis(data);
            }}
            accessibilityRole="button"
            accessibilityLabel="שתף ניתוח"
            style={{
              flexDirection: 'row-reverse',
              alignItems: 'center',
              gap: 6,
              backgroundColor: '#0f172a',
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
            }}
          >
            <Share2 size={13} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>שתף ניתוח</Text>
          </Pressable>
        </View>
      </View>

      {/* 1. Fundamental */}
      <Section title="פונדמנטלים" emoji="📊" defaultOpen>
        <Text style={[RTL, { color: '#0f172a', fontSize: 14, fontWeight: '700' }]}>
          {fundamental.headline}
        </Text>
        <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
          <MiniStat
            label="צמיחת הכנסות"
            value={fundamental.revenueGrowthYoY !== null ? `${fundamental.revenueGrowthYoY.toFixed(1)}%` : 'לא ידוע'}
          />
          <MiniStat label="מזומן" value={fundamental.cashPosition} />
          <MiniStat label="חוב" value={fundamental.debtLoad} />
        </View>
        <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
          <MiniStat
            label="מכפיל רווח (P/E)"
            value={fundamental.valuation.peRatio !== null ? fundamental.valuation.peRatio.toFixed(1) : 'לא ידוע'}
          />
          <MiniStat
            label="PEG"
            value={fundamental.valuation.pegRatio !== null ? fundamental.valuation.pegRatio.toFixed(2) : 'לא ידוע'}
          />
        </View>
        <Text style={[RTL, { color: '#475569', fontSize: 13 }]}>{fundamental.valuation.relativeNote}</Text>

        <Text style={[RTL, { color: '#16a34a', fontSize: 13, fontWeight: '800', marginTop: 4 }]}>נקודות חוזק:</Text>
        {fundamental.highlights.map((h, i) => <Bullet key={i} text={h} />)}

        <Text style={[RTL, { color: '#dc2626', fontSize: 13, fontWeight: '800', marginTop: 4 }]}>סיכונים:</Text>
        {fundamental.risks.map((r, i) => <Bullet key={i} text={r} />)}

        <SharkCommentaryBlock data={fundamental.commentary} />
      </Section>

      {/* 2. Business Intel */}
      <Section title="עומק עסקי" emoji="🔍">
        <Text style={[RTL, { color: '#0f172a', fontSize: 13, fontWeight: '700' }]}>בעלות:</Text>
        <Text style={[RTL, { color: '#475569', fontSize: 13 }]}>
          פנימיים {businessIntel.ownership.insiderPct.toFixed(0)}% · מוסדיים {businessIntel.ownership.institutionalPct.toFixed(0)}% · ציבור {businessIntel.ownership.publicPct.toFixed(0)}%
        </Text>
        <Text style={[RTL, { color: '#475569', fontSize: 13, fontStyle: 'italic' }]}>
          {businessIntel.ownership.note}
        </Text>

        <Text style={[RTL, { color: '#0f172a', fontSize: 13, fontWeight: '700', marginTop: 4 }]}>פעילות פנים:</Text>
        <Text style={[RTL, { color: '#475569', fontSize: 13 }]}>{businessIntel.insiderActivity.detail}</Text>

        <Text style={[RTL, { color: '#0f172a', fontSize: 13, fontWeight: '700', marginTop: 4 }]}>פטנטים:</Text>
        <Text style={[RTL, { color: '#475569', fontSize: 13 }]}>{businessIntel.patentActivity}</Text>

        <Text style={[RTL, { color: '#0f172a', fontSize: 13, fontWeight: '700', marginTop: 4 }]}>
          סנטימנט: {sentimentLabelHe[businessIntel.sentiment.label]}
        </Text>
        <Text style={[RTL, { color: '#475569', fontSize: 13 }]}>{businessIntel.sentiment.summary}</Text>

        <SharkCommentaryBlock data={businessIntel.commentary} />
      </Section>

      {/* 3. Thesis */}
      <Section title="התזה — שני הצדדים" emoji="⚖️">
        <Text style={[RTL, { color: '#16a34a', fontSize: 13, fontWeight: '800' }]}>תזה בולית 🐂:</Text>
        {thesis.bullCase.map((b, i) => <Bullet key={i} text={b} />)}

        <Text style={[RTL, { color: '#dc2626', fontSize: 13, fontWeight: '800', marginTop: 4 }]}>תזה דובית 🐻:</Text>
        {thesis.bearCase.map((b, i) => <Bullet key={i} text={b} />)}

        <Text style={[RTL, { color: '#0c4a6e', fontSize: 13, fontWeight: '800', marginTop: 4 }]}>
          קונבישן: {thesis.conviction}/10 — {thesis.convictionLabel}
        </Text>

        <SharkCommentaryBlock data={thesis.commentary} />
      </Section>

      {/* 4. Sector & Macro */}
      <Section title="סקטור ומאקרו" emoji="🌐">
        <Text style={[RTL, { color: '#0f172a', fontSize: 14, fontWeight: '700' }]}>
          {sectorMacro.sector} · {sectorTrendHe[sectorMacro.sectorTrend]}
        </Text>

        {sectorMacro.peers.length > 0 && (
          <>
            <Text style={[RTL, { color: '#0c4a6e', fontSize: 13, fontWeight: '800', marginTop: 4 }]}>מתחרים:</Text>
            {sectorMacro.peers.map((p, i) => (
              // alignItems:flex-start lets the (potentially 2-line) symbol
              // text align to the top while the single-line delta stays
              // at the top too. flex:1 + numberOfLines on the left text
              // prevents the long "symbol — note" string from overflowing
              // the screen's left edge in RTL (user report 2026-06-04:
              // "בסקטור ומאקרו יש חריגה של הטקסט מהמסך בחלק השמאלי").
              <View key={i} style={{ flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 6 }}>
                <Text
                  style={[RTL, { color: '#475569', fontSize: 13, flex: 1 }]}
                  numberOfLines={2}
                >
                  {p.symbol} — {p.note}
                </Text>
                <Text style={[RTL, { color: '#0369a1', fontSize: 12, fontWeight: '700' }]}>{p.delta}</Text>
              </View>
            ))}
          </>
        )}

        <Text style={[RTL, { color: '#0c4a6e', fontSize: 13, fontWeight: '800', marginTop: 4 }]}>סביבה מאקרו:</Text>
        {sectorMacro.macroNotes.map((m, i) => <Bullet key={i} text={m} />)}

        <SharkCommentaryBlock data={sectorMacro.commentary} />
      </Section>

      {/* 5. Catalysts */}
      <Section title="קטליסטים קרובים" emoji="🚀">
        {catalysts.upcoming.map((c, i) => (
          <View
            key={i}
            style={{
              flexDirection: 'row-reverse',
              gap: 8,
              padding: 10,
              borderRadius: 10,
              backgroundColor:
                c.impact === 'high' ? '#fef3c7' : c.impact === 'medium' ? '#f0f9ff' : '#f8fafc',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={[RTL, { color: '#0f172a', fontSize: 13, fontWeight: '700' }]}>{c.title}</Text>
              <Text style={[RTL, { color: '#64748b', fontSize: 12, marginTop: 2 }]}>{c.timing}</Text>
            </View>
            <Text
              style={{
                color: c.impact === 'high' ? '#b45309' : c.impact === 'medium' ? '#0369a1' : '#64748b',
                fontSize: 11,
                fontWeight: '800',
                alignSelf: 'flex-start',
              }}
            >
              {c.impact === 'high' ? 'גבוה' : c.impact === 'medium' ? 'בינוני' : 'נמוך'}
            </Text>
          </View>
        ))}

        {catalysts.watchList.length > 0 && (
          <>
            <Text style={[RTL, { color: '#0c4a6e', fontSize: 13, fontWeight: '800', marginTop: 4 }]}>
              שווה לעקוב:
            </Text>
            {catalysts.watchList.map((w, i) => <Bullet key={i} text={w} />)}
          </>
        )}

        <SharkCommentaryBlock data={catalysts.commentary} />
      </Section>

      {/* 6. Price targets */}
      <Section title="יעדי מחיר חינוכיים" emoji="🎯">
        <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
          <MiniStat label="תרחיש שלילי" value={`${summary.priceTargets.bear} ${summary.priceTargets.currency}`} />
          <MiniStat label="בסיס" value={`${summary.priceTargets.base} ${summary.priceTargets.currency}`} />
          <MiniStat label="תרחיש חיובי" value={`${summary.priceTargets.bull} ${summary.priceTargets.currency}`} />
        </View>
        <Text style={[RTL, { color: '#475569', fontSize: 12 }]}>
          יעדי המחיר הם תרחישים חינוכיים — לא תחזית מובטחת. השוק לא מבטיח דבר.
        </Text>
        <SharkCommentaryBlock data={summary.closingNote} />
      </Section>
    </View>
  );
}
