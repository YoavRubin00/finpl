import React, { useEffect } from 'react';
import { View, Text, Pressable, Linking, Alert } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { track } from '../../../lib/analytics/events';
import { tapHaptic } from '../../../utils/haptics';
import {
  WHATSAPP_COMMUNITY_URL,
  WHATSAPP_SVG,
  WHATSAPP_GREEN,
} from '../../social/whatsappCommunity';

/**
 * "Join the WhatsApp community" button at the bottom of the friends hub — the
 * same destination + brand glyph as the More-screen row (Yoav 2026-07-03),
 * placed where the social intent is highest. `source: 'friends_hub'` splits its
 * attribution from the More-screen and pearl-feed CTAs.
 */
export function WhatsAppCommunityCard(): React.ReactElement {
  useEffect(() => {
    try {
      track({ name: 'whatsapp_cta_shown', props: { source: 'friends_hub' } });
    } catch {
      /* non-fatal */
    }
  }, []);

  const open = (): void => {
    tapHaptic();
    try {
      track({ name: 'whatsapp_cta_tapped', props: { source: 'friends_hub' } });
    } catch {
      /* non-fatal */
    }
    Linking.openURL(WHATSAPP_COMMUNITY_URL).catch(() =>
      Alert.alert('שגיאה', 'לא הצלחנו לפתוח את הווצאפ'),
    );
  };

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel="הצטרפו לקהילת הווצאפ של פינפליי"
      style={({ pressed }) => ({
        marginHorizontal: 16,
        marginVertical: 12,
        borderRadius: 16,
        backgroundColor: '#ffffff',
        borderWidth: 1.5,
        borderColor: WHATSAPP_GREEN + '55',
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 14,
        opacity: pressed ? 0.92 : 1,
        shadowColor: WHATSAPP_GREEN,
        shadowOpacity: 0.18,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: WHATSAPP_GREEN + '1A',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SvgXml xml={WHATSAPP_SVG} width={28} height={28} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.15}
          style={{
            fontSize: 15,
            fontWeight: '900',
            color: '#1f2937',
            writingDirection: 'rtl',
            textAlign: 'right',
          }}
        >
          קהילת הווצאפ של פינפליי
        </Text>
        <Text
          numberOfLines={2}
          maxFontSizeMultiplier={1.2}
          style={{
            fontSize: 12,
            color: '#6b7280',
            writingDirection: 'rtl',
            textAlign: 'right',
            marginTop: 1,
          }}
        >
          טיפים, אתגרים ושאלות יומיות — הצטרפו לחבר׳ה
        </Text>
      </View>
      <View
        style={{
          backgroundColor: WHATSAPP_GREEN,
          borderRadius: 999,
          paddingHorizontal: 14,
          paddingVertical: 8,
        }}
      >
        <Text
          maxFontSizeMultiplier={1.15}
          style={{ fontSize: 13, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl' }}
        >
          הצטרפו
        </Text>
      </View>
    </Pressable>
  );
}
