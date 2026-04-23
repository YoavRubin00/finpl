import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LottieIcon } from "../../components/ui/LottieIcon";
import { DecorationOverlay } from "../../components/ui/DecorationOverlay";
import { tapHaptic } from "../../utils/haptics";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function ForgotPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const isValid = isValidEmail(email);

  const handleSubmit = () => {
    if (isValid) {
      setSubmitted(true);
    }
  };

  return (
    <ImageBackground
      source={{ uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/images/CHAT%20BACK.jpg' }}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
    <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
      <DecorationOverlay screenName="ForgotPasswordScreen" count={3} opacity={0.12} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Lock animation */}
          <View className="items-center pt-6">
            <View accessible={false}>
              <LottieIcon
                source={require("../../../assets/lottie/wired-flat-94-lock-unlock-hover-locked.json") as number}
                size={140}
                autoPlay
                loop
              />
            </View>
          </View>

          {/* Title */}
          <Text
            className="mt-4 text-center text-4xl font-black text-white"
            style={{ writingDirection: "rtl", textShadowColor: "rgba(0,0,0,0.6)", textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 10 }}
          >
            FinPlay
          </Text>
          <Text
            className="mb-8 text-center text-base text-zinc-400"
            style={{ writingDirection: "rtl" }}
          >
            איפוס סיסמה
          </Text>

          {submitted ? (
            /* Success Message */
            <View className="items-center rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <Text
                className="text-center text-base text-green-400"
                style={{ writingDirection: "rtl" }}
              >
                קישור לאיפוס סיסמה נשלח למייל שלך
              </Text>
            </View>
          ) : (
            <>
              {/* Email */}
              <Text
                className="mb-1 text-sm text-zinc-400"
                style={{ writingDirection: "rtl" }}
              >
                אימייל
              </Text>
              <TextInput
                className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-base text-white"
                style={{ writingDirection: "rtl", textAlign: "right" }}
                placeholder="הזן את כתובת האימייל שלך"
                placeholderTextColor="#52525b"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              accessibilityLabel="הזן את כתובת האימייל שלך" />

              {/* Submit Button */}
              <Pressable
                disabled={!isValid}
                onPress={handleSubmit}
                accessibilityRole="button"
                accessibilityLabel="שלח קישור לאיפוס"
                accessibilityState={{ disabled: !isValid }}
                className={`w-full rounded-2xl py-4 ${isValid ? "bg-[#0891b2]" : "bg-zinc-800"
                  }`}
                style={({ pressed }) => ({
                  opacity: pressed && isValid ? 0.85 : 1,
                })}
              >
                <Text
                  className={`text-center text-base font-bold ${isValid ? "text-white" : "text-zinc-600"
                    }`}
                >
                  שלח קישור לאיפוס
                </Text>
              </Pressable>
            </>
          )}

          {/* Back to Login */}
          <Pressable
            onPress={() => {
              tapHaptic();
              if (router.canGoBack()) router.back();
              else router.replace('/(auth)/sign-in' as never);
            }}
            accessibilityRole="button"
            accessibilityLabel="חזרה להתחברות"
            hitSlop={12}
            className="mt-6 py-2"
          >
            <Text
              className="text-center text-sm text-[#22d3ee]"
              style={{ writingDirection: "rtl" }}
            >
              ← חזרה להתחברות
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </ImageBackground>
  );
}
