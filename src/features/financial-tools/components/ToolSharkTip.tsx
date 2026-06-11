import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import type { ImageSource } from 'expo-image';

import {
  FINN_HAPPY,
  FINN_EMPATHIC,
  FINN_TALKING,
  FINN_HELLO,
  FINN_FIRE,
  FINN_STANDARD,
} from '../../retention-loops/finnMascotConfig';
import { STITCH } from '../../../constants/theme';

export type ToolSharkMood = 'happy' | 'empathic' | 'talking' | 'hello' | 'fire' | 'standard';

interface ToolSharkTipProps {
  /** The line שארק says — appears in the speech bubble next to him. */
  text: string;
  /** Optional second line (smaller, dimmer). */
  subtext?: string;
  /** Which Fin webp to render. Defaults to 'talking'. */
  mood?: ToolSharkMood;
  /** Accent color used for the bubble border + text. Defaults to STITCH primary. */
  accentColor?: string;
  /** Background tint behind the bubble. Defaults to a soft surface. */
  accentSurface?: string;
}

const MOOD_TO_SOURCE: Record<ToolSharkMood, ImageSource> = {
  happy: FINN_HAPPY,
  empathic: FINN_EMPATHIC,
  talking: FINN_TALKING,
  hello: FINN_HELLO,
  fire: FINN_FIRE,
  standard: FINN_STANDARD,
};

/**
 * שארק tip card — RTL, replaces the old shark-emoji + italic-text pattern with
 * the actual Fin mascot webp + speech bubble. Used inside tool screens to
 * deliver one short personality line without breaking the form/result rhythm.
 */
export function ToolSharkTip({
  text,
  subtext,
  mood = 'talking',
  accentColor = STITCH.primary,
  accentSurface,
}: ToolSharkTipProps) {
  const surface = accentSurface ?? accentColor + '14';

  return (
    <View style={[styles.wrap, { backgroundColor: surface, borderColor: accentColor + '40' }]}>
      <ExpoImage
        source={MOOD_TO_SOURCE[mood]}
        accessible={false}
        style={styles.finn}
        contentFit="contain"
      />
      <View style={styles.bubble}>
        <Text style={[styles.text, { color: accentColor }]} allowFontScaling={false}>
          {text}
        </Text>
        {subtext ? (
          <Text style={styles.subtext} allowFontScaling={false}>
            {subtext}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  finn: {
    width: 64,
    height: 64,
  },
  bubble: {
    flex: 1,
  },
  text: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 20,
  },
  subtext: {
    fontSize: 12,
    fontWeight: '600',
    color: STITCH.onSurfaceVariant,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 4,
    lineHeight: 17,
  },
});
