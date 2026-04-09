import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";

export function LessonPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View className="flex-1 items-center justify-center bg-zinc-950">
      <Text className="text-xl font-bold text-white">Lesson {id}</Text>
    </View>
  );
}
