import { Image as ExpoImage } from "expo-image";
import { useState } from "react";
import { Text, type StyleProp, type TextStyle, type ViewStyle, View } from "react-native";

import { DEFAULT_AVATAR_EMOJI, getAvatarById, type AvatarDefinition } from "./avatarData";

interface AvatarImageProps {
  avatarId: string | null | undefined;
  size: number;
  avatarDef?: AvatarDefinition;
  fallbackEmoji?: string;
  containerStyle?: StyleProp<ViewStyle>;
  emojiStyle?: StyleProp<TextStyle>;
}

export function AvatarImage({
  avatarId,
  avatarDef: providedDef,
  size,
  fallbackEmoji = DEFAULT_AVATAR_EMOJI,
  containerStyle,
  emojiStyle,
}: AvatarImageProps) {
  const def = providedDef ?? getAvatarById(avatarId ?? null);
  const [loadFailed, setLoadFailed] = useState(false);

  if (def?.imageUrl && !loadFailed) {
    return (
      <ExpoImage
        source={{ uri: def.imageUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        accessible
        accessibilityRole="image"
        accessibilityLabel={def.name}
        onError={() => setLoadFailed(true)}
        cachePolicy="memory-disk"
      />
    );
  }

  const fontSize = Math.round(size * 0.7);
  return (
    <View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, containerStyle]}>
      <Text style={[{ fontSize, lineHeight: fontSize * 1.05 }, emojiStyle]}>
        {def?.emoji ?? fallbackEmoji}
      </Text>
    </View>
  );
}