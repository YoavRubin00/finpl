import { useState } from 'react';
import { Text } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import type { RealAsset } from './realAssetsTypes';

interface Props {
  asset: Pick<RealAsset, 'image' | 'emoji'>;
  size: number;
  radius: number;
  emojiSize: number;
}

/**
 * Renders the asset image when available, falls back to the emoji on missing/failed load.
 * Decorative — `accessible={false}` so VoiceOver reads the asset name from the surrounding label.
 */
export function AssetIcon({ asset, size, radius, emojiSize }: Props) {
  const [failed, setFailed] = useState(false);

  if (asset.image && !failed) {
    return (
      <ExpoImage
        source={asset.image}
        style={{ width: size, height: size, borderRadius: radius }}
        contentFit="cover"
        transition={200}
        accessible={false}
        onError={() => setFailed(true)}
      />
    );
  }

  return <Text style={{ fontSize: emojiSize }}>{asset.emoji}</Text>;
}