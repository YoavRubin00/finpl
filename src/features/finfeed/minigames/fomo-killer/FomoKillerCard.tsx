import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, AccessibilityInfo, Pressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { TrendingUp, Users, AlertCircle, BookOpen, ChevronDown, ChevronUp } from 'lucide-react-native';

import { FINN_STANDARD } from '../../../retention-loops/finnMascotConfig';
import { useDailyChallengesStore } from '../../../daily-challenges/use-daily-challenges-store';
import { useDailyLogStore } from '../../../daily-summary/useDailyLogStore';
import {
  CHALLENGE_COIN_REWARD,
  CHALLENGE_XP_REWARD,
  MAX_DAILY_PLAYS,
} from '../../../daily-challenges/daily-challenge-types';
import { FeedStartButton } from '../shared/FeedStartButton';
import { tapHaptic } from '../../../../utils/haptics';

import { FOMO_TOKENS, FOMO_MOTION } from './theme';
import { ChatBubble } from './ChatBubble';
import { ActionChips } from './ActionChips';
import { TypingIndicator } from './TypingIndicator';
import { RevealOverlay } from './RevealOverlay';
import { sampleSession } from './fomoMessages';
import { getPersona } from './personas';
import {
  CORRECT_ACTION,
  type ChatEntry,
  type FomoMessage,
  type FomoPhase,
  type FomoSession,
  type UserAction,
} from './types';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const CENTER_RTL = { writingDirection: 'rtl' as const, textAlign: 'center' as const };

const SESSION_LENGTH = 4;
const STARTING_INVESTMENT = 1000;
const ADD_AMOUNT = 500;

interface Props {
  isActive: boolean;
}

type InternalPhase = FomoPhase;

export const FomoKillerCard = React.memo(function FomoKillerCard({ isActive: _isActive }: Props) {
  const playFomoKiller = useDailyChallengesStore((s) => s.playFomoKiller);
  const hasPlayedToday = useDailyChallengesStore((s) => s.hasFomoKillerPlayedToday());
  const playsToday = useDailyChallengesStore((s) => s.getFomoKillerPlaysToday());

  const [phase, setPhase] = useState<InternalPhase>('intro');
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [typing, setTyping] = useState(false);
  const [index, setIndex] = useState(0);
  const [chipsVisible, setChipsVisible] = useState(false);
  const [session, setSession] = useState<FomoSession>({
    answered: 0,
    correct: 0,
    added: 0,
    invested: STARTING_INVESTMENT,
    portfolio: STARTING_INVESTMENT,
    dismissedCount: 0,
    reportedCount: 0,
  });

  const [seed] = useState(() => Math.floor(Math.random() * 1e9));
  const messageQueue = useMemo(() => sampleSession(SESSION_LENGTH, seed), [seed]);

  const scrollRef = useRef<ScrollView>(null);
  const finalizedRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextMsgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingPlays = Math.max(0, MAX_DAILY_PLAYS - playsToday);

  useEffect(() => () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (nextMsgTimerRef.current) clearTimeout(nextMsgTimerRef.current);
  }, []);

  const scheduleNextMessage = useCallback(
    (nextIndex: number) => {
      if (nextIndex >= messageQueue.length) {
        // Session over → reveal
        setTyping(false);
        nextMsgTimerRef.current = setTimeout(() => setPhase('reveal'), 700);
        return;
      }

      setTyping(true);
      typingTimerRef.current = setTimeout(() => {
        const msg = messageQueue[nextIndex];
        appendMessage(msg);
        setTyping(false);
        setChipsVisible(true);
        AccessibilityInfo.announceForAccessibility(`הודעה חדשה מ-${getPersona(msg.personaId).handle}`);
      }, FOMO_MOTION.typingMs);
    },
    [messageQueue],
  );

  const appendMessage = (msg: FomoMessage) => {
    const persona = getPersona(msg.personaId);
    const entry: ChatEntry = {
      id: `${msg.id}-${Date.now()}`,
      kind: 'other',
      message: msg,
      persona,
      ts: Date.now(),
      state: 'idle',
    };
    setEntries((prev) => [...prev, entry]);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  const handleStart = useCallback(() => {
    if (hasPlayedToday) return;
    setPhase('chatting');
    // Kick off the first message after a beat
    nextMsgTimerRef.current = setTimeout(() => scheduleNextMessage(0), 500);
  }, [hasPlayedToday, scheduleNextMessage]);

  const handleAction = useCallback(
    (action: UserAction) => {
      setChipsVisible(false);
      const current = messageQueue[index];
      if (!current) return;

      const correct = CORRECT_ACTION[current.category] === action;

      setEntries((prev) => {
        const copy = prev.slice();
        const lastOtherIdx = copy.length - 1;
        if (lastOtherIdx >= 0 && copy[lastOtherIdx].kind === 'other') {
          copy[lastOtherIdx] = {
            ...copy[lastOtherIdx],
            state: action === 'ignore' ? 'dismissed' : action === 'report' ? 'reported' : 'added',
          };
        }
        // If user "added", append a self-bubble showing their commitment
        if (action === 'add') {
          copy.push({
            id: `self-${Date.now()}`,
            kind: 'self',
            selfText: `אני מוסיף ${ADD_AMOUNT}₪ 💪 בפנים!`,
            ts: Date.now(),
            state: 'idle',
          });
        }
        return copy;
      });

      setSession((s) => ({
        ...s,
        answered: s.answered + 1,
        correct: s.correct + (correct ? 1 : 0),
        added: s.added + (action === 'add' ? 1 : 0),
        invested: s.invested + (action === 'add' ? ADD_AMOUNT : 0),
        portfolio: s.portfolio + (action === 'add' ? ADD_AMOUNT : 0),
        dismissedCount: s.dismissedCount + (action === 'ignore' ? 1 : 0),
        reportedCount: s.reportedCount + (action === 'report' ? 1 : 0),
      }));

      const next = index + 1;
      setIndex(next);
      // auto-scroll follows after state settles
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
      // Schedule next
      nextMsgTimerRef.current = setTimeout(() => scheduleNextMessage(next), FOMO_MOTION.autoAdvanceMs);
    },
    [index, messageQueue, scheduleNextMessage],
  );

  // Reveal → finalize rewards once
  const perfect = session.added === 0 && session.reportedCount >= SESSION_LENGTH;
  useEffect(() => {
    if (phase !== 'reveal' || finalizedRef.current) return;
    finalizedRef.current = true;
    const today = new Date().toISOString().slice(0, 10);
    playFomoKiller(today, perfect);

    const log = useDailyLogStore.getState();
    log.logEvent({
      type: 'fomo-killer',
      title: 'מחסל הפומו',
      timestamp: Date.now(),
      xpEarned: CHALLENGE_XP_REWARD,
    });
    log.addTodayXP(CHALLENGE_XP_REWARD);
    if (perfect) {
      log.addTodayCoins(CHALLENGE_COIN_REWARD);
    }
    AccessibilityInfo.announceForAccessibility(
      perfect
        ? `שרדת בלי להתפתות. הרווחת ${CHALLENGE_XP_REWARD} נקודות ו-${CHALLENGE_COIN_REWARD} מטבעות`
        : `המניה קרסה ב-87 אחוז. הרווחת ${CHALLENGE_XP_REWARD} נקודות XP`,
    );
  }, [phase, perfect, playFomoKiller]);

  if ((hasPlayedToday && phase === 'intro') || phase === 'result') {
    return (
      <View style={styles.container}>
        <View style={styles.doneShell}>
          <ExpoImage source={FINN_STANDARD} style={styles.finLarge} contentFit="contain" accessible={false} />
          <Text style={[styles.doneTitle, CENTER_RTL]}>מחסל הפומו, הושלם להיום</Text>
          <Text style={[styles.doneSub, CENTER_RTL]}>חזור מחר לסיבוב חדש</Text>
        </View>
      </View>
    );
  }

  if (phase === 'intro') {
    return <IntroScreen remainingPlays={remainingPlays} onStart={handleStart} />;
  }

  // chatting / reveal share the dark chat canvas
  return (
    <View style={styles.container}>
      <View style={styles.darkShell}>
        <TopBar />

        <ScrollView
          ref={scrollRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(300)} style={styles.adminNotice}>
            <AlertCircle size={12} color={FOMO_TOKENS.bubbleMeta} />
            <Text style={styles.adminText} allowFontScaling={false}>
              סימולציה · FinPlay. המטרה: לא להתפתות להוסיף כסף.
            </Text>
          </Animated.View>

          {entries.map((entry) => (
            <ChatBubble key={entry.id} entry={entry} />
          ))}

          {typing && <TypingIndicator />}
        </ScrollView>

        <PortfolioHUD session={session} />

        <ActionChips
          personaName={messageQueue[index]?.personaId ? getPersona(messageQueue[index].personaId).handle : ''}
          visible={chipsVisible && phase === 'chatting'}
          onAction={handleAction}
        />
      </View>

      {phase === 'reveal' && (
        <RevealOverlay
          session={session}
          xpEarned={CHALLENGE_XP_REWARD}
          coinsEarned={perfect ? CHALLENGE_COIN_REWARD : 0}
          perfect={perfect}
          onClose={() => setPhase('result')}
        />
      )}
    </View>
  );
});

function IntroScreen({
  remainingPlays,
  onStart,
}: {
  remainingPlays: number;
  onStart: () => void;
}) {
  const [pumpOpen, setPumpOpen] = useState(false);
  const [shownSecond, setShownSecond] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.introShell}>
        <View style={styles.headerRow}>
          <ExpoImage source={FINN_STANDARD} style={styles.headerAvatar} contentFit="contain" accessible={false} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, RTL]}>מחסל הפומו</Text>
            <Text style={[styles.headerSub, RTL]}>{remainingPlays}/{MAX_DAILY_PLAYS} סבבים נותרו</Text>
          </View>
        </View>

        <Animated.View entering={FadeInUp.duration(320)} style={styles.introBody}>
          <Text style={[styles.introStory, RTL]} allowFontScaling={false}>
            השקעת ₪{STARTING_INVESTMENT.toLocaleString('he-IL')} במניית $MOON. הוסיפו אותך לקבוצת "רוקט מניות VIP".
            עכשיו, כולם צועקים שתוסיף עוד. תחזיק.
          </Text>

          {!shownSecond ? (
            <FeedStartButton
              label="המשך ›"
              onPress={() => { tapHaptic(); setShownSecond(true); }}
              accessibilityLabel="הצג את מטרת המשחק"
            />
          ) : (
            <Animated.View entering={FadeInUp.duration(300)} style={{ gap: 14 }}>
              <Text style={[styles.introGoal, RTL]} allowFontScaling={false}>
                המטרה: לדווח על ספאם, להתעלם מלחץ חברתי, ולא להוסיף כסף.
              </Text>

              <View style={styles.pumpCard}>
                {pumpOpen && (
                  <Animated.View entering={FadeInUp.duration(260)} style={styles.pumpBodyUp}>
                    <Text style={[styles.pumpBodyText, RTL]} allowFontScaling={false}>
                      תרמית: קבוצה קונה נכס זול, יוצרת הייפ מזויף כדי לנפח את המחיר, מוכרת ברווח, ומשאירה את הקטנים עם נכס חסר ערך.
                    </Text>
                  </Animated.View>
                )}
                <Pressable
                  onPress={() => { tapHaptic(); setPumpOpen((v) => !v); }}
                  accessibilityRole="button"
                  accessibilityLabel={`${pumpOpen ? 'סגור' : 'פתח'} הסבר: pump and dump`}
                  accessibilityState={{ expanded: pumpOpen }}
                  hitSlop={12}
                  style={styles.pumpHeader}
                >
                  <BookOpen size={14} color="#0891b2" strokeWidth={2.5} />
                  <Text style={[styles.pumpTitle, RTL]} allowFontScaling={false}>
                    מה זה pump and dump?
                  </Text>
                  {pumpOpen ? (
                    <ChevronDown size={16} color="#0891b2" strokeWidth={3} />
                  ) : (
                    <ChevronUp size={16} color="#0891b2" strokeWidth={3} />
                  )}
                </Pressable>
              </View>

              <FeedStartButton
                label="בואו נתחיל"
                onPress={onStart}
                accessibilityLabel="התחל סבב מחסל הפומו"
              />
            </Animated.View>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

function TopBar() {
  return (
    <View style={styles.topBar}>
      <View style={styles.topBarRow}>
        <View style={styles.groupIconWrap}>
          <Text style={styles.groupIcon} allowFontScaling={false}>🚀</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.groupName, RTL]} allowFontScaling={false}>
            רוקט מניות VIP 💎
          </Text>
          <View style={styles.participantsRow}>
            <Users size={10} color={FOMO_TOKENS.bubbleMeta} />
            <Text style={styles.participants} allowFontScaling={false}>
              12,847 משתתפים
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function PortfolioHUD({ session }: { session: FomoSession }) {
  const delta = session.portfolio - session.invested;
  const pct = Math.round((delta / session.invested) * 100);
  const isPos = delta >= 0;
  return (
    <View
      style={styles.hud}
      accessibilityLiveRegion="polite"
      accessibilityLabel={`תיק השקעות: ${session.portfolio} שקלים. שינוי: ${pct} אחוז`}
    >
      <TrendingUp size={14} color={isPos ? FOMO_TOKENS.hudDeltaPos : FOMO_TOKENS.hudDeltaNeg} strokeWidth={3} />
      <Text style={[styles.hudValue, RTL]} allowFontScaling={false}>
        ₪{session.portfolio.toLocaleString('he-IL')}
      </Text>
      <View style={styles.hudDivider} />
      <Text
        style={[
          styles.hudDelta,
          { color: isPos ? FOMO_TOKENS.hudDeltaPos : FOMO_TOKENS.hudDeltaNeg },
        ]}
        allowFontScaling={false}
      >
        {isPos ? '+' : ''}{pct}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // `flex: 1` so the card fills the feed tile exactly; the parent renderItem
  // clips at `height: listHeight` with `overflow: hidden`, which means any
  // content that grows past the viewport not only vanishes but also stops
  // receiving touches on Android, that's why the bottom action chips felt
  // dead. Letting the chat ScrollView shrink via flex keeps ActionChips
  // anchored at the visible bottom and tappable.
  container: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  darkShell: {
    flex: 1,
    backgroundColor: FOMO_TOKENS.canvas,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: FOMO_TOKENS.chromeBorder,
    overflow: 'hidden',
  },
  introShell: {
    backgroundColor: '#f0f9ff',
    borderRadius: 20,
    padding: 18,
    gap: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.2)',
  },
  doneShell: {
    backgroundColor: '#f0f9ff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.2)',
  },
  finLarge: {
    width: 96,
    height: 96,
  },
  doneTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0369a1',
  },
  doneSub: {
    fontSize: 14,
    color: '#64748b',
  },

  // Intro
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 44,
    height: 44,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0369a1',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  introBody: {
    gap: 14,
  },
  introStory: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1e293b',
    fontWeight: '600',
  },
  introGoal: {
    fontSize: 13,
    lineHeight: 20,
    color: '#0369a1',
    fontWeight: '800',
  },

  // Pump-and-dump toggle, body slides up (reveal appears above the header).
  pumpCard: {
    position: 'relative',
  },
  pumpHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(224,242,254,0.85)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.3)',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  pumpTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
    color: '#0891b2',
    letterSpacing: 0.3,
  },
  pumpBodyUp: {
    marginBottom: 8,
    backgroundColor: '#f0f9ff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.3)',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  pumpBodyText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#1e293b',
    fontWeight: '600',
  },

  // Top bar inside dark shell
  topBar: {
    backgroundColor: FOMO_TOKENS.chrome,
    borderBottomWidth: 1,
    borderBottomColor: FOMO_TOKENS.chromeBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  topBarRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  groupIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupIcon: {
    fontSize: 18,
    lineHeight: 20,
  },
  groupName: {
    color: FOMO_TOKENS.bubbleText,
    fontSize: 14,
    fontWeight: '900',
  },
  participantsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  participants: {
    color: FOMO_TOKENS.bubbleMeta,
    fontSize: 11,
    fontWeight: '600',
  },

  // Chat, `flex: 1` so the scroll area shrinks as needed to keep the
  // portfolio HUD + ActionChips inside the tile (and therefore tappable).
  chatArea: {
    flex: 1,
    paddingHorizontal: 10,
  },
  chatContent: {
    paddingVertical: 12,
    gap: 2,
  },
  adminNotice: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    backgroundColor: 'rgba(125,211,252,0.08)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  adminText: {
    color: FOMO_TOKENS.bubbleMeta,
    fontSize: 10,
    fontWeight: '700',
  },

  // HUD
  hud: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: FOMO_TOKENS.hudBg,
    borderTopWidth: 1,
    borderTopColor: FOMO_TOKENS.hudBorder,
    borderBottomWidth: 1,
    borderBottomColor: FOMO_TOKENS.hudBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  hudValue: {
    color: FOMO_TOKENS.hudValue,
    fontSize: 16,
    fontWeight: '900',
  },
  hudDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(148,163,184,0.35)',
  },
  hudDelta: {
    fontSize: 14,
    fontWeight: '900',
  },
});
