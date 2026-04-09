/**
 * GlassOverlay — Glassmorphism backdrop for modals and popups.
 * Uses expo-blur's BlurView for frosted glass effect.
 */
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeOut, SlideInDown } from 'react-native-reanimated';

interface GlassOverlayProps {
    children: React.ReactNode;
    /** Blur intensity 0-100 (default 40) */
    intensity?: number;
    /** Whether to use dark or light tint */
    tint?: 'dark' | 'light' | 'default';
    /** Whether to animate entrance with a bouncy slide */
    bouncy?: boolean;
}

export function GlassOverlay({
    children,
    intensity = 40,
    tint = 'dark',
    bouncy = true,
}: GlassOverlayProps) {
    return (
        <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={styles.backdrop}
        >
            <BlurView
                intensity={intensity}
                tint={tint}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.backdropOverlay} />
            <Animated.View
                entering={
                    bouncy
                        ? SlideInDown.springify().damping(18).stiffness(200)
                        : FadeIn.duration(250)
                }
                style={styles.contentContainer}
            >
                {children}
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backdropOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    contentContainer: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
});
