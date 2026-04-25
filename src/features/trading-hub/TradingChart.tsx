import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Info } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LiveChart as LegacyLineChart } from './LiveChart';
import { buildChartHtml } from './chartHtml';
import type { ChartDataPoint, ChartMode, IndicatorId, Timeframe } from './tradingHubTypes';
import { tapHaptic } from '../../utils/haptics';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const CHART_HEIGHT = 300;
const MA_PERIOD_OPTIONS = [20, 50, 100, 200] as const;

interface TradingChartProps {
  ohlcv: ChartDataPoint[];
  mode: ChartMode;
  timeframe: Timeframe;
  isLoading: boolean;
  /** MA period for the overlay in advanced mode. */
  maPeriod: number;
  onMAPeriodChange: (period: number) => void;
  onIndicatorInfoPress: (id: IndicatorId) => void;
}

export function TradingChart({
  ohlcv,
  mode,
  timeframe,
  isLoading,
  maPeriod,
  onMAPeriodChange,
  onIndicatorInfoPress,
}: TradingChartProps) {
  const [ready, setReady] = useState(false);
  const [errored, setErrored] = useState(false);
  const lastSigRef = useRef<string>('');

  // Rebuild the HTML whenever mode/timeframe/period/data signature changes.
  const html = useMemo(() => {
    const sig = `${mode}|${timeframe}|${maPeriod}|${ohlcv.length}|${ohlcv[0]?.timestamp ?? 0}|${ohlcv[ohlcv.length - 1]?.timestamp ?? 0}`;
    if (sig !== lastSigRef.current) {
      lastSigRef.current = sig;
      setReady(false);
      setErrored(false);
    }
    return buildChartHtml({ mode, data: ohlcv, timeframe, maPeriod });
  }, [mode, timeframe, maPeriod, ohlcv]);

  const handleMessage = useCallback((e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg?.type === 'ready') setReady(true);
    } catch {
      // ignore malformed messages
    }
  }, []);

  // Safety: if the CDN/JS never reports ready within 4.5 s, fall back to the
  // native Skia chart. Previous 2 s window was too aggressive — it hid the
  // advanced chart on perfectly normal networks where unpkg.com just took a
  // moment to deliver lightweight-charts. 4.5 s feels brief enough that the
  // skeleton doesn't linger uncomfortably while still giving the CDN a fair
  // chance to land before we give up.
  useEffect(() => {
    if (ready || errored) return;
    const timer = setTimeout(() => {
      if (!ready) setErrored(true);
    }, 4500);
    return () => clearTimeout(timer);
  }, [ready, errored, html]);

  const handleInfoPress = useCallback((id: IndicatorId) => {
    tapHaptic();
    onIndicatorInfoPress(id);
  }, [onIndicatorInfoPress]);

  const handlePeriodPress = useCallback((period: number) => {
    if (period === maPeriod) return;
    tapHaptic();
    onMAPeriodChange(period);
  }, [maPeriod, onMAPeriodChange]);

  // Fallback skeletons
  if (isLoading || ohlcv.length < 2) {
    return (
      <View style={[styles.root, { height: CHART_HEIGHT }]}>
        <View style={styles.skeleton}>
          <ActivityIndicator size="small" color="#64748b" />
          <Text style={[RTL, styles.loadingText]}>טוען גרף...</Text>
        </View>
      </View>
    );
  }

  if (errored) {
    return (
      <View style={styles.root}>
        <LegacyLineChart data={ohlcv} height={CHART_HEIGHT} isLoading={false} />
      </View>
    );
  }

  // Simple mode: render the Skia chart directly (bundled, no CDN). The WebView
  // path is only used for 'advanced' mode where lightweight-charts is required
  // for MA/RSI overlays. This guarantees instant rendering on poor networks.
  if (mode === 'simple') {
    return (
      <View style={styles.root}>
        <LegacyLineChart data={ohlcv} height={CHART_HEIGHT} isLoading={false} />
      </View>
    );
  }

  const showIndicatorBadges = mode === 'advanced' && timeframe === '1W' && ohlcv.length >= Math.max(maPeriod, 15);
  const showTimeframeNote = mode === 'advanced' && timeframe === '1D';
  const showMAPeriodBar = mode === 'advanced';

  return (
    <View style={styles.root}>
      {/* MA period selector, only in advanced mode */}
      {showMAPeriodBar && (
        <View style={styles.periodBar}>
          <Text style={styles.periodLabel}>MA</Text>
          {MA_PERIOD_OPTIONS.map((p) => {
            const active = p === maPeriod;
            return (
              <Pressable
                key={p}
                onPress={() => handlePeriodPress(p)}
                accessibilityRole="button"
                accessibilityLabel={`ממוצע נע ${p} ימים`}
                accessibilityState={{ selected: active }}
                hitSlop={6}
                style={[styles.periodPill, active && styles.periodPillActive]}
              >
                <Text style={[styles.periodPillText, active && styles.periodPillTextActive]}>{p}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={[styles.webviewWrap, { height: CHART_HEIGHT }]}>
        <WebView
          originWhitelist={["*"]}
          source={{ html }}
          style={styles.webview}
          scrollEnabled={false}
          overScrollMode="never"
          bounces={false}
          androidLayerType="hardware"
          javaScriptEnabled
          domStorageEnabled
          cacheEnabled
          mixedContentMode="always"
          allowsInlineMediaPlayback
          setSupportMultipleWindows={false}
          onMessage={handleMessage}
          onError={() => setErrored(true)}
          onHttpError={() => setErrored(true)}
          onShouldStartLoadWithRequest={(req) =>
            req.url === 'about:blank' ||
            req.url.startsWith('data:') ||
            req.url.startsWith('about:') ||
            req.url.startsWith('https://unpkg.com/') ||
            req.url.startsWith('https://cdn.jsdelivr.net/')
          }
        />

        {/* Skeleton until the chart library signals ready */}
        {!ready && (
          <Animated.View entering={FadeIn.duration(150)} style={[styles.skeleton, StyleSheet.absoluteFill]} pointerEvents="none">
            <ActivityIndicator size="small" color="#64748b" />
            <Text style={[RTL, styles.loadingText]}>טוען גרף...</Text>
          </Animated.View>
        )}

        {/* Indicator info badges, only where indicators actually render */}
        {showIndicatorBadges && (
          <View style={styles.badgeRow} pointerEvents="box-none">
            <Pressable
              onPress={() => handleInfoPress('ma20')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="מה זה ממוצע נע"
              style={({ pressed }) => [styles.badge, styles.badgeMa, pressed && styles.badgePressed]}
            >
              <Info size={14} color="#60a5fa" strokeWidth={2.6} />
              <Text style={styles.badgeText}>MA{maPeriod}</Text>
            </Pressable>
            <Pressable
              onPress={() => handleInfoPress('rsi')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="מה זה RSI"
              style={({ pressed }) => [styles.badge, styles.badgeRsi, pressed && styles.badgePressed]}
            >
              <Info size={14} color="#a78bfa" strokeWidth={2.6} />
              <Text style={styles.badgeText}>RSI</Text>
            </Pressable>
          </View>
        )}

        {showTimeframeNote && (
          <View style={styles.noteWrap} pointerEvents="none">
            <Text style={[RTL, styles.noteText]}>אינדיקטורים מוצגים רק בטווח שבועי</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'stretch',
  },
  webviewWrap: {
    position: 'relative',
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  skeleton: {
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },

  // ── MA period selector bar ──
  periodBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fbfdfe',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f6',
  },
  periodLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#60a5fa',
    marginEnd: 4,
  },
  periodPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  periodPillActive: {
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
  },
  periodPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7b8794',
    fontVariant: ['tabular-nums'],
  },
  periodPillTextActive: {
    color: '#1d4ed8',
  },

  // ── Indicator badges (tap for explanation) ──
  badgeRow: {
    position: 'absolute',
    top: 10,
    start: 14,
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.94)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  badgeMa: {
    borderColor: '#93c5fd',
  },
  badgeRsi: {
    borderColor: '#c4b5fd',
  },
  badgePressed: {
    opacity: 0.7,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
    fontVariant: ['tabular-nums'],
  },

  // ── Note under chart ──
  noteWrap: {
    position: 'absolute',
    bottom: 10,
    start: 12,
    end: 12,
    alignItems: 'center',
  },
  noteText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
