import { useEffect, useState, useCallback } from 'react';
import { Image as ExpoImage } from "expo-image";
import { View, Text, Pressable, StyleSheet, Modal, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    cancelAnimation,
    useReducedMotion,
    FadeIn,
    FadeOut,
} from 'react-native-reanimated';
import { useHeartsStore, MAX_HEARTS, MAX_ENERGY } from './useHeartsStore';
import { getTimeUntilNextHeart } from './subscriptionConstants';
import { EnergyBatteryIcon } from '../../components/ui/EnergyBatteryIcon';
import { ENERGY } from '../energy/energyTheme';
import { SHARK_LOW_NUDGE } from '../energy/energyScenes';
import { ProUpsellCard } from './ProUpsellCard';
import { captureEvent } from '../../lib/posthog';
import { useEconomy, economyQueryKey } from '../../features/economy/useEconomy';
import { fireEconomyDelta } from '../../features/economy/useEconomyUIStore';
import { queryClient } from '../../lib/queryClient';
import type { Economy } from '../../lib/api/economy';
import { tapHaptic, successHaptic } from '../../utils/haptics';
import { useRewardedAd } from '../../hooks/useRewardedAd';
import { useBandit } from '../bandit/useBandit';
import { useAppActive } from '../../hooks/useAppActive';
import { useIsPro } from './useSubscription';

/* ------------------------------------------------------------------ */
/*  EnergyDisplay (exported as HeartsDisplay for back-compat) —         */
/*  compact purple battery + count, for the lesson header.             */
/* ------------------------------------------------------------------ */

export function HeartsDisplay() {
    const units = useHeartsStore((s) => s.hearts);
    const isPro = useIsPro();

    // Settle passive regen once on mount.
    useEffect(() => {
        useHeartsStore.getState().refillHearts();
    }, []);

    // Pro users have unlimited energy — stop advertising it (Yoav 18/06): hide
    // the in-lesson energy bar entirely for Pro instead of showing ∞.
    if (isPro) return null;

    const value = units;
    const level = isPro ? 1 : (MAX_ENERGY > 0 ? value / MAX_ENERGY : 0);

    return (
        <View
            style={styles.energyRow}
            accessibilityRole="progressbar"
            accessibilityLabel={isPro ? 'אנרגיה: אינסופית' : `אנרגיה: ${value} מתוך ${MAX_ENERGY}`}
            accessibilityValue={isPro ? undefined : { min: 0, max: MAX_ENERGY, now: value }}
        >
            <EnergyBatteryIcon size={20} level={level} />
            <Text style={styles.energyCount} allowFontScaling={false}>
                {isPro ? '∞' : `${value}/${MAX_ENERGY}`}
            </Text>
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  EnergyDepletedModal (exported as OutOfHeartsModal) — shown at 0     */
/* ------------------------------------------------------------------ */

// Energy refill pricing. The COIN path is deliberately expensive (Yoav: it must
// NOT be an easy money bypass) — a full refill for a hefty price, so the cheap
// routes stay "wait / watch an ad / play a game", not "pay coins". The ad path
// stays generous (+8) since ads are the play-first-friendly free option.
const ENERGY_REFILL_COIN_COST = 5000; // full battery (20), a real decision
const ENERGY_AD_GRANT = 8;

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
    const lastHeartLostAt = useHeartsStore((s) => s.lastHeartLostAt);
    const getHearts = useHeartsStore((s) => s.getHearts);
    const energy = getHearts();
    const { data: economyData } = useEconomy();
    const coins = economyData?.coins ?? 0;
    const [timeLeft, setTimeLeft] = useState('');
    const appActive = useAppActive();

    const { payload: banditPayload, trackImpression, trackConversion, trackDismiss } = useBandit('hearts_depleted_nudge');

    useEffect(() => {
        if (visible) trackImpression();
    }, [visible, trackImpression]);

    // Countdown timer
    useEffect(() => {
        if (!visible) return;
        const tick = () => {
            const ms = getTimeUntilNextHeart(lastHeartLostAt, energy);
            setTimeLeft(ms > 0 ? formatTime(ms) : 'עכשיו!');
        };
        tick();
        if (!appActive) return;
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [visible, lastHeartLostAt, energy, appActive]);

    // Gentle pulse animation for the shark
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

    const sharkStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
    }));

    const handleUpgrade = useCallback(() => {
        tapHaptic();
        onUpgrade();
    }, [onUpgrade]);

    const { showAd, isLoaded: adReady, isPro } = useRewardedAd();

    const handleAdRefill = useCallback(() => {
        tapHaptic();
        showAd(() => {
            // Reward: top up energy (+8) instead of a single heart.
            const granted = useHeartsStore.getState().grantEnergy(ENERGY_AD_GRANT, 'ad', 12);
            try { captureEvent('energy_ad_watched', { granted }); } catch { /* non-fatal */ }
            successHaptic();
            trackConversion();
            if (onHeartsRefilled) {
                onHeartsRefilled();
            } else {
                onDismiss();
            }
        });
    }, [showAd, onDismiss, onHeartsRefilled, trackConversion]);

    // Buy a FULL energy refill with coins (deliberately pricey — not a casual bypass).
    const handleCoinRefill = useCallback(() => {
        tapHaptic();
        const store = useHeartsStore.getState();
        if (store.getHearts() >= MAX_HEARTS) { onDismiss(); return; }
        const cachedEco = queryClient.getQueryData<Economy | null>(economyQueryKey);
        const canAfford = (cachedEco?.coins ?? 0) >= ENERGY_REFILL_COIN_COST;
        if (canAfford) {
            fireEconomyDelta({ coinsDelta: -ENERGY_REFILL_COIN_COST });
            const granted = store.grantEnergy(MAX_HEARTS, 'coin-refill'); // full refill
            try { captureEvent('energy_purchased', { cost: ENERGY_REFILL_COIN_COST, granted, currency: 'coins' }); } catch { /* non-fatal */ }
            successHaptic();
            trackConversion();
            if (onHeartsRefilled) {
                onHeartsRefilled();
            } else {
                onDismiss();
            }
        } else {
            onDismiss();
            router.push('/shop' as never);
        }
    }, [onDismiss, onHeartsRefilled, router, trackConversion]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss} accessibilityViewIsModal>
            <View style={styles.modalOverlay}>
                <Animated.View
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(200)}
                    style={styles.modalCard}
                >
                    <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false} bounces={false}>
                    {/* Shark + Title row */}
                    <View style={styles.finnRow}>
                        <View style={styles.finnTextCol}>
                            <Text style={styles.modalTitle}>{banditPayload.title}</Text>
                            <View style={{ flexDirection: 'row-reverse', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
                                <Text style={styles.modalSubtitle}>
                                    {banditPayload.framingType === 'opportunity' ? banditPayload.subtitle : 'אנרגיה חוזרת בעוד'}
                                </Text>
                                {banditPayload.framingType !== 'opportunity' && <Text style={styles.timer}>{timeLeft}</Text>}
                            </View>
                        </View>
                        <Animated.View style={[styles.finnWrap, sharkStyle]}>
                            <ExpoImage source={SHARK_LOW_NUDGE} accessible={false} style={{ width: 110, height: 110 }} contentFit="contain" />
                        </Animated.View>
                    </View>

                    {/* Current energy battery (drained low) */}
                    <View style={{ marginVertical: 14, alignItems: 'center' }}>
                        <EnergyBatteryIcon size={150} level={MAX_ENERGY > 0 ? energy / MAX_ENERGY : 0} />
                    </View>

                    {/* Watch ad → energy, non-PRO only. Always render the button so users
                        know the option exists; if the ad hasn't loaded yet, disable +
                        show a "loading" state rather than hiding it. */}
                    {!isPro && (
                        <Pressable
                            onPress={adReady ? handleAdRefill : undefined}
                            disabled={!adReady}
                            style={[styles.adRefillBtn, !adReady && { opacity: 0.55 }]}
                            accessibilityRole="button"
                            accessibilityLabel={adReady ? "צפו בפרסומת וקבלו אנרגיה" : "המודעה נטענת"}
                            accessibilityState={{ disabled: !adReady }}
                        >
                            <Text style={styles.adRefillBtnText}>
                                {adReady ? 'צפו בפרסומת, קבלו אנרגיה' : 'טוען פרסומת...'}
                            </Text>
                            <Text style={styles.btnIcon}>🎬</Text>
                        </Pressable>
                    )}

                    {/* Coin full-refill CTA (deliberately pricey) */}
                    <Pressable onPress={handleCoinRefill} style={styles.coinRefillBtn} accessibilityRole="button" accessibilityLabel="מלאו אנרגיה במטבעות">
                        <View style={{ flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                            <EnergyBatteryIcon size={20} level={1} />
                            <Text style={styles.coinRefillBtnText}>
                                {coins >= ENERGY_REFILL_COIN_COST
                                    ? `מילוי מלא • ${ENERGY_REFILL_COIN_COST.toLocaleString()} מטבעות`
                                    : 'קנו מטבעות למילוי'}
                            </Text>
                        </View>
                        <Text style={styles.btnIcon}>🪙</Text>
                    </Pressable>

                    {/* Upgrade CTA — deep-blue Profile-format card */}
                    {!isPro && (
                        <View style={{ width: '100%', marginTop: 2 }}>
                            <ProUpsellCard
                                source="energy_depleted"
                                headline="אנרגיה אינסופית + בוסט XP"
                                onPress={handleUpgrade}
                            />
                        </View>
                    )}

                    {/* Wait button */}
                    <Pressable onPress={() => { trackDismiss(); onDismiss(); }} style={styles.waitBtn} accessibilityRole="button" accessibilityLabel="אחכה לחידוש האנרגיה">
                        <Text style={styles.waitBtnText}>אחכה ⏳</Text>
                    </Pressable>
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
}

/* ------------------------------------------------------------------ */
/*  GlobalEnergyDepletedModal — mounted once at the app root. Shows the */
/*  EnergyDepletedModal whenever energy runs out OUTSIDE a lesson       */
/*  (financial tools, AI chat) via the store's depletedPromptVisible.   */
/* ------------------------------------------------------------------ */

export function GlobalEnergyDepletedModal() {
    const visible = useHeartsStore((s) => s.depletedPromptVisible);
    const clearDepleted = useHeartsStore((s) => s.clearDepleted);
    const router = useRouter();
    return (
        <OutOfHeartsModal
            visible={visible}
            onDismiss={clearDepleted}
            onUpgrade={() => { clearDepleted(); router.push('/pricing?source=energy_depleted_global' as never); }}
            onHeartsRefilled={clearDepleted}
        />
    );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
    energyRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
    },
    energyCount: {
        fontSize: 14,
        fontWeight: '800',
        color: ENERGY.deep,
        fontVariant: ['tabular-nums'],
        writingDirection: 'rtl',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(124,58,237,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalCard: {
        width: '100%',
        maxWidth: 360,
        maxHeight: '92%',
        backgroundColor: '#faf5ff',
        borderRadius: 24,
        borderWidth: 1.5,
        borderColor: 'rgba(124,58,237,0.2)',
        shadowColor: ENERGY.deep,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
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
        color: '#6b21a8',
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
        color: ENERGY.deep,
        fontVariant: ['tabular-nums'],
    },
    btnIcon: {
        fontSize: 20,
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
        backgroundColor: ENERGY.base,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        borderBottomWidth: 4,
        borderBottomColor: ENERGY.deep,
        shadowColor: ENERGY.base,
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
        borderColor: 'rgba(124,58,237,0.25)',
        shadowColor: ENERGY.deep,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    coinRefillBtnText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#6b21a8',
        writingDirection: 'rtl',
        textAlign: 'right',
    },
});
