/**
 * FeedSkeleton — Finn welcome placeholder for FinFeed.
 * Shown during initial feed computation/render.
 */
import React from 'react';
import { Image as ExpoImage } from "expo-image";
import { View, Text, Image, Dimensions, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { FINN_STANDARD } from '../../features/retention-loops/finnMascotConfig';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export function FeedSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <ExpoImage source={FINN_STANDARD} style={{ width: 140, height: 140 }} contentFit="contain" />
        <Text style={styles.title}>טוען את הפיד שלך...</Text>
      </View>
    </View>
  );
}

/** Horizontal row of N skeleton feed cards — used when pre-loading. */
export function FeedSkeletonList({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ width: SCREEN_WIDTH }}>
          <FeedSkeleton />
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    height: SCREEN_HEIGHT,
    width: SCREEN_WIDTH,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
    writingDirection: 'rtl',
  },
});
