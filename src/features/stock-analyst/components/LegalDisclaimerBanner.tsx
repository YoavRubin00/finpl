import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react-native';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

export function LegalDisclaimerBanner(): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  return (
    <Pressable
      onPress={() => setExpanded((v) => !v)}
      accessibilityRole="button"
      style={{
        backgroundColor: '#fef9c3',
        borderBottomWidth: 1,
        borderBottomColor: '#fde68a',
        paddingHorizontal: 14,
        paddingVertical: 8,
      }}
    >
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
        <AlertTriangle size={14} color="#92400e" />
        <Text style={[RTL, { color: '#78350f', fontSize: 12, fontWeight: '700', flex: 1 }]}>
          תוכן חינוכי בלבד · אינו ייעוץ השקעות
        </Text>
        {expanded ? <ChevronUp size={14} color="#92400e" /> : <ChevronDown size={14} color="#92400e" />}
      </View>
      {expanded ? (
        <Text style={[RTL, { color: '#78350f', fontSize: 11, lineHeight: 17, marginTop: 6 }]}>
          הניתוחים נכתבים על ידי AI על בסיס נתונים פומביים. אינם מהווים המלצה לרכישה/מכירה. כל החלטה היא באחריותך. ביצועי עבר אינם מנבאים את העתיד.
        </Text>
      ) : null}
    </Pressable>
  );
}
