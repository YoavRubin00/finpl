import { View, Text } from "react-native";
import Animated from "react-native-reanimated";
import { Flame, Star, Coins } from "lucide-react-native";
import { useEconomy } from "../economy/useEconomy";
import { useStreak } from "../economy/useStreak";
import {
  useEntranceAnimation,
  fadeInUp,
} from "../../utils/animations";

interface StatItemProps {
  icon: React.ReactNode;
  value: number;
  color: string;
}

function StatItem({ icon, value, color }: StatItemProps) {
  return (
    <View
      className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl"
      style={{ backgroundColor: `${color}15` }}
    >
      {icon}
      <Text className="text-base font-bold" style={{ color }}>
        {value.toLocaleString()}
      </Text>
    </View>
  );
}

export function ArenaStatsBar() {
  const { data: economyData } = useEconomy();
  const { data: streakData } = useStreak();
  const xp = economyData?.xp ?? 0;
  const coins = economyData?.coins ?? 0;
  const streak = streakData?.currentStreak ?? 0;

  const entranceStyle = useEntranceAnimation(fadeInUp, { delay: 100 });

  return (
    <Animated.View
      style={entranceStyle}
      className="flex-row justify-center gap-3 mb-5"
    >
      <StatItem
        icon={<Flame size={18} color="#f97316" />}
        value={streak}
        color="#f97316"
      />
      <StatItem
        icon={<Star size={18} color="#a78bfa" />}
        value={xp}
        color="#a78bfa"
      />
      <StatItem
        icon={<Coins size={18} color="#fbbf24" />}
        value={coins}
        color="#fbbf24"
      />
    </Animated.View>
  );
}
