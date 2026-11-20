import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

/** 'waiting' = still trying in the background; 'failed' = the last try failed. */
export type BootRetryState = "waiting" | "failed";

interface Props {
  state: BootRetryState;
  onRetry: () => void;
  onContinue: () => void;
}

/**
 * Shown instead of the endless loader when a cold start has a stored sign-in
 * token but no saved session on this device (e.g. an iOS reinstall, where the
 * keychain outlives the app) and the server did not answer within the boot
 * limit, or failed. The boot keeps trying in the background and the app moves
 * on by itself when the server answers. "Continue without signing in" is what
 * a failed boot always did: the app opens signed out.
 *
 * Same dark background as LoadingWisdom / AppIntroSplash so it reads as part
 * of the launch, not as an error page.
 */
export function BootRetryScreen({ state, onRetry, onContinue }: Props) {
  const failed = state === "failed";
  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.title} accessibilityRole="header">
          {failed ? "לא הצלחנו להתחבר" : "החיבור איטי כרגע"}
        </Text>
        <Text style={styles.body}>
          {failed ? "בדקו את החיבור לאינטרנט ונסו שוב." : "ממשיכים לנסות להתחבר לחשבון שלכם."}
        </Text>
        {failed ? null : (
          <ActivityIndicator color="#a78bfa" style={styles.spinner} accessibilityLabel="מתחברים" />
        )}
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="נסו שוב"
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>נסו שוב</Text>
        </Pressable>
        <Pressable
          onPress={onContinue}
          accessibilityRole="button"
          accessibilityLabel="המשיכו בלי להתחבר"
          hitSlop={8}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryText}>המשיכו בלי להתחבר</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0c1426",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    alignItems: "stretch",
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
    textAlign: "center",
    writingDirection: "rtl",
  },
  body: {
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 22,
    color: "#cbd5e1",
    textAlign: "center",
    writingDirection: "rtl",
  },
  spinner: {
    marginVertical: 4,
  },
  primary: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#7c3aed",
    borderBottomWidth: 4,
    borderBottomColor: "#5b21b6",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
    writingDirection: "rtl",
  },
  secondary: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94a3b8",
    textDecorationLine: "underline",
    writingDirection: "rtl",
  },
  pressed: {
    opacity: 0.75,
  },
});
