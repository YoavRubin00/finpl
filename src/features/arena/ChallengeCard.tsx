import { View, Text, StyleSheet } from "react-native";
import { CheckCircle, Zap } from "lucide-react-native";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { GlowCard } from "../../components/ui/GlowCard";
import { GoldCoinIcon } from "../../components/ui/GoldCoinIcon";
import type { Challenge } from "./types";
import { tapHaptic } from "../../utils/haptics";

interface ChallengeCardProps {
  challenge: Challenge;
  isCompleted: boolean;
  onComplete: () => void;
}

export function ChallengeCard({
  challenge,
  isCompleted,
  onComplete,
}: ChallengeCardProps) {
  return (
    <GlowCard
      glowColor={isCompleted ? "#4ade80" : "#f1f5f9"}
      pressable={false}
      style={{ marginBottom: 12 }}
    >
      <View style={s.cardInner}>
        {/* Completion toggle */}
        <AnimatedPressable
          onPress={() => { tapHaptic(); onComplete(); }}
          disabled={isCompleted}
          style={s.toggle}
        >
          {isCompleted ? (
            <CheckCircle size={26} color="#4ade80" />
          ) : (
            <View style={s.circle} />
          )}
        </AnimatedPressable>

        <View style={s.content}>
          <Text
            style={[
              s.title,
              isCompleted && s.completedTitle
            ]}
          >
            {challenge.title}
          </Text>
          <Text style={s.desc}>
            {challenge.description}
          </Text>

          {/* Rewards row */}
          <View style={s.rewards}>
            <View style={s.rewardPill}>
              <Zap size={12} color="#7c3aed" />
              <Text style={s.rewardText}>+{challenge.xpReward} XP</Text>
            </View>
            <View style={[s.rewardPill, { backgroundColor: '#fefce8' }]}>
              <GoldCoinIcon size={14} />
              <Text style={[s.rewardText, { color: '#854d0e' }]}>+{challenge.coinReward}</Text>
            </View>
          </View>
        </View>
      </View>
    </GlowCard>
  );
}

const s = StyleSheet.create({
  cardInner: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    padding: 16,
    gap: 16,
  },
  toggle: {
    padding: 4,
  },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'right',
  },
  completedTitle: {
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  desc: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
    marginTop: 2,
    lineHeight: 18,
  },
  rewards: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  rewardPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rewardText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#7c3aed',
  },
});
