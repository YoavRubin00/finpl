import { useState } from "react";
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuthStore } from "../auth/useAuthStore";

export function SignInScreen() {
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const [name, setName] = useState("");

  const isValid = name.trim().length >= 2;

  function handleContinue() {
    if (!isValid) return;
    signIn(name.trim(), "");
    router.replace("/(auth)/onboarding");
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-1 justify-between px-6 pb-4 pt-12">
          {/* Top section */}
          <View>
            <View className="mb-8 self-start rounded-2xl border border-violet-500/30 bg-violet-950/40 px-4 py-2">
              <Text className="text-2xl font-bold tracking-tight text-violet-400">
                FinPlay
              </Text>
            </View>

            <Text className="mb-2 text-3xl font-bold text-white">
              What should we{"\n"}call you?
            </Text>
            <Text className="mb-8 text-sm leading-relaxed text-zinc-400">
              No email, no password — just your name to get started.
              You can set up an account later.
            </Text>

            {/* Name input */}
            <TextInput
              className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-base text-white"
              placeholder="Your first name"
              placeholderTextColor="#52525b"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            accessibilityLabel="שמך הפרטי" />
          </View>

          {/* CTA */}
          <Pressable
            onPress={handleContinue}
            disabled={!isValid}
            className={`w-full rounded-2xl py-4 ${
              isValid ? "bg-violet-600" : "bg-zinc-800"
            }`}
            style={({ pressed }) => ({
              opacity: pressed && isValid ? 0.85 : 1,
            })}
          >
            <Text
              className={`text-center text-base font-bold ${
                isValid ? "text-white" : "text-zinc-600"
              }`}
            >
              {isValid ? `Let's go, ${name.trim()}` : "Enter your name"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
