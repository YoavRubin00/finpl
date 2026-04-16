import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, AccessibilityInfo } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Extrapolation,
  FadeIn,
  FadeInDown,
  FadeInUp,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { errorHaptic, heavyHaptic, successHaptic } from '../../../../utils/haptics';
import { ConfettiExplosion } from '../../../../components/ui/ConfettiExplosion';
import { FlyingRewards } from '../../../../components/ui/FlyingRewards';
import { LottieIcon } from '../../../../components/ui/LottieIcon';
import { FINN_EMPATHIC, FINN_HAPPY, FINN_STANDARD } from '../../../retention-loops/finnMascotConfig';
import { useDailyChallengesStore } from '../../../daily-challenges/use-daily-challenges-store';
import { useDailyLogStore } from '../../../daily-summary/useDailyLogStore';
import { CHALLENGE_COIN_REWARD, CHALLENGE_XP_REWARD, MAX_DAILY_PLAYS } from '../../../daily-challenges/daily-challenge-types';

import { AD_TEMPLATES, STAMP_FRAME_GREEN, STAMP_FRAME_RED } from './adTemplates';
import { getTodayBullshitAds } from './bullshitAdsData';
import type { BullshitAd, BullshitRoundResult } from './types';
import { GlossaryTermPill } from '../shared/GlossaryTermPill';

const LOTTIE_MAGNIFIER = require('../../../../../assets/lottie/wired-flat-1173-shark-hover-pinch.json');
const LOTTIE_APPROVED = require('../../../../../assets/lottie/wired-flat-24-approved-checked-hover-pinch.json');
const LOTTIE_ERROR = require('../../../../../assets/lottie/wired-flat-25-error-cross-hover-pinch.json');

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const RTL_CENTER = { writingDirection: 'rtl' as const, textAlign: 'center' as const };
const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const FEEDBACK_DURATION = 2400;

interface Props {
  isActive: boolean;
}

function AdCardFront({ ad }: { ad: BullshitAd }) {
  const template = AD_TEMPLATES[ad.templateId];
  const headlineScale = useSharedValue(1);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    headlineScale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 800 }),
        withTiming(1, { duration: 800 }),
      ),
      -1,
      true,
    );
  }, [headlineScale, reduceMotion]);

  const headlineStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headlineScale.value }],
  }));

  const isScam = template.moodTag === 'scam';

  return (
    <View style={styles.adCardInner}>
      <LinearGradient
        colors={template.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <ExpoImage
        source={template.image}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        accessible={false}
      />

      {ad.badge && (
        <View
          style={[
            styles.badge,
            { backgroundColor: isScam ? '#dc2626' : 'rgba(255,255,255,0.15)' },
          ]}
        >
          <Text style={[styles.badgeText, { color: isScam ? '#ffffff' : template.accentColor }]}>
            {ad.badge}
          </Text>
        </View>
      )}

      <View style={styles.headlineWrap}>
        <Animated.Text
          style={[
            styles.headline,
            RTL_CENTER,
            {
              color: template.textColor,
              textShadowColor: isScam ? template.accentColor : 'rgba(0,0,0,0.4)',
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: isScam ? 10 : 4,
            },
            headlineStyle,
          ]}
          numberOfLines={3}
        >
          {ad.headline}
        </Animated.Text>

        {ad.subheadline && (
          <Text
            style={[
              styles.subheadline,
              RTL_CENTER,
              { color: template.textColor, opacity: 0.92 },
            ]}
            numberOfLines={2}
          >
            {ad.subheadline}
          </Text>
        )}
      </View>

      <Text
        style={[
          styles.disclaimer,
          RTL,
          {
            color: template.textColor,
            opacity: isScam ? 0.35 : 0.85,
            fontSize: isScam ? 9 : 11,
          },
        ]}
      >
        {ad.disclaimer}
      </Text>
    </View>
  );
}

function DropStamp({ kind }: { kind: 'bullshit' | 'legit' }) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(reduceMotion ? 1 : 3);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const flashOpacity = useSharedValue(0);
  const initialRotation = kind === 'bullshit' ? -25 : 25;
  const finalRotation = kind === 'bullshit' ? -8 : 8;
  const rotate = useSharedValue(reduceMotion ? finalRotation : initialRotation);

  const triggerSlapHaptic = useCallback(() => {
    heavyHaptic();
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      AccessibilityInfo.announceForAccessibility(
        kind === 'bullshit' ? 'חותמת בולשיט נחתה על הפרסומת' : 'חותמת לגיטימי נחתה על הפרסומת',
      );
      return;
    }
    opacity.value = withTiming(1, { duration: 140 });
    scale.value = withSpring(1, { damping: 8, stiffness: 120 }, (finished) => {
      if (finished) runOnJS(triggerSlapHaptic)();
    });
    rotate.value = withSpring(finalRotation, { damping: 10 });
    flashOpacity.value = withDelay(
      180,
      withSequence(
        withTiming(0.55, { duration: 60 }),
        withTiming(0, { duration: 220 }),
      ),
    );
    AccessibilityInfo.announceForAccessibility(
      kind === 'bullshit' ? 'חותמת בולשיט נחתה על הפרסומת' : 'חותמת לגיטימי נחתה על הפרסומת',
    );
  }, [scale, opacity, rotate, flashOpacity, finalRotation, kind, reduceMotion, triggerSlapHaptic]);

  const stampStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const isBS = kind === 'bullshit';
  const frameSource = isBS ? STAMP_FRAME_RED : STAMP_FRAME_GREEN;
  const stampColor = isBS ? '#dc2626' : '#16a34a';

  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, styles.flashOverlay, flashStyle]} pointerEvents="none" />
      <Animated.View style={[styles.stampWrap, stampStyle]} pointerEvents="none">
        <View style={styles.stampFrameBox}>
          <ExpoImage source={frameSource} style={StyleSheet.absoluteFill} contentFit="contain" accessible={false} />
          <View style={styles.stampTextCenter}>
            <Text style={[styles.stampEn, { color: stampColor }]}>
              {isBS ? 'BULLSHIT' : 'LEGIT'}
            </Text>
            <Text style={[styles.stampHe, { color: stampColor }]}>
              {isBS ? 'בולשיט' : 'לגיטימי'}
            </Text>
          </View>
        </View>
      </Animated.View>
    </>
  );
}

function SwipeableAdCard({
  ad,
  onSwipe,
}: {
  ad: BullshitAd;
  onSwipe: (userSaidBullshit: boolean) => void;
}) {
  const translateX = useSharedValue(0);
  const rotation = useSharedValue(0);
  const swiped = useSharedValue(false);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (swiped.value) return;
      translateX.value = event.translationX;
      rotation.value = interpolate(
        event.translationX,
        [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
        [-12, 0, 12],
        Extrapolation.CLAMP,
      );
    })
    .onEnd((event) => {
      if (swiped.value) return;
      if (event.translationX < -SWIPE_THRESHOLD) {
        swiped.value = true;
        translateX.value = withTiming(-SCREEN_WIDTH * 1.4, { duration: 280 });
        runOnJS(onSwipe)(true);
      } else if (event.translationX > SWIPE_THRESHOLD) {
        swiped.value = true;
        translateX.value = withTiming(SCREEN_WIDTH * 1.4, { duration: 280 });
        runOnJS(onSwipe)(false);
      } else {
        translateX.value = withSpring(0);
        rotation.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const leftHintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
  }));

  const rightHintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[styles.adCard, cardStyle]}
        accessibilityRole="button"
        accessibilityLabel={`פרסומת: ${ad.headline}`}
        accessibilityHint="החלק שמאלה אם זו פרסומת מטעה, ימינה אם זו פרסומת לגיטימית"
      >
        <AdCardFront ad={ad} />

        <Animated.View style={[styles.hintOverlay, styles.hintLeft, leftHintStyle]} accessible={false}>
          <ExpoImage source={FINN_EMPATHIC} style={styles.hintFin} contentFit="contain" accessible={false} />
          <Text style={styles.hintLabelBullshit}>בולשיט!</Text>
        </Animated.View>

        <Animated.View style={[styles.hintOverlay, styles.hintRight, rightHintStyle]} accessible={false}>
          <ExpoImage source={FINN_HAPPY} style={styles.hintFin} contentFit="contain" accessible={false} />
          <Text style={styles.hintLabelLegit}>לגיטימי</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const SHARK_WIN_TITLES = [
  'חוש הבלש שלך חד',
  'תפסת אותם',
  'כריש אמיתי מריח עוקץ',
];
const SHARK_LOSE_TITLES = [
  'העוקץ החליק הפעם',
  'יש לחדד את האף הפיננסי',
  'מוכנים לסיבוב הבא',
];

function CaptainSharkSpeech({
  result,
}: {
  result: BullshitRoundResult;
}) {
  const imageSource = result.correct ? FINN_HAPPY : FINN_EMPATHIC;
  const titlePool = result.correct ? SHARK_WIN_TITLES : SHARK_LOSE_TITLES;
  const title = titlePool[result.ad.id.charCodeAt(0) % titlePool.length];
  const headerColor = result.correct ? '#16a34a' : '#dc2626';
  const a11yLabel = `${result.correct ? 'צדקת.' : 'לא נכון.'} ${result.ad.explanation}`;

  return (
    <Animated.View
      entering={FadeInUp.duration(260)}
      style={styles.sharkBubble}
      accessibilityLiveRegion="polite"
      accessibilityLabel={a11yLabel}
    >
      <View style={styles.sharkRow}>
        <View style={styles.sharkAvatarWrap}>
          <ExpoImage source={imageSource} style={styles.sharkAvatar} contentFit="cover" accessible={false} />
        </View>
        <View style={styles.sharkTextCol}>
          <Text style={[styles.sharkTitle, RTL, { color: headerColor }]}>{title}</Text>
          <Text style={[styles.sharkBody, RTL]} numberOfLines={4}>
            {result.ad.explanation}
          </Text>
          {result.ad.glossaryKeys && result.ad.glossaryKeys.length > 0 && (
            <View style={styles.glossaryRow}>
              {result.ad.glossaryKeys.map((k) => (
                <GlossaryTermPill key={k} glossaryKey={k} />
              ))}
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

export const BullshitSwipeCard = React.memo(function BullshitSwipeCard({ isActive: _isActive }: Props) {
  const playBullshitSwipe = useDailyChallengesStore((s) => s.playBullshitSwipe);
  const hasPlayedToday = useDailyChallengesStore((s) => s.hasBullshitSwipePlayedToday());
  const playsToday = useDailyChallengesStore((s) => s.getBullshitSwipePlaysToday());

  const [adsThisRound] = useState<BullshitAd[]>(() => getTodayBullshitAds());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<BullshitRoundResult[]>([]);
  const [feedback, setFeedback] = useState<BullshitRoundResult | null>(null);
  const [gameState, setGameState] = useState<'playing' | 'done'>('playing');
  const [showConfetti, setShowConfetti] = useState(false);
  const [showFlyingRewards, setShowFlyingRewards] = useState(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confettiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalizedRef = useRef(false);

  useEffect(() => () => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    if (confettiTimer.current) clearTimeout(confettiTimer.current);
  }, []);

  const score = results.filter((r) => r.correct).length;
  const remainingPlays = Math.max(0, MAX_DAILY_PLAYS - playsToday);

  const finalize = useCallback(
    (finalResults: BullshitRoundResult[]) => {
      if (finalizedRef.current) return;
      finalizedRef.current = true;
      const finalScore = finalResults.filter((r) => r.correct).length;
      const today = new Date().toISOString().slice(0, 10);
      playBullshitSwipe(today, finalScore);

      const log = useDailyLogStore.getState();
      log.logEvent({
        type: 'bullshit-swipe',
        title: 'סוויפ הבולשיט',
        timestamp: Date.now(),
        xpEarned: CHALLENGE_XP_REWARD,
      });
      log.addTodayXP(CHALLENGE_XP_REWARD);
      if (finalScore > 0) {
        log.addTodayCoins(CHALLENGE_COIN_REWARD);
      }
      log.addCorrectAnswer();

      if (finalScore >= 3) {
        successHaptic();
        setShowConfetti(true);
        setShowFlyingRewards(true);
        confettiTimer.current = setTimeout(() => setShowConfetti(false), 2400);
      }
    },
    [playBullshitSwipe],
  );

  const handleSwipe = useCallback(
    (userSaidBullshit: boolean) => {
      if (gameState === 'done') return;
      const ad = adsThisRound[currentIndex];
      if (!ad) return;
      const correct = userSaidBullshit === ad.isBullshit;
      const result: BullshitRoundResult = { ad, userSaidBullshit, correct };

      if (correct) heavyHaptic();
      else errorHaptic();

      setFeedback(result);
      const updatedResults = [...results, result];
      setResults(updatedResults);

      feedbackTimer.current = setTimeout(() => {
        setFeedback(null);
        if (currentIndex + 1 >= adsThisRound.length) {
          setGameState('done');
          finalize(updatedResults);
        } else {
          setCurrentIndex((i) => i + 1);
        }
      }, FEEDBACK_DURATION);
    },
    [adsThisRound, currentIndex, finalize, gameState, results],
  );

  if (hasPlayedToday && gameState !== 'done') {
    return (
      <View style={styles.container}>
        <View style={styles.cardShell}>
          <ExpoImage source={FINN_STANDARD} style={styles.finLarge} contentFit="contain" accessible={false} />
          <Text style={[styles.doneTitle, RTL]}>סוויפ הבולשיט — הושלם היום!</Text>
          <Text style={[styles.doneSub, RTL]}>חזור מחר — פרסומות חדשות מחכות</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiExplosion />}
      {showFlyingRewards && (
        <FlyingRewards
          type="coins"
          amount={CHALLENGE_COIN_REWARD}
          onComplete={() => setShowFlyingRewards(false)}
        />
      )}

      <View style={styles.cardShell}>
        {/* Header — Captain Shark intro */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.headerRow}>
          <ExpoImage
            source={FINN_STANDARD}
            style={styles.headerFinAvatar}
            contentFit="contain"
            accessible={false}
          />
          <View style={styles.headerFinWrap} accessible={false}>
            <LottieIcon source={LOTTIE_MAGNIFIER} size={32} />
          </View>
          <View style={styles.headerTextCol}>
            <Text style={[styles.headerTitle, RTL]}>סוויפ הבולשיט</Text>
            <Text style={[styles.headerSub, RTL]}>
              {gameState === 'playing'
                ? `כרטיס ${Math.min(currentIndex + 1, adsThisRound.length)}/${adsThisRound.length} · ${remainingPlays}/${MAX_DAILY_PLAYS} סבבים`
                : `סיימת! ${score}/${adsThisRound.length} נכונות`}
            </Text>
          </View>
        </Animated.View>

        {/* Playing phase */}
        {gameState === 'playing' && !feedback && adsThisRound[currentIndex] && (
          <View style={styles.gameArea}>
            <SwipeableAdCard
              key={adsThisRound[currentIndex].id}
              ad={adsThisRound[currentIndex]}
              onSwipe={handleSwipe}
            />
          </View>
        )}

        {/* Feedback phase — stamp drops + Captain Shark explains */}
        {feedback && (
          <View style={styles.gameArea}>
            <View style={styles.adCard}>
              <AdCardFront ad={feedback.ad} />
              <DropStamp kind={feedback.ad.isBullshit ? 'bullshit' : 'legit'} />
            </View>
            <CaptainSharkSpeech result={feedback} />
          </View>
        )}

        {/* Score phase */}
        {gameState === 'done' && !feedback && (
          <Animated.View entering={FadeIn.duration(400)} style={styles.scoreBox}>
            <ExpoImage
              source={score >= 3 ? FINN_HAPPY : FINN_EMPATHIC}
              style={styles.finLarge}
              contentFit="contain"
              accessible={false}
            />
            <Text style={[styles.scoreTitle, RTL_CENTER]}>
              {score === adsThisRound.length
                ? 'מושלם!'
                : score >= 3
                  ? 'יפה מאוד!'
                  : 'לא נורא, מחר עוד פעם'}
            </Text>
            <Text style={[styles.scoreLine, RTL_CENTER]}>
              {score}/{adsThisRound.length} זיהויים נכונים
            </Text>
            <View style={styles.rewardsRow}>
              <View style={styles.rewardPill}>
                <Text style={styles.rewardPillText}>+{CHALLENGE_XP_REWARD} XP</Text>
              </View>
              {score > 0 && (
                <View style={[styles.rewardPill, { backgroundColor: 'rgba(250,204,21,0.15)' }]}>
                  <Text style={[styles.rewardPillText, { color: '#d4a017' }]}>+{CHALLENGE_COIN_REWARD}</Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* Swipe hints footer */}
        {gameState === 'playing' && !feedback && (
          <View style={styles.hintRow}>
            <View style={styles.hintCol}>
              <View accessible={false}><LottieIcon source={LOTTIE_ERROR} size={22} /></View>
              <Text style={styles.hintArrow}>←</Text>
              <Text style={[styles.hintLabelSide, { color: '#dc2626' }]}>בולשיט</Text>
            </View>
            <View style={styles.hintCol}>
              <Text style={[styles.hintLabelSide, { color: '#16a34a' }]}>לגיטימי</Text>
              <Text style={styles.hintArrow}>→</Text>
              <View accessible={false}><LottieIcon source={LOTTIE_APPROVED} size={22} /></View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cardShell: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.25)',
    backgroundColor: '#f0f9ff',
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  headerFinWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerFinAvatar: {
    width: 44,
    height: 44,
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0369a1',
  },
  headerSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  gameArea: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  adCard: {
    width: SCREEN_WIDTH - 72,
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  adCardInner: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headlineWrap: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  headline: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 36,
  },
  subheadline: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  disclaimer: {
    lineHeight: 14,
  },
  flashOverlay: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
  },
  hintOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 20,
  },
  hintLeft: {
    backgroundColor: 'rgba(220,38,38,0.18)',
    borderWidth: 3,
    borderColor: 'rgba(220,38,38,0.45)',
  },
  hintRight: {
    backgroundColor: 'rgba(22,163,74,0.18)',
    borderWidth: 3,
    borderColor: 'rgba(22,163,74,0.45)',
  },
  hintFin: {
    width: 96,
    height: 96,
  },
  hintLabelBullshit: {
    fontSize: 26,
    fontWeight: '900',
    color: '#dc2626',
  },
  hintLabelLegit: {
    fontSize: 26,
    fontWeight: '900',
    color: '#16a34a',
  },
  stampWrap: {
    position: 'absolute',
    top: '32%',
    left: '15%',
    right: '15%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampFrameBox: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  stampTextCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  stampEn: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
  },
  stampHe: {
    fontSize: 22,
    fontWeight: '900',
  },
  sharkBubble: {
    marginTop: 8,
    width: SCREEN_WIDTH - 72,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.25)',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  sharkRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    alignItems: 'flex-start',
  },
  sharkAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#e0f2fe',
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sharkAvatar: {
    width: 40,
    height: 40,
  },
  sharkTextCol: {
    flex: 1,
    gap: 4,
  },
  sharkTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  sharkBody: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  glossaryRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(14,165,233,0.15)',
  },
  hintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  hintCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hintArrow: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '700',
  },
  hintLabelSide: {
    fontSize: 13,
    fontWeight: '800',
  },
  scoreBox: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  finLarge: {
    width: 96,
    height: 96,
  },
  doneTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0369a1',
    textAlign: 'center',
  },
  doneSub: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  scoreTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0369a1',
  },
  scoreLine: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  rewardsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  rewardPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(167,139,250,0.18)',
  },
  rewardPillText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#7c3aed',
  },
});

