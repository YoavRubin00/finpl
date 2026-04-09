import { useMemo } from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { X, Clock, Swords } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useClashStore } from "./useClashStore";
import { useAuthStore } from "../auth/useAuthStore";
import {
  useEntranceAnimation,
  fadeInScale,
  fadeInUp,
  slideInLeft,
  slideInRight,
  SPRING_BOUNCY,
} from "../../utils/animations";

interface ClashInvitationModalProps {
  visible: boolean;
  inviteId: string;
  onClose: () => void;
}

function formatTimeLeft(endTime: string): string {
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return "EXPIRED";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours} HOURS LEFT`;
  return `${minutes} MIN LEFT`;
}

function AvatarCircle({
  initials,
  color,
  borderColor,
}: {
  initials: string;
  color: string;
  borderColor: string;
}) {
  return (
    <View style={[styles.avatarOuter, { borderColor, shadowColor: borderColor }]}>
      <View style={[styles.avatarInner, { backgroundColor: color }]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
    </View>
  );
}

export function ClashInvitationModal({
  visible,
  inviteId,
  onClose,
}: ClashInvitationModalProps) {
  const invite = useClashStore((s) =>
    s.invites.find((i) => i.id === inviteId)
  );
  const startClash = useClashStore((s) => s.startClash);
  const displayName = useAuthStore((s) => s.displayName);
  const router = useRouter();

  const userInitials = useMemo(() => {
    return (displayName ?? "?")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [displayName]);

  const opponentInitials = useMemo(() => {
    if (!invite) return "?";
    return invite.opponentName
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [invite]);

  const timeLeft = invite ? formatTimeLeft(invite.endTime) : "";

  // Entrance animations
  const titleStyle = useEntranceAnimation(fadeInUp, { delay: 0 });
  const timerStyle = useEntranceAnimation(fadeInUp, { delay: 80 });
  const leftAvatarStyle = useEntranceAnimation(slideInLeft, {
    delay: 200,
    spring: SPRING_BOUNCY,
  });
  const vsStyle = useEntranceAnimation(fadeInScale, {
    delay: 350,
    spring: SPRING_BOUNCY,
  });
  const rightAvatarStyle = useEntranceAnimation(slideInRight, {
    delay: 200,
    spring: SPRING_BOUNCY,
  });
  const buttonStyle = useEntranceAnimation(fadeInUp, { delay: 450 });

  const handleStartClash = () => {
    startClash(inviteId);
    onClose();
    // Navigate to the clash game screen
    router.push('/clash');
  };

  if (!invite) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 items-center justify-center bg-black/70 px-5"
        onPress={onClose}
      >
        <Pressable
          className="w-full rounded-3xl border border-zinc-800 bg-zinc-900"
          onPress={() => { }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-5">
            <View className="w-8" />
            <View className="flex-row items-center gap-2">
              <Swords size={18} color="#a78bfa" />
              <Text className="text-base font-bold uppercase tracking-widest text-violet-400">
                Friends Clash
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <X size={22} color="#a1a1aa" />
            </Pressable>
          </View>

          {/* Title */}
          <Animated.View style={titleStyle} className="mt-4 px-5">
            <Text className="text-center text-xl font-bold text-white" style={{ writingDirection: 'rtl' }}>
              אתגר חדש מול {invite.opponentName}! ⚔️
            </Text>
          </Animated.View>

          {/* Timer */}
          <Animated.View style={timerStyle} className="mt-3 items-center px-5">
            <View style={styles.timerPill}>
              <Clock size={14} color="#f97316" />
              <Text style={styles.timerText}>{timeLeft}</Text>
            </View>
          </Animated.View>

          {/* VS Layout */}
          <View className="my-8 flex-row items-center justify-center gap-4 px-5">
            {/* User avatar */}
            <Animated.View style={leftAvatarStyle} className="items-center">
              <AvatarCircle
                initials={userInitials}
                color="#3b0764"
                borderColor="#7c3aed"
              />
              <Text className="mt-2 text-sm font-semibold text-zinc-300">
                {displayName ?? "You"}
              </Text>
            </Animated.View>

            {/* VS badge */}
            <Animated.View style={vsStyle}>
              <View style={styles.vsBadge}>
                <Text style={styles.vsText}>VS</Text>
              </View>
            </Animated.View>

            {/* Opponent avatar */}
            <Animated.View style={rightAvatarStyle} className="items-center">
              <AvatarCircle
                initials={opponentInitials}
                color="#422006"
                borderColor="#f97316"
              />
              <Text className="mt-2 text-sm font-semibold text-zinc-300">
                {invite.opponentName}
              </Text>
            </Animated.View>
          </View>

          {/* Start button */}
          <Animated.View style={buttonStyle} className="px-5 pb-5">
            <Pressable
              onPress={handleStartClash}
              style={styles.startButton}
              className="items-center rounded-2xl py-4"
            >
              <Text style={styles.startButtonText}>התחל אתגר! ⚔️</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  avatarOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#18181b",
  },
  avatarInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#e9d5ff",
    fontSize: 26,
    fontWeight: "800",
  },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#431407",
    borderWidth: 1,
    borderColor: "#f97316",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    shadowColor: "#f97316",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  timerText: {
    color: "#f97316",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  vsBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#18181b",
    borderWidth: 2,
    borderColor: "#facc15",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#facc15",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  vsText: {
    color: "#facc15",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 2,
  },
  startButton: {
    backgroundColor: "#7c3aed",
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#a78bfa",
  },
  startButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 2,
  },
});
