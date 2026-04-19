/**
 * HolographicCard, 3D perspective card that tilts with device gyroscope.
 * Adds a shifting gradient overlay that simulates a holographic "shine" effect.
 */
import { StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
    useAnimatedStyle,
    interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { use3DTilt } from '../../hooks/use3DTilt';

interface HolographicCardProps {
    children: React.ReactNode;
    /** Max tilt angle in degrees (default 6) */
    maxTilt?: number;
    /** Whether the holographic effect is active */
    active?: boolean;
    style?: StyleProp<ViewStyle>;
}

export function HolographicCard({
    children,
    maxTilt = 6,
    active = true,
    style,
}: HolographicCardProps) {
    const { rotateX, rotateY } = use3DTilt({
        maxTilt,
        enabled: active,
        sensitivity: 1.2,
    });

    // 3D transform based on gyroscope tilt
    const cardStyle = useAnimatedStyle(() => ({
        transform: [
            { perspective: 800 },
            { rotateX: `${rotateX.value}deg` },
            { rotateY: `${rotateY.value}deg` },
        ],
    }));

    // Shifting gradient overlay for holographic shine
    const shineStyle = useAnimatedStyle(() => {
        const shineX = interpolate(rotateY.value, [-maxTilt, maxTilt], [-60, 60]);
        const shineOpacity = interpolate(
            Math.abs(rotateX.value) + Math.abs(rotateY.value),
            [0, maxTilt],
            [0.05, 0.25],
        );

        return {
            transform: [{ translateX: shineX }],
            opacity: shineOpacity,
        };
    });

    if (!active) {
        return <Animated.View style={style}>{children}</Animated.View>;
    }

    return (
        <Animated.View style={[cardStyle, style]}>
            {children}
            {/* Holographic shine overlay */}
            <Animated.View
                style={[StyleSheet.absoluteFill, shineStyle]}
                pointerEvents="none"
            >
                <LinearGradient
                    colors={[
                        'transparent',
                        'rgba(255,255,255,0.12)',
                        'rgba(212,160,23,0.08)',
                        'transparent',
                    ]}
                    locations={[0, 0.35, 0.65, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
            </Animated.View>
        </Animated.View>
    );
}
