import { Image as ExpoImage } from "expo-image";
import { useState } from "react";
import { Text, type StyleProp, type TextStyle, type ViewStyle, View } from "react-native";

import { DEFAULT_AVATAR_EMOJI, getAvatarById, type AvatarDefinition } from "./avatarData";
import { getAvatarSvgIcon } from "../../components/svg/avatars/AvatarMascots";

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

  // Render priority:
  //   1. Inline SVG (Pip mascot — current premium avatar set, matched by id)
  //   2. Remote PNG via imageUrl (legacy/future remote avatars)
  //   3. Emoji fallback
  const SvgIcon = def ? getAvatarSvgIcon(def.id) : null;
  if (SvgIcon) {
    return (
      <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, containerStyle]}>
        <SvgIcon size={size} />
      </View>
    );
  }

  if (def?.imageUrl && !loadFailed) {
    const overflow = size * 0.05;
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
        <ExpoImage
          source={{ uri: def.imageUrl }}
          style={{
            width: size * 1.1,
            height: size * 1.1,
            marginLeft: -overflow,
            marginTop: -overflow,
          }}
          contentFit="cover"
          accessible
          accessibilityRole="image"
          accessibilityLabel={def.name}
          onError={() => setLoadFailed(true)}
          cachePolicy="memory-disk"
        />
      </View>
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