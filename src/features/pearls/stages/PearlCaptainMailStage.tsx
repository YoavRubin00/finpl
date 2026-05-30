import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { useFunStore } from '../../../stores/useFunStore';
import { FINN_DAD_JOKES, FINN_FUN_FACTS } from '../../fun/finnJokesData';
import { FINN_HAPPY } from '../../retention-loops/finnMascotConfig';
import { tapHaptic } from '../../../utils/haptics';

interface PearlCaptainMailStageProps {
  isActive: boolean;
  onContinue: () => void;
}

/**
 * Captain Shark's daily mail — inlined directly into the Pearl flow.
 * Replaces the modal version (FinnMailModal) that used to surface from
 * the deleted FinFeedScreen welcome card. Shows the joke + fact (daily
 * kind) or the comeback re-engagement copy. Marks the mail as read on
 * "Continue" so the unread badge clears.
 */
export function PearlCaptainMailStage({ isActive, onContinue }: PearlCaptainMailStageProps): React.ReactElement {
  const mailContent = useFunStore((s) => s.mailContent);
  const hasUnreadMail = useFunStore((s) => s.hasUnreadMail);
  const refreshMail = useFunStore((s) => s.refreshMail);
  const openMail = useFunStore((s) => s.openMail);
  const markActiveToday = useFunStore((s) => s.markActiveToday);

  // Refresh once per mount so the daily rotation is fresh, and mark today
  // as active so the comeback path uses yesterday's lastActiveDate, not
  // today's (same ordering FinFeedScreen used).
  useEffect(() => {
    refreshMail(FINN_DAD_JOKES, FINN_FUN_FACTS);
    markActiveToday();
  }, [refreshMail, markActiveToday]);

  const isComeback = mailContent?.kind === 'comeback';

  const handleContinue = () => {
    if (hasUnreadMail) openMail();
    tapHaptic();
    onContinue();
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(220)} style={styles.card}>
          <ExpoImage
            source={
              isComeback
                ? require('../../../../assets/IMAGES/MAIL ASSETS/mail-comeback-streak.png')
                : require('../../../../assets/IMAGES/fun/finn_mail.png')
            }
            style={[styles.header, { height: isComeback ? 170 : 120 }]}
            contentFit="cover"
            accessible={false}
          />

          <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.avatarWrap}>
            <ExpoImage
              source={FINN_HAPPY}
              accessible={false}
              style={styles.avatar}
              contentFit="contain"
            />
          </Animated.View>

          <Text style={styles.title} allowFontScaling={false}>
            {isComeback ? 'הממ, מעניין 👀' : 'דואר מקפטן שארק'}
          </Text>

          {mailContent?.kind === 'daily' ? (
            <>
              {mailContent.joke ? (
                <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.speechBubble}>
                  <Text style={styles.speechText} allowFontScaling={false}>{mailContent.joke}</Text>
                  <View style={styles.speechTail} />
                </Animated.View>
              ) : null}

              {mailContent.fact ? (
                <Animated.View entering={FadeInDown.delay(300).duration(300)} style={styles.factCard}>
                  <Text style={styles.factLabel} allowFontScaling={false}>ידעת?</Text>
                  <Text style={styles.factText} allowFontScaling={false}>{mailContent.fact}</Text>
                </Animated.View>
              ) : null}
            </>
          ) : isComeback ? (
            <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.speechBubble}>
              <Text style={styles.speechText} allowFontScaling={false}>
                חיכיתי לך! בוא נראה מה קורה השבוע בשוק.
              </Text>
              <View style={styles.speechTail} />
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.speechBubble}>
              <Text style={styles.speechText} allowFontScaling={false}>
                אין דואר חדש להיום. בקרוב יגיע 🦈
              </Text>
              <View style={styles.speechTail} />
            </Animated.View>
          )}
        </Animated.View>
      </ScrollView>

      <View style={styles.ctaWrap}>
        <Pressable
          onPress={handleContinue}
          style={styles.cta}
          accessibilityRole="button"
          accessibilityLabel="המשך"
          disabled={!isActive}
        >
          <Text style={styles.ctaText} allowFontScaling={false}>המשך ←</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 22,
    alignItems: 'center',
    shadowColor: '#0c4a6e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },
  header: {
    width: '100%',
    borderRadius: 16,
    marginBottom: 8,
  },
  avatarWrap: {
    marginBottom: 8,
  },
  avatar: {
    width: 92,
    height: 92,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0c4a6e',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 14,
  },
  speechBubble: {
    backgroundColor: '#f0f9ff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#bae6fd',
    paddingVertical: 14,
    paddingHorizontal: 18,
    width: '100%',
    marginBottom: 12,
    position: 'relative',
  },
  speechText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369a1',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 22,
  },
  speechTail: {
    position: 'absolute',
    top: -8,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#bae6fd',
  },
  factCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 14,
    paddingHorizontal: 18,
    width: '100%',
    gap: 4,
  },
  factLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0ea5e9',
    textAlign: 'right',
    writingDirection: 'rtl',
    letterSpacing: 0.3,
  },
  factText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 20,
  },
  ctaWrap: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  cta: {
    backgroundColor: '#0891b2',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderBottomWidth: 4,
    borderBottomColor: '#0e7490',
  },
  ctaText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
    writingDirection: 'rtl',
  },
});
