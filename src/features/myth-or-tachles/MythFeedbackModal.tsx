import { useEffect } from 'react';
import { Image as ExpoImage } from "expo-image";
import { View, Text, Modal, Pressable, StyleSheet, Image,
} from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { successHaptic, errorHaptic } from '../../utils/haptics';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import { FINN_STANDARD } from '../retention-loops/finnMascotConfig';
import type { MythCard } from './mythTypes';
import type { ModifierType } from '../economy/useModifiersStore';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface Props {
    visible: boolean;
    card: MythCard | null;
    wasCorrect: boolean;
    modifierWon?: ModifierType | null;
    onNext: () => void;
}

const MODIFIER_LABELS: Record<ModifierType, string> = {
    real_estate_discount: 'הנחה 10% בנדל״ן ל-24 שעות!',
    stock_boost: 'בונוס 10% במניות ל-24 שעות!',
    salary_boost: 'תוספת משכורת 10% ל-24 שעות!',
};

export function MythFeedbackModal({ visible, card, wasCorrect, modifierWon, onNext }: Props) {
    const { playSound } = useSoundEffect();

    useEffect(() => {
        if (!visible || !card) return;
        if (wasCorrect) {
            successHaptic();
            void playSound('modal_open_1');
        } else {
            errorHaptic();
            void playSound('modal_open_2');
        }
    }, [visible, card, wasCorrect, playSound]);

    if (!card) return null;

    const emoji = wasCorrect ? '✅' : '❌';
    const headline = wasCorrect ? 'נכון!' : "לא נורא, בשביל זה אנחנו פה!";
    const headlineColor = wasCorrect ? '#22c55e' : '#f97316';

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            statusBarTranslucent
            onRequestClose={onNext}
        >
            <Pressable style={styles.backdrop} onPress={onNext} />

            <View style={styles.sheet}>
                {/* Drag handle */}
                <View style={styles.handle} />

                <Animated.View entering={FadeInDown.duration(300)} style={styles.content}>
                    {/* Finn + Result */}
                    <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: 'center' }}>
                        <ExpoImage source={FINN_STANDARD} style={{ width: 160, height: 160 }} contentFit="contain" />
                    </Animated.View>

                    {/* Headline */}
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                        {wasCorrect && <LottieView source={require('../../../assets/lottie/wired-flat-1103-confetti-hover-pinch.json')} style={{ width: 32, height: 32 }} autoPlay loop={false} />}
                        <Text style={[styles.headline, { color: headlineColor }]}>
                            {headline}
                        </Text>
                        {wasCorrect && <LottieView source={require('../../../assets/lottie/wired-flat-1103-confetti-hover-pinch.json')} style={{ width: 32, height: 32 }} autoPlay loop={false} />}
                    </View>

                    {/* Coin badge (correct only) */}
                    {wasCorrect && (
                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                            <View style={styles.coinBadge}>
                                <Text style={styles.coinText}>+10 מטבעות </Text>
                            </View>
                            {modifierWon && (
                                <Animated.View entering={ZoomIn.springify().delay(200)} style={[styles.coinBadge, { backgroundColor: 'rgba(14,165,233,0.08)', borderColor: 'rgba(14,165,233,0.3)' }]}>
                                    <Text style={[styles.coinText, { color: '#0891b2' }]}>🎁 {MODIFIER_LABELS[modifierWon]}</Text>
                                </Animated.View>
                            )}
                        </View>
                    )}

                    {/* Explanation */}
                    <View style={styles.explanationBox}>
                        <Text style={[styles.explanationLabel, RTL]}>ההסבר:</Text>
                        <Text style={[styles.explanationText, RTL]}>{card.explanation}</Text>
                    </View>

                    {/* Next button */}
                    <Pressable
                        style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.8 }]}
                        onPress={onNext}
                    >
                        <Text style={styles.nextBtnText}>הכרטיס הבא ›</Text>
                    </Pressable>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    sheet: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 20,
    },
    handle: {
        width: 44,
        height: 4,
        backgroundColor: '#e2e8f0',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 4,
    },
    content: {
        padding: 24,
        alignItems: 'center',
        gap: 16,
    },
    emoji: {
        fontSize: 56,
    },
    headline: {
        fontSize: 22,
        fontWeight: '900',
        writingDirection: 'rtl',
        textAlign: 'center',
    },
    coinBadge: {
        backgroundColor: 'rgba(250,204,21,0.08)',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: 'rgba(250,204,21,0.35)',
    },
    coinText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#d97706',
        writingDirection: 'rtl',
    },
    explanationBox: {
        width: '100%',
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        gap: 6,
    },
    explanationLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0891b2',
        letterSpacing: 0.5,
    },
    explanationText: {
        fontSize: 15,
        color: '#334155',
        lineHeight: 24,
        fontWeight: '500',
    },
    nextBtn: {
        width: '100%',
        backgroundColor: '#0891b2',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 4,
        shadowColor: '#0891b2',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
    },
    nextBtnText: {
        fontSize: 17,
        fontWeight: '800',
        color: '#ffffff',
        letterSpacing: 0.3,
    },
});
