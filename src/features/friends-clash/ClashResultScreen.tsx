import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, SlideInUp, ZoomIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Coins, Zap } from 'lucide-react-native';
import { useClashStore } from './useClashStore';
import { useAuthStore } from '../auth/useAuthStore';
import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { GlowCard } from '../../components/ui/GlowCard';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

const RESULT_CONFIG = {
    win: {
        emoji: '🏆',
        title: 'ניצחון!',
        subtitle: 'הראית מי הבוס של הפיננסים!',
        color: '#facc15',
        xp: 50,
        coins: 30,
    },
    lose: {
        emoji: '😢',
        title: 'הפסד...',
        subtitle: 'לא נורא, פעם הבאה תנצח!',
        color: '#ef4444',
        xp: 0,
        coins: 0,
    },
    draw: {
        emoji: '🤝',
        title: 'תיקו!',
        subtitle: 'אתם שווים! שחקו שוב כדי להכריע.',
        color: '#a78bfa',
        xp: 20,
        coins: 10,
    },
};

export function ClashResultScreen() {
    const router = useRouter();
    const session = useClashStore((s) => s.activeSession);
    const resetSession = useClashStore((s) => s.resetSession);
    const displayName = useAuthStore((s) => s.displayName) ?? 'אתה';

    if (!session) {
        return (
            <SafeAreaView className="flex-1 bg-zinc-950 items-center justify-center">
                <Text className="text-zinc-400">אין תוצאה להצגה</Text>
            </SafeAreaView>
        );
    }

    const result = session.result ?? 'draw';
    const config = RESULT_CONFIG[result];

    const handlePlayAgain = () => {
        resetSession();
        router.canGoBack() ? router.back() : router.replace('/(tabs)');
    };

    const handleBack = () => {
        resetSession();
        router.canGoBack() ? router.back() : router.replace('/(tabs)');
    };

    // Calculate score bar widths
    const maxScore = Math.max(session.userScore, session.opponentScore, 1);
    const userBarWidth = (session.userScore / maxScore) * 100;
    const opponentBarWidth = (session.opponentScore / maxScore) * 100;

    return (
        <SafeAreaView className="flex-1 bg-zinc-950" edges={['top', 'bottom']}>
            <View className="flex-1 items-center justify-center px-5">
                {/* Big result emoji */}
                <Animated.View entering={ZoomIn.delay(200).springify()}>
                    <View style={[styles.emojiCircle, { borderColor: config.color, shadowColor: config.color }]}>
                        <Text style={{ fontSize: 56 }}>{config.emoji}</Text>
                    </View>
                </Animated.View>

                {/* Result text */}
                <Animated.View entering={FadeIn.delay(500)} className="items-center mt-4">
                    <Text className="text-3xl font-black" style={[RTL, { color: config.color }]}>
                        {config.title}
                    </Text>
                    <Text className="text-sm text-zinc-400 mt-1" style={RTL}>
                        {config.subtitle}
                    </Text>
                </Animated.View>

                {/* Score comparison */}
                <Animated.View entering={SlideInUp.delay(700)} className="w-full mt-8">
                    <GlowCard glowColor={config.color} pressable={false}>
                        {/* User score */}
                        <View className="mb-4">
                            <View className="flex-row-reverse items-center justify-between mb-1.5">
                                <Text className="text-sm font-bold text-white" style={RTL}>
                                    {displayName}
                                </Text>
                                <Text className="text-lg font-black text-violet-400">{session.userScore}</Text>
                            </View>
                            <View className="h-3 w-full rounded-full bg-zinc-800 overflow-hidden">
                                <View
                                    style={{ width: `${userBarWidth}%` }}
                                    className="h-full rounded-full bg-violet-500"
                                />
                            </View>
                        </View>

                        {/* Opponent score */}
                        <View>
                            <View className="flex-row-reverse items-center justify-between mb-1.5">
                                <Text className="text-sm font-bold text-white" style={RTL}>
                                    {session.opponentName}
                                </Text>
                                <Text className="text-lg font-black text-orange-400">{session.opponentScore}</Text>
                            </View>
                            <View className="h-3 w-full rounded-full bg-zinc-800 overflow-hidden">
                                <View
                                    style={{ width: `${opponentBarWidth}%` }}
                                    className="h-full rounded-full bg-orange-500"
                                />
                            </View>
                        </View>
                    </GlowCard>
                </Animated.View>

                {/* Rewards */}
                {(config.xp > 0 || config.coins > 0) && (
                    <Animated.View entering={FadeIn.delay(1000)} className="flex-row gap-4 mt-6">
                        {config.xp > 0 && (
                            <View className="flex-row items-center gap-2 rounded-full border border-violet-500/30 bg-violet-950/40 px-4 py-2">
                                <Zap size={14} color="#a78bfa" />
                                <Text className="text-sm font-bold text-violet-400">+{config.xp} XP</Text>
                            </View>
                        )}
                        {config.coins > 0 && (
                            <View className="flex-row items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-950/40 px-4 py-2">
                                <Coins size={14} color="#facc15" />
                                <Text className="text-sm font-bold text-yellow-400">+{config.coins}</Text>
                            </View>
                        )}
                    </Animated.View>
                )}
            </View>

            {/* Bottom actions */}
            <View className="px-5 pb-4 gap-3">
                <AnimatedPressable
                    onPress={handlePlayAgain}
                    style={[styles.primaryBtn, { backgroundColor: '#7c3aed', borderColor: '#a78bfa' }]}
                    className="rounded-2xl py-4 items-center"
                >
                    <Text className="text-base font-bold text-white" style={RTL}>
                        ⚔️ שחק שוב
                    </Text>
                </AnimatedPressable>

                <AnimatedPressable
                    onPress={handleBack}
                    className="rounded-2xl py-3.5 items-center"
                    style={{ backgroundColor: '#0ea5e9', borderBottomWidth: 3, borderBottomColor: '#0369a1' }}
                >
                    <Text className="text-sm font-black text-white" style={RTL}>
                        חזור לדף הבית
                    </Text>
                </AnimatedPressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    emojiCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#18181b',
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        elevation: 12,
    },
    primaryBtn: {
        borderWidth: 1,
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
});
