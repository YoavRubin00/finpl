import { useEffect, useState, useCallback } from 'react';
import { Image as ExpoImage } from "expo-image";
import { View, Text, Pressable, StyleSheet, Modal, Image, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { GoldCoinIcon } from '../../components/ui/GoldCoinIcon';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withRepeat,
    withSequence,
    withTiming,
    cancelAnimation,
    useReducedMotion,
    FadeIn,
    FadeOut,
} from 'react-native-reanimated';
import { Heart } from 'lucide-react-native';
import LottieView from '../../components/ui/SafeLottieView';
import { FINN_STANDARD } from '../retention-loops/finnMascotConfig';
import { useSubscriptionStore, getTimeUntilNextHeart } from './useSubscriptionStore';
import { useEconomyStore } from '../../features/economy/useEconomyStore';
import { tapHaptic, successHaptic } from '../../utils/haptics';
import { useRewardedAd } from '../../hooks/useRewardedAd';
import { useChapterStore } from '../chapter-1-content/useChapterStore';
import { useBandit } from '../bandit/useBandit';
import { useAppActive } from '../../hooks/useAppActive';

const MAX_HEARTS = 5;

/* ------------------------------------------------------------------ */
/*  HeartsDisplay, shows in lesson header                             */
/* ------------------------------------------------------------------ */

export function HeartsDisplay() {
    const hearts = useSubscriptionStore((s) => s.hearts);
    const isPro = useSubscriptionStore((s) => s.tier === "pro" && s.status === "active");

    // Trigger refill check once on mount
    useEffect(() => {
        useSubscriptionStore.getState().refillHearts();
    }, []);

    const heartsDisplayValue = isPro ? Infinity : hearts;

    if (isPro) {
        return (
            <View style={styles.heartsRow}>
                <Text style={styles.infinityIcon}>♾️</Text>
            </View>
        );
    }

    const isFull = hearts === MAX_HEARTS;

    return (
        <View style={[styles.heartsRow, { gap: 6 }]}>
            <View style={styles.heartsRow}>
                {Array.from({ length: MAX_HEARTS }).map((_, i) => (
                    <Heart
                        key={i}
                        size={18}
                        color={i < heartsDisplayValue ? '#ef4444' : '#3f3f46'}
                        fill={i < heartsDisplayValue ? '#ef4444' : 'transparent'}
                    />
                ))}
            </View>
            {/* "Hearts full" XP-rampage hint — encourages users to start a lesson
                while at max. Pure visual incentive (Duolingo "use them while you have them"). */}
            {isFull && (
                <View style={styles.fullBoostBadge} accessible accessibilityLabel="כל הלבבות מלאים, בונוס XP על השיעור הבא">
                    <Text style={styles.fullBoostText} allowFontScaling={false}>+XP</Text>
                </View>
            )}
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  OutOfHeartsModal, dramatic overlay when hearts = 0                */
/* ------------------------------------------------------------------ */

const HEART_REFILL_COIN_COST = 1500;
const HEART_REFILL_GEM_COST = 25;

interface OutOfHeartsModalProps {
    visible: boolean;
    onDismiss: () => void;
    onUpgrade: () => void;
    onHeartsRefilled?: () => void;
}

function formatTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}

export function OutOfHeartsModal({ visible, onDismiss, onUpgrade, onHeartsRefilled }: OutOfHeartsModalProps) {
    const router = useRouter();
    const lastHeartLostAt = useSubscriptionStore((s) => s.lastHeartLostAt);
    const getHearts = useSubscriptionStore((s) => s.getHearts);
    const hearts = getHearts();
    const coins = useEconomyStore((s) => s.coins);
    const gems = useEconomyStore((s) => s.gems);
    const [timeLeft, setTimeLeft] = useState('');
    const canAffordRefill = coins >= HEART_REFILL_COIN_COST;
    const appActive = useAppActive();

    const { payload: banditPayload, trackImpression, trackConversion, trackDismiss } = useBandit('hearts_depleted_nudge');

    useEffect(() => {
        if (visible) trackImpression();
    }, [visible, trackImpression]);

    // Countdown timer
    useEffect(() => {
        if (!visible) return;
        const tick = () => {
            const ms = getTimeUntilNextHeart(lastHeartLostAt, hearts);
            setTimeLeft(ms > 0 ? formatTime(ms) : 'עכשיו!');
        };
        tick();
        if (!appActive) return;
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [visible, lastHeartLostAt, hearts, appActive]);

    // Gentle pulse animation for emoji
    const pulse = useSharedValue(1);
    const reducedMotion = useReducedMotion();
    useEffect(() => {
        if (visible && !reducedMotion) {
            pulse.value = withRepeat(
                withSequence(
                    withTiming(1.06, { duration: 800 }),
                    withTiming(1, { duration: 800 }),
                ),
                -1,
                true,
            );
        } else {
            cancelAnimation(pulse);
            pulse.value = 1;
        }
        return () => cancelAnimation(pulse);
    }, [visible, pulse, reducedMotion]);

    const emojiStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
    }));

    const handleUpgrade = useCallback(() => {
        tapHaptic();
        onUpgrade();
    }, [onUpgrade]);

    const handleCoinRefill = useCallback(() => {
        const store = useSubscriptionStore.getState();
        const current = store.hearts ?? 0;
        if (current >= MAX_HEARTS) { onDismiss(); return; }
        const success = useEconomyStore.getState().spendCoins(HEART_REFILL_COIN_COST);
        if (success) {
            useSubscriptionStore.setState({ hearts: current + 1, lastHeartLostAt: current + 1 >= MAX_HEARTS ? null : store.lastHeartLostAt });
            successHaptic();
            trackConversion();
            if (onHeartsRefilled) {
                onHeartsRefilled();
            } else {
                onDismiss();
            }
        }
    }, [onDismiss, onHeartsRefilled, trackConversion]);

    const { showAd, isLoaded: adReady, isPro } = useRewardedAd();

    const handleAdRefill = useCallback(() => {
        tapHaptic();
        showAd(() => {
            // Reward: restore 1 heart
            const store = useSubscriptionStore.getState();
            const current = store.hearts ?? 0;
            if (current < MAX_HEARTS) {
                useSubscriptionStore.setState({ hearts: current + 1, lastHeartLostAt: null });
            }
            successHaptic();
            trackConversion();
            if (onHeartsRefilled) {
                onHeartsRefilled();
            } else {
                onDismiss();
            }
        });
    }, [showAd, onDismiss, onHeartsRefilled, trackConversion]);

    const startPracticeForHeart = useSubscriptionStore((s) => s.startPracticeForHeart);
    const practiceRefillsToday = useSubscriptionStore((s) => s.practiceRefillsToday);
    const practiceRefillDate = useSubscriptionStore((s) => s.practiceRefillDate);
    const chapterProgress = useChapterStore((s) => s.progress);
    const setCurrentChapter = useChapterStore((s) => s.setCurrentChapter);
    const setCurrentModule = useChapterStore((s) => s.setCurrentModule);

    const practiceCountToday = practiceRefillDate === new Date().toISOString().slice(0, 10)
        ? practiceRefillsToday
        : 0;
    const canPractice = practiceCountToday < 2;

    const handlePracticeRefill = useCallback(() => {
        tapHaptic();
        // Pick a random completed module across all chapters
        const options: { chapterId: string; moduleId: string; moduleIndex: number }[] = [];
        Object.entries(chapterProgress).forEach(([chapterId, prog]) => {
            prog.completedModules.forEach((moduleId) => {
                // Try to infer moduleIndex from the moduleId (e.g. "mod-1-3" → 2 = index)
                const parts = moduleId.split("-");
                const idx = Number(parts[parts.length - 1]);
                options.push({ chapterId, moduleId, moduleIndex: Number.isFinite(idx) ? Math.max(0, idx - 1) : 0 });
            });
        });
        if (options.length === 0) {
            // No completed modules, nothing to practice, just dismiss
            onDismiss();
            return;
        }
        const ok = startPracticeForHeart();
        if (!ok) {
            onDismiss();
            return;
        }
        const pick = options[Math.floor(Math.random() * options.length)];
        setCurrentChapter(pick.chapterId);
        setCurrentModule(pick.moduleIndex);
        onDismiss();
        // Convert store key (ch-1) → data id (chapter-1) for URL; replay=1 so no re-complete
        const urlChapterId = `chapter-${pick.chapterId.split("-")[1]}`;
        router.push(`/lesson/${pick.moduleId}?chapterId=${urlChapterId}&replay=1` as never);
    }, [chapterProgress, startPracticeForHeart, setCurrentChapter, setCurrentModule, onDismiss, router]);

    const handleGemRefill = useCallback(() => {
        tapHaptic();
        if (gems >= HEART_REFILL_GEM_COST) {
            const store = useSubscriptionStore.getState();
            const current = store.hearts ?? 0;
            if (current >= MAX_HEARTS) { onDismiss(); return; }
            const success = useEconomyStore.getState().spendGems(HEART_REFILL_GEM_COST);
            if (success) {
                useSubscriptionStore.setState({ hearts: current + 1, lastHeartLostAt: current + 1 >= MAX_HEARTS ? null : store.lastHeartLostAt });
                successHaptic();
                trackConversion();
                if (onHeartsRefilled) {
                    onHeartsRefilled();
                } else {
                    onDismiss();
                }
            }
        } else {
            onDismiss();
            router.push('/shop' as never);
        }
    }, [gems, onDismiss, onHeartsRefilled, router, trackConversion]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss} accessibilityViewIsModal>
            <View style={styles.modalOverlay}>
                <Animated.View
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(200)}
                    style={styles.modalCard}
                >
                    <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false} bounces={false}>
                    {/* Finn + Title row */}
                    <View style={styles.finnRow}>
                        <View style={styles.finnTextCol}>
                            <Text style={styles.modalTitle}>{banditPayload.title}</Text>
                            <View style={{ flexDirection: 'row-reverse', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
                                <Text style={styles.modalSubtitle}>
                                    {banditPayload.framingType === 'opportunity' ? banditPayload.subtitle : 'לב חדש בעוד'}
                                </Text>
                                {banditPayload.framingType !== 'opportunity' && <Text style={styles.timer}>{timeLeft}</Text>}
                            </View>
                        </View>
                        <Animated.View style={[styles.finnWrap, emojiStyle]}>
                            <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 110, height: 110 }} contentFit="contain" />
                        </Animated.View>
                    </View>

                    {/* Empty hearts row */}
                    <View style={[styles.heartsRow, { marginVertical: 14 }]}>
                        {Array.from({ length: MAX_HEARTS }).map((_, i) => (
                            <Heart key={i} size={22} color="#cbd5e1" fill="transparent" />
                        ))}
                    </View>

                    {/* Watch ad for 1 heart, non-PRO only.
                        Always render the button so users know the option exists; if the ad
                        hasn't loaded yet (slow network / AdMob inventory dry / freshly approved
                        app), disable the button and surface a "loading" state rather than
                        hiding it — silent disappearance was making users think we removed the
                        feature on iPhone. */}
                    {!isPro && (
                        <Pressable
                            onPress={adReady ? handleAdRefill : undefined}
                            disabled={!adReady}
                            style={[styles.adRefillBtn, !adReady && { opacity: 0.55 }]}
                            accessibilityRole="button"
                            accessibilityLabel={adReady ? "צפו בפרסומת וקבלו לב חינם" : "המודעה נטענת"}
                            accessibilityState={{ disabled: !adReady }}
                        >
                            <Text style={styles.adRefillBtnText}>
                                {adReady ? 'צפו בפרסומת, קבלו ❤️ חינם' : 'טוען פרסומת...'}
                            </Text>
                            <Text style={styles.btnIcon}>🎬</Text>
                        </Pressable>
                    )}

                    {/* Practice-to-Refill (US-006), free, pedagogical, 2/day cap */}
                    {canPractice && (
                        <Pressable
                            onPress={handlePracticeRefill}
                            style={styles.practiceRefillBtn}
                            accessibilityRole="button"
                            accessibilityLabel={`תרגלו שיעור ישן וקבלו לב חינם, נותרו ${2 - practiceCountToday} היום`}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                            <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                <Text style={styles.practiceRefillBtnText}>תרגלו שיעור ישן, קבלו ❤️</Text>
                                <Text style={styles.practiceRefillBtnSubtext}>
                                    נותרו {2 - practiceCountToday} היום
                                </Text>
                            </View>
                            <Text style={styles.btnIcon}>📚</Text>
                        </Pressable>
                    )}

                    {/* Gem instant refill CTA */}
                    <Pressable onPress={handleGemRefill} style={styles.gemRefillBtn} accessibilityRole="button" accessibilityLabel="הוסף לב אחד עם יהלום">
                        <View style={{ flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                            <Text style={styles.gemRefillBtnText}>
                                {gems >= HEART_REFILL_GEM_COST
                                    ? `❤️ +1 • ${HEART_REFILL_GEM_COST}`
                                    : 'קנה 💎 • +1 ❤️'}
                            </Text>
                        </View>
                        <Text style={styles.btnIcon}>💎</Text>
                    </Pressable>

                    {/* Coin refill CTA */}
                    <Pressable
                        onPress={handleCoinRefill}
                        style={[
                            styles.coinRefillBtn,
                            !canAffordRefill && styles.coinRefillBtnDisabled,
                        ]}
                        disabled={!canAffordRefill}
                        accessibilityRole="button"
                        accessibilityLabel="מלא לבבות עם מטבעות"
                        accessibilityState={{ disabled: !canAffordRefill }}
                    >
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                                <Text style={styles.coinRefillBtnText}>{`❤️ +1`}</Text>
                                <Text style={[styles.coinRefillBtnText, { fontWeight: '700', opacity: 0.85 }]}>•</Text>
                                <Text style={styles.coinRefillBtnText}>{HEART_REFILL_COIN_COST}</Text>
                                <GoldCoinIcon size={18} />
                            </View>
                            {!canAffordRefill && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, direction: 'rtl' }}>
                                    <Text style={styles.coinRefillSubtext}>(חסרים</Text>
                                    <Text style={styles.coinRefillSubtext}>{HEART_REFILL_COIN_COST - coins}</Text>
                                    <GoldCoinIcon size={14} />
                                    <Text style={styles.coinRefillSubtext}>)</Text>
                                </View>
                            )}
                        </View>
                    </Pressable>

                    {/* Upgrade CTA */}
                    <Pressable onPress={handleUpgrade} style={styles.upgradeBtn} accessibilityRole="button" accessibilityLabel="שדרגו ל-Pro, לבבות אינסופיים">
                        <Text style={styles.upgradeBtnText}>
                            שדרגו ל-Pro, לבבות אינסופיים
                        </Text>
                        <Text style={styles.btnIcon}>❤️</Text>
                    </Pressable>

                    {/* Wait button */}
                    <Pressable onPress={() => { trackDismiss(); onDismiss(); }} style={styles.waitBtn} accessibilityRole="button" accessibilityLabel="אחכה לחידוש לבבות">
                        <Text style={styles.waitBtnText}>אחכה ⏳</Text>
                    </Pressable>
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
    heartsRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 3,
    },
    fullBoostBadge: {
        backgroundColor: '#fbbf24',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#f59e0b',
    },
    fullBoostText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#78350f',
        letterSpacing: 0.3,
    },
    infinityIcon: {
        fontSize: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(14,165,233,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalCard: {
        width: '100%',
        maxWidth: 360,
        maxHeight: '92%',
        backgroundColor: '#f0f9ff',
        borderRadius: 24,
        borderWidth: 1.5,
        borderColor: 'rgba(14,165,233,0.2)',
        shadowColor: '#0ea5e9',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
    },
    modalScrollContent: {
        padding: 28,
        alignItems: 'center',
    },
    finnRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        marginBottom: 4,
    },
    finnTextCol: {
        flex: 1,
        alignItems: 'flex-end',
    },
    finnWrap: {
        width: 110,
        height: 110,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#0c4a6e',
        writingDirection: 'rtl',
        textAlign: 'right',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 6,
        writingDirection: 'rtl',
        textAlign: 'right',
    },
    timer: {
        fontSize: 22,
        fontWeight: '900',
        color: '#0369a1',
        fontVariant: ['tabular-nums'],
    },
    btnIcon: {
        fontSize: 20,
    },
    coinRefillBtn: {
        width: '100%',
        flexDirection: 'row-reverse',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    coinRefillBtnDisabled: {
        backgroundColor: '#f1f5f9',
        borderColor: '#e2e8f0',
    },
    coinRefillBtnText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1e293b',
        writingDirection: 'rtl',
        textAlign: 'right',
    },
    coinRefillSubtext: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748b',
        marginTop: 2,
        writingDirection: 'rtl',
        textAlign: 'right',
    },
    upgradeBtn: {
        width: '100%',
        flexDirection: 'row-reverse',
        backgroundColor: '#0ea5e9',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 3,
        borderBottomColor: '#0284c7',
        shadowColor: '#0ea5e9',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    upgradeBtnText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#ffffff',
        writingDirection: 'rtl',
        textAlign: 'right',
    },
    waitBtn: {
        marginTop: 12,
        paddingVertical: 10,
        paddingHorizontal: 24,
    },
    waitBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748b',
        writingDirection: 'rtl',
    },
    adRefillBtn: {
        width: '100%',
        flexDirection: 'row-reverse',
        backgroundColor: '#0ea5e9',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        borderBottomWidth: 4,
        borderBottomColor: '#0369a1',
        shadowColor: '#0ea5e9',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    adRefillBtnText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#ffffff',
        writingDirection: 'rtl',
    },
    practiceRefillBtn: {
        width: '100%',
        flexDirection: 'row-reverse',
        backgroundColor: '#7dd3fc',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        borderBottomWidth: 3,
        borderBottomColor: '#0284c7',
    },
    practiceRefillBtnText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#082f49',
        writingDirection: 'rtl',
    },
    practiceRefillBtnSubtext: {
        fontSize: 11,
        fontWeight: '600',
        color: '#082f49',
        opacity: 0.7,
        writingDirection: 'rtl',
        marginTop: 2,
    },
    gemRefillBtn: {
        width: '100%',
        flexDirection: 'row-reverse',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        borderWidth: 1.5,
        borderColor: 'rgba(14,165,233,0.25)',
        shadowColor: '#0ea5e9',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    gemRefillBtnText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0c4a6e',
        writingDirection: 'rtl',
        textAlign: 'right',
    },
});
