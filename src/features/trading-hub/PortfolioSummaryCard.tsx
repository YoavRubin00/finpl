import { View, Text, StyleSheet } from 'react-native';
import { CALM } from '../../constants/theme';
import { LottieIcon } from '../../components/ui/LottieIcon';

const LOTTIE_CHART = require('../../../assets/lottie/wired-flat-153-bar-chart-hover-pinch.json');
const LOTTIE_COIN = require('../../../assets/lottie/wired-flat-291-coin-dollar-hover-pinch.json');

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface PortfolioSummaryCardProps {
    totalInvested: number;
    totalCurrentValue: number;
    totalPnl: number;
    totalPnlPercent: number;
    availableCoins: number;
}

export function PortfolioSummaryCard({
    totalInvested,
    totalCurrentValue,
    totalPnl,
    totalPnlPercent,
    availableCoins,
}: PortfolioSummaryCardProps) {
    const isProfit = totalPnl >= 0;
    const pnlColor = isProfit ? CALM.profit : CALM.loss;
    const pnlBg = isProfit ? CALM.profitSurface : CALM.lossSurface;
    const pnlSign = isProfit ? '+' : '';

    return (
        <View style={styles.card}>
            {/* Top: Portfolio Value */}
            <View style={styles.headerRow}>
                <LottieIcon source={LOTTIE_CHART} size={28} />
                <Text style={[RTL, styles.headerLabel]}>שווי תיק</Text>
            </View>
            <Text style={styles.totalValue}>
                {totalCurrentValue.toLocaleString('he-IL')} 
            </Text>

            {/* Stats 2x2 grid */}
            <View style={styles.statsGrid}>
                <View style={styles.statCell}>
                    <Text style={[RTL, styles.statLabel]}>רווח/הפסד</Text>
                    <View style={[styles.pnlBadge, { backgroundColor: pnlBg }]}>
                        <Text style={[styles.pnlText, { color: pnlColor }]}>
                            {pnlSign}{totalPnl.toLocaleString('he-IL')} ({pnlSign}{totalPnlPercent.toFixed(1)}%)
                        </Text>
                    </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.statCell}>
                    <Text style={[RTL, styles.statLabel]}>כח קניה</Text>
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                        <LottieIcon source={LOTTIE_COIN} size={18} />
                        <Text style={styles.statValue}>
                            {availableCoins.toLocaleString('he-IL')}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.statsGrid}>
                <View style={styles.statCell}>
                    <Text style={[RTL, styles.statLabel]}>השקעה כוללת</Text>
                    <Text style={styles.statValue}>
                        {totalInvested.toLocaleString('he-IL')} 
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: CALM.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: CALM.border,
        padding: 20,
        marginHorizontal: 16,
        gap: 12,
    },
    headerRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
    },
    headerLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: CALM.textSecondary,
    },
    totalValue: {
        fontSize: 32,
        fontWeight: '900',
        color: CALM.textPrimary,
        textAlign: 'center',
        fontVariant: ['tabular-nums'],
    },
    statsGrid: {
        flexDirection: 'row-reverse',
        gap: 12,
    },
    statCell: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    divider: {
        width: 1,
        backgroundColor: CALM.divider,
    },
    statLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: CALM.textSecondary,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '900',
        color: CALM.textPrimary,
        fontVariant: ['tabular-nums'],
    },
    pnlBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 10,
    },
    pnlText: {
        fontSize: 14,
        fontWeight: '900',
        fontVariant: ['tabular-nums'],
    },
});
