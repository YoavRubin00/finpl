import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Heart, MessageCircle, Share2 } from "lucide-react-native";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { THEME } from "../../constants/theme";
import Animated, { FadeInRight } from "react-native-reanimated";

interface FeedSidebarProps {
    likes: number;
    isLiked?: boolean;
    onLike: () => void;
    onComment?: () => void;
    onShare?: () => void;
}

export function FeedSidebar({
    likes,
    isLiked,
    onLike,
    onComment,
    onShare,
}: FeedSidebarProps) {
    return (
        <Animated.View
            entering={FadeInRight.duration(400).delay(300)}
            style={styles.sidebar}
        >
            <SidebarButton
                icon={<Heart size={28} color={isLiked ? THEME.gold : "#fff"} fill={isLiked ? THEME.gold : "transparent"} />}
                label={likes > 0 ? likes.toString() : ""}
                onPress={onLike}
            />

            <SidebarButton
                icon={<MessageCircle size={28} color="#fff" />}
                label="..."
                onPress={onComment || (() => { })}
            />

            <SidebarButton
                icon={<Share2 size={28} color="#fff" />}
                label=""
                onPress={onShare || (() => { })}
            />
        </Animated.View>
    );
}

function SidebarButton({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
    return (
        <AnimatedPressable onPress={onPress} style={styles.button}>
            <View style={styles.iconContainer}>
                {icon}
            </View>
            {!!label && <Text style={styles.label}>{label}</Text>}
        </AnimatedPressable>
    );
}

const styles = StyleSheet.create({
    sidebar: {
        position: "absolute",
        right: 12,
        bottom: 120, // Keep above the bottom tabs
        alignItems: "center",
        gap: 20,
    },
    button: {
        alignItems: "center",
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "rgba(0,0,0,0.3)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
    },
    label: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "700",
        textShadowColor: "rgba(0,0,0,0.8)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
});