import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useLiveMarketStore } from '../../../stores/useLiveMarketStore';
import type { NewsItem } from '../liveMarketTypes';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

function formatPubDate(pubDate: string): string {
  if (!pubDate) return '';
  try {
    const diff = Math.floor((Date.now() - new Date(pubDate).getTime()) / 60000);
    if (diff < 1) return 'עכשיו';
    if (diff < 60) return `לפני ${diff} דק׳`;
    const h = Math.floor(diff / 60);
    if (h < 24) return h === 1 ? 'לפני שעה' : `לפני ${h} שע׳`;
    const d = Math.floor(h / 24);
    return d === 1 ? 'אתמול' : `לפני ${d} ימים`;
  } catch {
    return '';
  }
}

function HeadlineRow({ item, isLast }: { item: NewsItem; isLast: boolean }) {
  const handlePress = () => {
    if (item.link) Linking.openURL(item.link).catch(() => {});
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="link"
      accessibilityLabel={item.headline}
      style={({ pressed }) => [styles.row, !isLast && styles.rowBorder, pressed && styles.rowPressed]}
    >
      <View style={styles.rowContent}>
        <Text style={[styles.headline, RTL]} numberOfLines={2}>{item.headline}</Text>
        <View style={styles.meta}>
          <Text style={styles.metaTime}>{formatPubDate(item.pubDate)}</Text>
          <View style={styles.sourceBadge}>
            <Text style={styles.sourceText}>{item.source}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.chevron}>‹</Text>
    </Pressable>
  );
}

export function NewsHeadlinesCard() {
  const { data, loading, fetch } = useLiveMarketStore();

  useEffect(() => { fetch(); }, [fetch]);

  const news = data?.news ?? [];

  if (!loading && news.length === 0) return null;

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.sourcePill}>
          <Text style={styles.sourcePillText}>גלובס</Text>
        </View>
        <Text style={[styles.title, RTL]}>כותרות פיננסיות</Text>
      </View>

      {/* Headlines */}
      {loading && news.length === 0 ? (
        <View style={styles.loadingBox}>
          <Text style={styles.loadingText}>טוען כותרות...</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {news.map((item, idx) => (
            <HeadlineRow key={idx} item={item} isLast={idx === news.length - 1} />
          ))}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#6366f1',
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1e293b',
  },
  sourcePill: {
    backgroundColor: '#eff6ff',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  sourcePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563eb',
  },
  list: {
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 13,
    gap: 10,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rowPressed: {
    backgroundColor: '#f8fafc',
  },
  rowContent: {
    flex: 1,
    gap: 5,
  },
  headline: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: 21,
  },
  meta: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  sourceBadge: {
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  metaTime: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  chevron: {
    fontSize: 18,
    color: '#cbd5e1',
    fontWeight: '300',
  },
  loadingBox: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    writingDirection: 'rtl',
  },
});