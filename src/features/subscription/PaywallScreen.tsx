import { useCallback, useEffect, useState } from 'react';
import { Image as ExpoImage } from "expo-image";
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Check, X, Crown } from 'lucide-react-native';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
    FadeIn,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    withDelay,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSubscriptionStore } from './useSubscriptionStore';
import { FINN_HAPPY, FINN_STANDARD } from '../retention-loops/finnMascotConfig';
import { heavyHaptic, successHaptic } from '../../utils/haptics';

/* ------------------------------------------------------------------ */
/*  Comparison table data                                              */
/* ------------------------------------------------------------------ */

interface ComparisonRow {
    label: string;
    free: boolean | string;
    pro: true;
}

const COMPARISON_ROWS: ComparisonRow[] = [
    { label: 'תוכן למידה', free: true, pro: true },
    { label: 'לבבות אינסופיים', free: false, pro: true },
    { label: 'ללא פרסומות', free: false, pro: true },
    { label: 'סימולטורים ללא הגבלה', free: '3 ביום', pro: true },
    { label: 'אתגרי ארנה ללא הגבלה', free: '3 ביום', pro: true },
    { label: 'צ׳אט AI ללא הגבלה', free: '5 ביום', pro: true },
];

/* ------------------------------------------------------------------ */
/*  Cell renderer                                                      */
/* ------------------------------------------------------------------ */

function CellValue({ value }: { value: boolean | string }) {
    if (value === true) return <Check size={18} color="#22c55e" />;
    if (value === false) return <X size={18} color="#d1d5db" />;
    return <Text style={styles.limitText}>{value}</Text>;
}

/* ------------------------------------------------------------------ */
/*  PaywallScreen                                                      */
/* ------------------------------------------------------------------ */

interface PaywallScreenProps {
    visible: boolean;
    onDismiss: () => void;
}

type PlanChoice = 'monthly' | 'yearly';

const PLANS: Record<PlanChoice, { label: string; price: string; perMonth: string; originalPerMonth?: string; badge?: string }> = {
    monthly: { label: 'חודשי', price: '₪36.90/חודש', perMonth: '₪36.90' },
    yearly: { label: 'שנתי', price: '₪289.90/שנה', perMonth: '₪24.16', originalPerMonth: '₪36.90', badge: 'חסוך 35%' },
};

export function PaywallScreen({ visible, onDismiss }: PaywallScreenProps) {
    const router = useRouter();
    const upgradeToPro = useSubscriptionStore((s) => s.upgradeToPro);
    const hasSeenProWelcome = useSubscriptionStore((s) => s.hasSeenProWelcome);
    const [selectedPlan, setSelectedPlan] = useState<PlanChoice>('yearly');
    // Sparkle opacity animations (3 staggered dots)
    const sparkle1 = useSharedValue(0.3);
    const sparkle2 = useSharedValue(0.3);
    const sparkle3 = useSharedValue(0.3);
    const ctaScale = useSharedValue(1);

    useEffect(() => {
        if (!visible) return;

        const pulse = withRepeat(
            withSequence(withTiming(1, { duration: 900 }), withTiming(0.3, { duration: 900 })),
            -1,
            true,
        );
        sparkle1.value = pulse;
        sparkle2.value = withDelay(300, pulse);
        sparkle3.value = withDelay(600, pulse);

        ctaScale.value = withRepeat(
            withSequence(withTiming(1.03, { duration: 1200 }), withTiming(1, { duration: 1200 })),
            -1,
            true,
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    const sparkleStyle1 = useAnimatedStyle(() => ({ opacity: sparkle1.value }));
    const sparkleStyle2 = useAnimatedStyle(() => ({ opacity: sparkle2.value }));
    const sparkleStyle3 = useAnimatedStyle(() => ({ opacity: sparkle3.value }));
    const ctaPulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: ctaScale.value }] }));

    const handleSubscribe = useCallback(() => {
        heavyHaptic();
        upgradeToPro();
        successHaptic();
        onDismiss();
        if (!hasSeenProWelcome) {
            router.push("/pro-welcome" as never);
        }
    }, [upgradeToPro, onDismiss, hasSeenProWelcome, router]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss} statusBarTranslucent accessibilityViewIsModal>
            <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }} edges={['top', 'bottom']}>
                {/* ── Hero Section ── */}
                <LinearGradient colors={['#1a0a3e', '#2d1066', '#1a0a3e']} style={styles.hero}>
                    {/* Sparkle dots */}
                    <Animated.View style={[styles.sparkleDot, styles.sparkle1, sparkleStyle1]} />
                    <Animated.View style={[styles.sparkleDot, styles.sparkle2, sparkleStyle2]} />
                    <Animated.View style={[styles.sparkleDot, styles.sparkle3, sparkleStyle3]} />

                    {/* Finn mascot */}
                    <Animated.View entering={FadeIn.duration(400)}>
                        <ExpoImage source={FINN_STANDARD} accessible={false}
                            style={styles.finn}
                           
                           
                            contentFit="contain"
                        />
                    </Animated.View>

                    {/* Killer stat */}
                    <Text style={styles.statLine}>משתמשי פרו מסיימים בסבירות של פי</Text>
                    <Text style={styles.statHighlight}>3.1X</Text>
                    <Text style={styles.statLine}>!את הקורסים והתכנים</Text>
                </LinearGradient>

                {/* ── Comparison Table ── */}
                <View style={styles.tableContainer}>
                    {/* Header */}
                    <View style={styles.tableHeader}>
                        <Text style={styles.freeHeader}>חינם</Text>
                        <View style={{ flex: 1 }} />
                        <View style={styles.proBadge}>
                            <Crown size={12} color="#000" />
                            <Text style={styles.proBadgeText}>PRO</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Rows */}
                    {COMPARISON_ROWS.map((row) => (
                        <View key={row.label} style={styles.tableRow}>
                            <View style={styles.tableCell}>
                                <CellValue value={row.free} />
                            </View>
                            <Text style={styles.rowLabel}>{row.label}</Text>
                            <View style={styles.tableCell}>
                                <Check size={18} color="#22c55e" />
                            </View>
                        </View>
                    ))}
                </View>

                {/* ── Plan Picker + CTA ── */}
                <View style={styles.ctaSection}>
                    {/* Plan toggle */}
                    <View style={styles.planRow}>
                        {(Object.entries(PLANS) as [PlanChoice, typeof PLANS['monthly']][]).map(([key, plan]) => {
                            const active = selectedPlan === key;
                            return (
                                <Pressable
                                    key={key}
                                    onPress={() => setSelectedPlan(key)}
                                    style={[styles.planCard, active && styles.planCardActive]}
                                    accessibilityRole="radio"
                                    accessibilityState={{ selected: active }}
                                    accessibilityLabel={`${plan.label}, ${plan.price}`}
                                >
                                    {plan.badge && <View style={styles.planBadge}><Text style={styles.planBadgeText}>{plan.badge}</Text></View>}
                                    <Text style={[styles.planLabel, active && styles.planLabelActive]}>{plan.label}</Text>
                                    {plan.originalPerMonth && (
                                        <Text style={styles.planOriginal}>{plan.originalPerMonth}</Text>
                                    )}
                                    <Text style={[styles.planPrice, active && styles.planPriceActive]}>{plan.perMonth}</Text>
                                    <Text style={[styles.planSub, active && styles.planSubActive]}>לחודש</Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    <Animated.View style={[{ width: '85%' }, ctaPulseStyle]}>
                        <Pressable onPress={handleSubscribe} style={styles.ctaWrapper} accessibilityRole="button" accessibilityLabel={`הירשם לתוכנית ${PLANS[selectedPlan].label}`}>
                            <LinearGradient
                                colors={["#0a2540", "#164e63", "#0a2540"]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                style={styles.ctaFace}
                            >
                                <Text style={styles.ctaText}>שדרג ל-PRO עכשיו</Text>
                            </LinearGradient>
                        </Pressable>
                    </Animated.View>

                    <Pressable onPress={onDismiss} style={styles.dismissBtn} accessibilityRole="button" accessibilityLabel="לא תודה">
                        <Text style={styles.dismissText}>לא תודה</Text>
                    </Pressable>

                    <Text style={styles.finePrint}>
                        {selectedPlan === 'yearly' ? '₪289.90/שנה · ' : '₪36.90/חודש · '}ביטול בכל עת · ללא התחייבות
                    </Text>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
    /* Hero */
    hero: {
        flex: 0.32,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 8,
    },
    sparkleDot: {
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(250,204,21,0.6)',
    },
    sparkle1: { top: '18%', left: '12%' },
    sparkle2: { top: '30%', right: '15%' },
    sparkle3: { bottom: '22%', left: '22%' },
    finn: {
        width: 260,
        height: 260,
    },
    statLine: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
        writingDirection: 'rtl',
        textAlign: 'center',
        lineHeight: 24,
    },
    statHighlight: {
        color: '#facc15',
        fontSize: 38,
        fontWeight: '900',
        marginVertical: 2,
        letterSpacing: 2,
    },

    /* Table */
    tableContainer: {
        flex: 0.36,
        backgroundColor: '#ffffff',
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    tableHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingBottom: 12,
    },
    freeHeader: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748b',
        writingDirection: 'rtl',
    },
    proBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#facc15',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    proBadgeText: {
        fontSize: 13,
        fontWeight: '900',
        color: '#000',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.08)',
    },
    tableRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 11,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.06)',
    },
    tableCell: {
        width: 50,
        alignItems: 'center',
    },
    rowLabel: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
        writingDirection: 'rtl',
        textAlign: 'right',
    },
    limitText: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '600',
    },

    /* Plan picker */
    planRow: {
        flexDirection: 'row-reverse',
        gap: 10,
        paddingHorizontal: 20,
        marginBottom: 12,
        width: '100%',
    },
    planCard: {
        flex: 1,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        backgroundColor: '#f9fafb',
        paddingVertical: 12,
        alignItems: 'center',
        position: 'relative',
        overflow: 'visible',
    },
    planCardActive: {
        borderColor: '#facc15',
        backgroundColor: '#fffbeb',
    },
    planBadge: {
        position: 'absolute',
        top: -10,
        backgroundColor: '#facc15',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    planBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#000',
        writingDirection: 'rtl',
    },
    planLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748b',
        writingDirection: 'rtl',
    },
    planLabelActive: {
        color: '#1f2937',
    },
    planOriginal: {
        fontSize: 12,
        fontWeight: '600',
        color: '#d1d5db',
        textDecorationLine: 'line-through',
        marginTop: 2,
    },
    planPrice: {
        fontSize: 20,
        fontWeight: '900',
        color: '#64748b',
        marginTop: 2,
    },
    planPriceActive: {
        color: '#0f172a',
    },
    planSub: {
        fontSize: 11,
        fontWeight: '600',
        color: '#d1d5db',
        writingDirection: 'rtl',
    },
    planSubActive: {
        color: '#64748b',
    },

    /* CTA */
    ctaSection: {
        flex: 0.32,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        paddingBottom: 8,
    },
    ctaWrapper: {
        width: '100%',
        borderRadius: 16,
        position: 'relative',
    },
    ctaDepth: {
        position: 'absolute',
        top: 4,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 16,
        backgroundColor: '#b45309',
    },
    ctaFace: {
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
    },
    ctaText: {
        fontSize: 17,
        fontWeight: '900',
        color: '#ffffff',
        writingDirection: 'rtl',
    },
    dismissBtn: {
        paddingVertical: 8,
        marginTop: 4,
    },
    dismissText: {
        fontSize: 14,
        color: '#64748b',
        writingDirection: 'rtl',
    },
    finePrint: {
        fontSize: 11,
        color: '#d1d5db',
        marginTop: 2,
        writingDirection: 'rtl',
    },
});
