import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, MessageCircle, Send, ChevronDown, ShieldCheck, ScrollText } from 'lucide-react-native';
import { FANTASY, F2_SECTORS, type FantasySectorId } from '../../../constants/theme';
import { tapHaptic } from '../../../utils/haptics';

const TEXT_PRIMARY = '#1f2937';
const TEXT_MUTED = '#6b7280';
const TEXT_FAINT = '#9ca3af';
const FEED_BG = '#f3f4f6';

const NUM_STYLE = { fontVariant: ['tabular-nums' as const] };
const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

type TierKey = 'silver' | 'gold' | 'diamond';
const TIER_META: Record<TierKey, { label: string; emoji: string; color: string; bg: string }> = {
  silver:  { label: 'ליגת הכסף',     emoji: '🥈', color: '#475569', bg: '#f1f5f9' },
  gold:    { label: 'ליגת הזהב',     emoji: '🥇', color: '#a16207', bg: '#fef9c3' },
  diamond: { label: 'ליגת היהלומים', emoji: '💎', color: '#0e7490', bg: '#cffafe' },
};

interface SharedPick {
  ticker: string;
  sector: FantasySectorId;
  weeklyChange: number;
  /** Allocation as % of pool. */
  allocationPct: number;
  isLeverage?: boolean;
}

interface Comment {
  id: string;
  author: string;
  initials: string;
  avatarHue: number; // 0-360
  text: string;
  ago: string;
  likes: number;
}

interface SharedPortfolio {
  id: string;
  author: string;
  initials: string;
  avatarHue: number;
  tier: TierKey;
  totalReturn: number;
  weekDay: number;
  picks: SharedPick[];
  likes: number;
  liked: boolean;
  comments: Comment[];
  caption: string;
}

const MOCK_PORTFOLIOS: SharedPortfolio[] = [
  {
    id: 'pf-1',
    author: 'נועה ש.',
    initials: 'נש',
    avatarHue: 320,
    tier: 'gold',
    totalReturn: 8.42,
    weekDay: 3,
    caption: 'הולכת אול-אין על AI השבוע. NVDA לקפטן. בהצלחה לכולם 🚀',
    picks: [
      { ticker: 'NVDA', sector: 'tech',        weeklyChange: 5.1,  allocationPct: 40, isLeverage: true },
      { ticker: 'OKLO', sector: 'spec_growth', weeklyChange: 8.2,  allocationPct: 20 },
      { ticker: 'TEVA', sector: 'israel',      weeklyChange: 1.6,  allocationPct: 15 },
      { ticker: 'XOM',  sector: 'energy',      weeklyChange: 1.2,  allocationPct: 15 },
      { ticker: 'BTC',  sector: 'crypto',      weeklyChange: 4.1,  allocationPct: 10 },
    ],
    likes: 47,
    liked: false,
    comments: [
      { id: 'c-1a', author: 'דניאל ל.',   initials: 'דל', avatarHue: 200, text: 'אגרסיבי אבל מכובד. למה לא PLTR?',     ago: '12 דק׳', likes: 4 },
      { id: 'c-1b', author: 'יעל מ.',      initials: 'ימ', avatarHue: 90,  text: 'NVDA לקפטן זה הזוי השבוע 🔥',          ago: '8 דק׳',  likes: 12 },
      { id: 'c-1c', author: 'אמיר ר.',     initials: 'אר', avatarHue: 40,  text: 'הייתי שם 25% על OKLO מינימום',         ago: '3 דק׳',  likes: 2 },
    ],
  },
  {
    id: 'pf-2',
    author: 'איתי ב.',
    initials: 'אב',
    avatarHue: 220,
    tier: 'diamond',
    totalReturn: -2.18,
    weekDay: 3,
    caption: 'אסטרטגיית הגנה — תיק יציב במיוחד. נראה מי צוחק אחרון בסוף השבוע.',
    picks: [
      { ticker: 'AAPL', sector: 'tech',        weeklyChange: 2.4,  allocationPct: 30 },
      { ticker: 'JNJ',  sector: 'health' as FantasySectorId, weeklyChange: -0.4, allocationPct: 25 },
      { ticker: 'BEZQ', sector: 'israel',      weeklyChange: 0.5,  allocationPct: 25, isLeverage: true },
      { ticker: 'CVX',  sector: 'energy',      weeklyChange: -1.8, allocationPct: 10 },
      { ticker: 'ETH',  sector: 'crypto',      weeklyChange: 2.9,  allocationPct: 10 },
    ],
    likes: 23,
    liked: true,
    comments: [
      { id: 'c-2a', author: 'רותם פ.',  initials: 'רפ', avatarHue: 280, text: 'BEZQ לקפטן? תעז קצת!',        ago: '1ש׳',  likes: 1 },
      { id: 'c-2b', author: 'גיא ע.',   initials: 'גע', avatarHue: 10,  text: 'תיק שמרני אבל מסודר 👏',        ago: '45 דק׳', likes: 8 },
    ],
  },
  {
    id: 'pf-3',
    author: 'שירה ק.',
    initials: 'שק',
    avatarHue: 160,
    tier: 'silver',
    totalReturn: 14.67,
    weekDay: 3,
    caption: 'נסיון ראשון בליגת הכסף — חידשתי שכל מה שצריך זה לחפש את הספקולציות הטובות. בשטח!',
    picks: [
      { ticker: 'ASTS', sector: 'spec_growth', weeklyChange: 9.1,  allocationPct: 30, isLeverage: true },
      { ticker: 'IONQ', sector: 'spec_growth', weeklyChange: 6.5,  allocationPct: 25 },
      { ticker: 'NVDA', sector: 'tech',        weeklyChange: 5.1,  allocationPct: 20 },
      { ticker: 'SOL',  sector: 'crypto',      weeklyChange: 6.1,  allocationPct: 15 },
      { ticker: 'ENLT', sector: 'israel',      weeklyChange: 2.7,  allocationPct: 10 },
    ],
    likes: 89,
    liked: false,
    comments: [
      { id: 'c-3a', author: 'תום ס.',   initials: 'תס', avatarHue: 320, text: 'מה זה תיק חולה',              ago: '2ש׳',  likes: 27 },
      { id: 'c-3b', author: 'אביב ל.',  initials: 'אל', avatarHue: 130, text: 'ASTS ×2 = גאוני אם זה ימשיך', ago: '1ש׳',  likes: 14 },
      { id: 'c-3c', author: 'הילה כ.',  initials: 'הכ', avatarHue: 50,  text: 'את לוקחת סיכון אסטרונומי',     ago: '20 דק׳', likes: 6 },
    ],
  },
];

// ─── Atoms ──────────────────────────────────────────────────────────────────
function MonoAvatar({ initials, hue, size = 32 }: { initials: string; hue: number; size?: number }): React.ReactElement {
  const bg = `hsl(${hue}, 65%, 78%)`;
  const fg = `hsl(${hue}, 55%, 28%)`;
  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: bg,
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Text style={{ fontSize: size * 0.42, fontWeight: '900', color: fg, letterSpacing: 0.3 }}>
        {initials}
      </Text>
    </View>
  );
}

function TierChip({ tier }: { tier: TierKey }): React.ReactElement {
  const t = TIER_META[tier];
  return (
    <View style={{
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 3,
      backgroundColor: t.bg,
      paddingVertical: 2,
      paddingHorizontal: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: `${t.color}33`,
    }}>
      <Text style={{ fontSize: 10 }}>{t.emoji}</Text>
      <Text style={{ fontSize: 9, fontWeight: '900', color: t.color, letterSpacing: 0.2 }}>
        {t.label}
      </Text>
    </View>
  );
}

function PickPill({ pick }: { pick: SharedPick }): React.ReactElement {
  const sector = F2_SECTORS[pick.sector] ?? F2_SECTORS.tech;
  const positive = pick.weeklyChange >= 0;
  return (
    <View style={{ alignItems: 'center', gap: 4, minWidth: 56 }}>
      <View style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden' }}>
        <LinearGradient
          colors={[sector.g1, sector.g2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: pick.isLeverage ? 2 : 0,
            borderColor: '#facc15',
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '900', color: '#fff', letterSpacing: 0.2 }}>
            {pick.ticker}
          </Text>
          {pick.isLeverage && (
            <Text style={{ fontSize: 7, fontWeight: '900', color: '#fff', opacity: 0.9, marginTop: 1 }}>
              ×2
            </Text>
          )}
        </LinearGradient>
      </View>
      <Text style={[
        {
          fontSize: 10,
          fontWeight: '900',
          color: positive ? FANTASY.positiveDark : FANTASY.negativeDark,
        },
        NUM_STYLE,
      ]}>
        {positive ? '+' : ''}{pick.weeklyChange.toFixed(1)}%
      </Text>
      <Text style={[
        { fontSize: 9, fontWeight: '700', color: TEXT_FAINT },
        NUM_STYLE,
      ]}>
        {pick.allocationPct}%
      </Text>
    </View>
  );
}

function CommentRow({ comment }: { comment: Comment }): React.ReactElement {
  return (
    <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 8, marginTop: 8 }}>
      <MonoAvatar initials={comment.initials} hue={comment.avatarHue} size={26} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{
          backgroundColor: FEED_BG,
          borderRadius: 14,
          paddingVertical: 6,
          paddingHorizontal: 10,
        }}>
          <Text style={{ fontSize: 11, fontWeight: '900', color: TEXT_PRIMARY, ...RTL }} numberOfLines={1}>
            {comment.author}
          </Text>
          <Text style={{ fontSize: 12, color: TEXT_PRIMARY, ...RTL, lineHeight: 17, marginTop: 1 }}>
            {comment.text}
          </Text>
        </View>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingHorizontal: 10, marginTop: 3 }}>
          <Text style={{ fontSize: 10, color: TEXT_FAINT, fontWeight: '700' }}>
            {comment.ago}
          </Text>
          <Pressable hitSlop={6}>
            <Text style={{ fontSize: 10, color: TEXT_MUTED, fontWeight: '800' }}>אהבתי · {comment.likes}</Text>
          </Pressable>
          <Pressable hitSlop={6}>
            <Text style={{ fontSize: 10, color: TEXT_MUTED, fontWeight: '800' }}>הגב</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Portfolio post ─────────────────────────────────────────────────────────
function PortfolioPost({ pf }: { pf: SharedPortfolio }): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  const [likedLocal, setLikedLocal] = useState(pf.liked);
  const [draft, setDraft] = useState('');
  const positive = pf.totalReturn >= 0;
  const visibleComments = expanded ? pf.comments : pf.comments.slice(0, 1);

  return (
    <View style={{ backgroundColor: '#fff', paddingVertical: 12 }}>
      {/* Header: avatar + name + tier + time */}
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingHorizontal: 14 }}>
        <MonoAvatar initials={pf.initials} hue={pf.avatarHue} size={38} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 13, fontWeight: '900', color: TEXT_PRIMARY, ...RTL }} numberOfLines={1}>
            {pf.author}
          </Text>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <TierChip tier={pf.tier} />
            <Text style={{ fontSize: 10, color: TEXT_FAINT, fontWeight: '700' }}>
              · יום {pf.weekDay}/5
            </Text>
          </View>
        </View>
        {/* Total return badge */}
        <View style={{
          backgroundColor: positive ? FANTASY.positiveSoft : FANTASY.negativeSoft,
          borderWidth: 1,
          borderColor: positive ? FANTASY.positiveStroke : FANTASY.negativeStroke,
          paddingVertical: 5,
          paddingHorizontal: 10,
          borderRadius: 10,
          alignItems: 'center',
        }}>
          <Text style={{ fontSize: 8, fontWeight: '900', color: TEXT_FAINT, letterSpacing: 0.6, textTransform: 'uppercase' }}>
            תשואה
          </Text>
          <Text style={[
            {
              fontSize: 16,
              fontWeight: '900',
              color: positive ? FANTASY.positiveDark : FANTASY.negativeDark,
              lineHeight: 17,
            },
            NUM_STYLE,
          ]}>
            {positive ? '+' : ''}{pf.totalReturn.toFixed(2)}%
          </Text>
        </View>
      </View>

      {/* Caption */}
      <Text style={{
        fontSize: 13,
        color: TEXT_PRIMARY,
        ...RTL,
        lineHeight: 19,
        paddingHorizontal: 14,
        marginTop: 10,
      }}>
        {pf.caption}
      </Text>

      {/* Portfolio "screenshot" — 5 picks in a row */}
      <View style={{ marginTop: 12, marginHorizontal: 14 }}>
        <LinearGradient
          colors={['#f8fafc', '#ffffff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#e5e7eb',
            paddingVertical: 12,
            paddingHorizontal: 8,
          }}
        >
          <Text style={{
            fontSize: 9,
            fontWeight: '900',
            color: TEXT_FAINT,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            ...RTL,
            paddingHorizontal: 6,
            marginBottom: 8,
          }}>
            התיק של {pf.author}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexDirection: 'row-reverse', paddingHorizontal: 4, gap: 10 }}
          >
            {pf.picks.map((pick) => (
              <PickPill key={pick.ticker} pick={pick} />
            ))}
          </ScrollView>
        </LinearGradient>
      </View>

      {/* Like / comment counts */}
      <View style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        marginTop: 10,
      }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
          <View style={{
            width: 16, height: 16, borderRadius: 8,
            backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center',
          }}>
            <Heart size={9} color="#fff" fill="#fff" strokeWidth={2.5} />
          </View>
          <Text style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: '700' }}>
            {pf.likes + (likedLocal && !pf.liked ? 1 : 0)}
          </Text>
        </View>
        <Text style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: '700' }}>
          {pf.comments.length} תגובות
        </Text>
      </View>

      {/* Action bar */}
      <View style={{
        flexDirection: 'row-reverse',
        marginHorizontal: 14,
        marginTop: 6,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        paddingTop: 6,
      }}>
        <Pressable
          onPress={() => { tapHaptic(); setLikedLocal((v) => !v); }}
          accessibilityRole="button"
          accessibilityLabel="אהבתי"
          style={({ pressed }) => ({
            flex: 1,
            flexDirection: 'row-reverse',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            paddingVertical: 8,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Heart
            size={16}
            color={likedLocal ? '#ef4444' : TEXT_MUTED}
            fill={likedLocal ? '#ef4444' : 'transparent'}
            strokeWidth={2}
          />
          <Text style={{
            fontSize: 12,
            fontWeight: '800',
            color: likedLocal ? '#ef4444' : TEXT_MUTED,
          }}>
            אהבתי
          </Text>
        </Pressable>
        <Pressable
          onPress={() => { tapHaptic(); setExpanded((v) => !v); }}
          accessibilityRole="button"
          accessibilityLabel="הגב"
          style={({ pressed }) => ({
            flex: 1,
            flexDirection: 'row-reverse',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            paddingVertical: 8,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <MessageCircle size={16} color={TEXT_MUTED} strokeWidth={2} />
          <Text style={{ fontSize: 12, fontWeight: '800', color: TEXT_MUTED }}>הגב</Text>
        </Pressable>
      </View>

      {/* Comments preview */}
      <View style={{ paddingHorizontal: 14 }}>
        {visibleComments.map((comment) => (
          <CommentRow key={comment.id} comment={comment} />
        ))}
        {!expanded && pf.comments.length > 1 && (
          <Pressable
            onPress={() => setExpanded(true)}
            style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 8 }}
            hitSlop={6}
          >
            <Text style={{ fontSize: 11, fontWeight: '900', color: TEXT_MUTED }}>
              צפה בעוד {pf.comments.length - 1} תגובות
            </Text>
            <ChevronDown size={12} color={TEXT_MUTED} strokeWidth={2.5} />
          </Pressable>
        )}
      </View>

      {/* Composer */}
      <View style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        marginTop: 10,
      }}>
        <MonoAvatar initials="את" hue={200} size={26} />
        <View style={{
          flex: 1,
          backgroundColor: FEED_BG,
          borderRadius: 999,
          paddingVertical: 7,
          paddingHorizontal: 12,
          flexDirection: 'row-reverse',
          alignItems: 'center',
          gap: 8,
        }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="כתוב תגובה…"
            placeholderTextColor={TEXT_FAINT}
            style={{
              flex: 1,
              fontSize: 12,
              color: TEXT_PRIMARY,
              textAlign: 'right',
              writingDirection: 'rtl',
              padding: 0,
            }}
          />
          {draft.length > 0 && (
            <Pressable
              onPress={() => { tapHaptic(); setDraft(''); }}
              accessibilityLabel="שלח תגובה"
              hitSlop={8}
            >
              <Send size={14} color="#1877f2" strokeWidth={2.4} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Main card ──────────────────────────────────────────────────────────────
export function PortfolioShareCard(): React.ReactElement {
  const portfolios = useMemo(() => MOCK_PORTFOLIOS, []);

  return (
    <View style={{ backgroundColor: '#fff' }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 4,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
      }}>
        <View style={{
          width: 36, height: 36, borderRadius: 10,
          backgroundColor: FANTASY.primaryTint,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <ScrollText size={18} color={FANTASY.primary} strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '900', color: TEXT_PRIMARY, ...RTL }}>
            תיקי השקעות מהקהילה
          </Text>
          <Text style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: '700', ...RTL, marginTop: 1 }}>
            צילומי תיקים של חברים · הגב, אהב, השווה
          </Text>
        </View>
      </View>

      {/* Posts */}
      {portfolios.map((pf, i) => (
        <React.Fragment key={pf.id}>
          {i > 0 && <View style={{ height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 14 }} />}
          <PortfolioPost pf={pf} />
        </React.Fragment>
      ))}

      {/* Legal disclaimer */}
      <View style={{
        backgroundColor: '#fef2f2',
        borderTopWidth: 1,
        borderTopColor: '#fee2e2',
        paddingVertical: 10,
        paddingHorizontal: 14,
        flexDirection: 'row-reverse',
        alignItems: 'flex-start',
        gap: 8,
      }}>
        <ShieldCheck size={14} color="#b91c1c" strokeWidth={2.4} style={{ marginTop: 1 }} />
        <Text style={{
          flex: 1,
          fontSize: 10,
          color: '#7f1d1d',
          fontWeight: '700',
          lineHeight: 15,
          ...RTL,
        }}>
          התוכן בעמוד זה אינו מהווה ייעוץ השקעות, שיווק השקעות או תחליף לכזה. השיתוף נועד למטרות בידור וקהילה
          במסגרת משחק הפנטזי-ליג בלבד, ואינו מבוסס על נתונים אישיים שלך. כל החלטת השקעה היא באחריותך — היוועץ
          עם בעל רישיון מוסמך לפני ביצוע פעולה אמיתית בשוק ההון.
        </Text>
      </View>
    </View>
  );
}
