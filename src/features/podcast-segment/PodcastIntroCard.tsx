import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from 'react-native-reanimated';
import { Play } from 'lucide-react-native';
import { Asset } from 'expo-asset';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tapHaptic, mediumHaptic } from '../../utils/haptics';
import { DAISY_ASSETS } from './daisy-assets';
import type { PodcastSegment } from '../chapter-1-content/types';

const { width: SW } = Dimensions.get('window');
const DAISY_W = Math.min(SW * 0.62, 260);
const DAISY_H = Math.round(DAISY_W * 1.4);
const RTL = { writingDirection: 'rtl' as const, textAlign: 'center' as const };

interface Props {
  podcast: PodcastSegment;
  episodeNumber: number;
  totalEpisodes: number;
  onStart: () => void;
}

export const PodcastIntroCard = React.memo(function PodcastIntroCard({
  podcast,
  episodeNumber,
  totalEpisodes,
  onStart,
}: Props) {
  const insets = useSafeAreaInsets();
  React.useEffect(() => {
    mediumHaptic();
  }, []);

  // Warm the podcast audio cache while the user reads the intro title. By
  // the time they tap "התחל" the mp3 is already on disk, so the listen
  // stage doesn't sit on a blank "loading" screen waiting for the network.
  React.useEffect(() => {
    void Asset.fromURI(podcast.audio.uri).downloadAsync().catch(() => {});
  }, [podcast.audio.uri]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#bae6fd', '#fce7e7', '#fbcfe8']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <Animated.View
          entering={FadeInDown.duration(380).springify()}
          style={styles.episodeChip}
        >
          <Text style={styles.episodeIcon}>🎙️</Text>
          <Text style={styles.episodeChipText}>פודקסט</Text>
        </Animated.View>

        <Animated.View
          entering={ZoomIn.duration(520).springify().damping(13)}
          style={styles.daisyWrap}
        >
          <View style={styles.daisyFrame}>
            <ExpoImage
              source={DAISY_ASSETS.mic}
              style={styles.daisyImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(160).springify()}>
          <Text style={[styles.title, RTL]} numberOfLines={2}>
            {podcast.title}
          </Text>
          <Text style={[styles.subtitle, RTL]}>
            הקשיבו לסיפור, ואז ענו על 2 שאלות
          </Text>
        </Animated.View>
      </View>

      <Animated.View
        entering={FadeInUp.duration(400).delay(280)}
        style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}
      >
        <Pressable
          onPress={() => { tapHaptic(); onStart(); }}
          accessibilityRole="button"
          accessibilityLabel="התחל את הפודקסט"
          style={({ pressed }) => [
            styles.startBtn,
            pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
          ]}
        >
          <Play color="#ffffff" size={22} fill="#ffffff" />
          <Text style={styles.startBtnText}>התחל</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fce7e7' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 18,
  },

  episodeChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(14,165,233,0.12)',
    borderColor: 'rgba(14,165,233,0.35)',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  episodeIcon: { fontSize: 16 },
  episodeChipText: { color: '#0369a1', fontSize: 13, fontWeight: '800' },

  daisyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  daisyFrame: {
    width: DAISY_W,
    height: DAISY_H,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#0891b2',
    shadowOpacity: 0.22,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  daisyImage: { width: '100%', height: '100%' },

  title: {
    color: '#0c2138',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 32,
    marginTop: 4,
  },
  subtitle: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    lineHeight: 20,
  },

  footer: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 12,
  },
  startBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#0ea5e9',
    borderRadius: 18,
    paddingVertical: 18,
    borderBottomWidth: 4,
    borderBottomColor: '#0369a1',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
