/**
 * SkiaInteractiveChart, Tactile graph with draggable scrubber, glow, and haptics.
 * Uses @shopify/react-native-skia for smooth 60fps rendering.
 */
import { useMemo, useCallback } from 'react';
import { Dimensions, View } from 'react-native';
import {
    Canvas,
    Path as SkiaPath,
    LinearGradient as SkiaGradient,
    vec,
    Circle,
    Shadow,
    Skia,
    Paint,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const SCREEN_WIDTH = Dimensions.get('window').width;

export interface ChartDataPoint {
    x: number; // 0-1 normalized
    y: number; // 0-1 normalized
    label?: string;
}

interface SkiaInteractiveChartProps {
    data: ChartDataPoint[];
    width?: number;
    height?: number;
    lineColor?: string;
    gradientColors?: [string, string];
    glowColor?: string;
    /** Called with interpolated y value when scrubbing */
    onScrub?: (normalizedX: number, dataIndex: number) => void;
    /** Milestone interval for haptic feedback (e.g. 5 for every 5th data point) */
    hapticMilestone?: number;
}

export function SkiaInteractiveChart({
    data,
    width = SCREEN_WIDTH - 48,
    height = 180,
    lineColor = '#39FF14',
    gradientColors = ['rgba(57,255,20,0.4)', 'rgba(57,255,20,0)'],
    glowColor = '#39FF14',
    onScrub,
    hapticMilestone = 5,
}: SkiaInteractiveChartProps) {
    const PADDING = { top: 12, bottom: 8, left: 4, right: 4 };
    const chartW = width - PADDING.left - PADDING.right;
    const chartH = height - PADDING.top - PADDING.bottom;

    // Scrubber position (shared value for 60fps)
    const scrubX = useSharedValue(-1);
    const scrubY = useSharedValue(0);
    const scrubOpacity = useSharedValue(0);
    const lastMilestone = useSharedValue(-1);

    // Build Skia path from data
    const { linePath, fillPath } = useMemo(() => {
        if (data.length < 2) return { linePath: '', fillPath: '' };

        const points = data.map((d) => ({
            px: PADDING.left + d.x * chartW,
            py: PADDING.top + (1 - d.y) * chartH,
        }));

        let lineD = `M ${points[0].px} ${points[0].py}`;
        for (let i = 1; i < points.length; i++) {
            // Smooth curve using quadratic bezier
            const prev = points[i - 1];
            const curr = points[i];
            const cpX = (prev.px + curr.px) / 2;
            lineD += ` Q ${cpX} ${prev.py} ${curr.px} ${curr.py}`;
        }

        const last = points[points.length - 1];
        const fillD = `${lineD} L ${last.px} ${height - PADDING.bottom} L ${points[0].px} ${height - PADDING.bottom} Z`;

        return { linePath: lineD, fillPath: fillD };
    }, [data, chartW, chartH, height]);

    // Interpolate Y from X position
    const getYForX = useCallback(
        (normalizedX: number) => {
            if (data.length < 2) return 0;
            const idx = normalizedX * (data.length - 1);
            const lo = Math.floor(idx);
            const hi = Math.min(lo + 1, data.length - 1);
            const t = idx - lo;
            return data[lo].y * (1 - t) + data[hi].y * t;
        },
        [data],
    );

    const triggerHaptic = useCallback(() => {
        Haptics.selectionAsync();
    }, []);

    const fireScrubCallback = useCallback(
        (nx: number) => {
            const dataIdx = Math.round(nx * (data.length - 1));
            onScrub?.(nx, dataIdx);
        },
        [data.length, onScrub],
    );

    // Pan gesture for scrubbing
    const panGesture = Gesture.Pan()
        .onBegin((e) => {
            'worklet';
            scrubOpacity.value = withSpring(1, { damping: 15 });
            const nx = Math.max(0, Math.min(1, (e.x - PADDING.left) / chartW));
            const ny = getYForX(nx);
            scrubX.value = PADDING.left + nx * chartW;
            scrubY.value = PADDING.top + (1 - ny) * chartH;
            lastMilestone.value = -1;
            runOnJS(fireScrubCallback)(nx);
        })
        .onUpdate((e) => {
            'worklet';
            const nx = Math.max(0, Math.min(1, (e.x - PADDING.left) / chartW));
            const ny = getYForX(nx);
            scrubX.value = PADDING.left + nx * chartW;
            scrubY.value = PADDING.top + (1 - ny) * chartH;

            // Haptic at milestones
            const dataIdx = Math.round(nx * (data.length - 1));
            const milestone = Math.floor(dataIdx / hapticMilestone);
            if (milestone !== lastMilestone.value) {
                lastMilestone.value = milestone;
                runOnJS(triggerHaptic)();
            }
            runOnJS(fireScrubCallback)(nx);
        })
        .onEnd(() => {
            'worklet';
            scrubOpacity.value = withSpring(0, { damping: 20 });
        });

    // Animated scrubber dot style
    const scrubberStyle = useAnimatedStyle(() => ({
        position: 'absolute' as const,
        left: scrubX.value - 8,
        top: scrubY.value - 8,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: glowColor,
        opacity: scrubOpacity.value,
        shadowColor: glowColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 12,
        elevation: 10,
    }));

    // Animated scrub line
    const scrubLineStyle = useAnimatedStyle(() => ({
        position: 'absolute' as const,
        left: scrubX.value,
        top: PADDING.top,
        width: 1.5,
        height: chartH,
        backgroundColor: `${glowColor}60`,
        opacity: scrubOpacity.value,
    }));

    if (data.length < 2) return null;

    return (
        <GestureDetector gesture={panGesture}>
            <View style={{ width, height, position: 'relative' }}>
                <Canvas style={{ width, height }}>
                    {/* Gradient fill under curve */}
                    <SkiaPath path={fillPath} style="fill">
                        <SkiaGradient
                            start={vec(0, PADDING.top)}
                            end={vec(0, height - PADDING.bottom)}
                            colors={gradientColors}
                        />
                    </SkiaPath>

                    {/* Main line with glow */}
                    <SkiaPath
                        path={linePath}
                        style="stroke"
                        strokeWidth={3}
                        strokeCap="round"
                        strokeJoin="round"
                        color={lineColor}
                    >
                        <Shadow dx={0} dy={4} blur={8} color={`${glowColor}80`} />
                    </SkiaPath>
                </Canvas>

                {/* Scrub indicators, Reanimated for 60fps */}
                <Animated.View style={scrubLineStyle} pointerEvents="none" />
                <Animated.View style={scrubberStyle} pointerEvents="none" />
            </View>
        </GestureDetector>
    );
}
