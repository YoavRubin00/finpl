import React, { useEffect } from 'react';
import { View, Text, Pressable, Linking, Alert } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { ChevronLeft } from 'lucide-react-native';

import { track } from '../../../lib/analytics/events';
import { tapHaptic } from '../../../utils/haptics';
import {
  WHATSAPP_COMMUNITY_URL,
  WHATSAPP_SVG,
  WHATSAPP_GREEN,
} from '../../social/whatsappCommunity';

const WHATSAPP_GREEN_DARK = '#1EBE5B';

/**
 * "Join the WhatsApp community" button at the bottom of the friends hub — the
 * same destination + brand glyph as the More-screen row (Yoav 2026-07-03),
 * placed where the social intent is highest. `source: 'friends_hub'` splits its
 * attribution from the More-screen and pearl-feed CTAs.
 *
 * Rendered as a solid WhatsApp-green primary button (Yoav 2026-07-04) so it
 * reads unmistakably as a tappable CTA, not a passive card. All the coloured
 * surface lives on the inner <View>; the <Pressable>'s function-style `style`
 * carries ONLY opacity + margins, because a function-style Pressable drops its
 * own `backgroundColor` on Android (the washed-out button Yoav saw).
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
        opacity: pressed ? 0.94 : 1,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      <View
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 14,
          paddingVertical: 14,
          borderRadius: 18,
          backgroundColor: WHATSAPP_GREEN,
          borderWidth: 1,
          borderColor: WHATSAPP_GREEN_DARK,
          shadowColor: WHATSAPP_GREEN,
          shadowOpacity: 0.35,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 5,
        }}
      >
        {/* White disc + brand glyph — pops on the green ground */}
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: '#ffffff',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SvgXml xml={WHATSAPP_SVG} width={30} height={30} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.15}
            style={{
              fontSize: 15.5,
              fontWeight: '900',
              color: '#ffffff',
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
              color: 'rgba(255,255,255,0.92)',
              writingDirection: 'rtl',
              textAlign: 'right',
              marginTop: 2,
            }}
          >
            טיפים, אתגרים ושאלות יומיות — הצטרפו לחבר׳ה
          </Text>
        </View>

        {/* Explicit "join" pill so the action is named, not just implied */}
        <View
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 2,
            backgroundColor: 'rgba(255,255,255,0.18)',
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          <Text
            maxFontSizeMultiplier={1.15}
            style={{
              fontSize: 13,
              fontWeight: '900',
              color: '#ffffff',
              writingDirection: 'rtl',
            }}
          >
            הצטרפו
          </Text>
          <ChevronLeft size={16} color="#ffffff" strokeWidth={3} />
        </View>
      </View>
    </Pressable>
  );
}
