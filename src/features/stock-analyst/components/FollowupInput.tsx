import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { Send } from 'lucide-react-native';
import { tapHaptic } from '../../../utils/haptics';

interface Props {
  loading: boolean;
  onSubmit: (question: string) => void;
  /** Tap-to-fill canned questions shown when the field is empty. */
  suggestions?: string[];
}

/**
 * Free-text follow-up input shown beneath an analysis card. Lets the user
 * ask "why is the conviction only 7?", "explain the PEG ratio", etc.
 *
 * Pre-populated suggestions disappear once the user starts typing.
 */
export function FollowupInput({
  loading,
  onSubmit,
  suggestions = [
    'הסבר לי את הקונבישן',
    'מה הסיכון הכי גדול כאן?',
    'מה אומר PEG?',
  ],
}: Props): React.ReactElement {
  const [value, setValue] = useState('');
  const canSubmit = !loading && value.trim().length > 0;

  const submit = (text: string) => {
    const q = text.trim();
    if (!q) return;
    tapHaptic();
    onSubmit(q);
    setValue('');
  };

  return (
    <View style={{ gap: 8 }}>
      {/* Sample-question chips — only when input is empty */}
      {value.length === 0 && suggestions.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            flexDirection: 'row-reverse',
            gap: 6,
            paddingHorizontal: 2,
          }}
        >
          {suggestions.map((s) => (
            <Pressable
              key={s}
              onPress={() => submit(s)}
              accessibilityRole="button"
              style={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderColor: 'rgba(255,255,255,0.16)',
                borderWidth: 1,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
              }}
            >
              <Text
                style={{
                  color: '#cbd5e1',
                  fontSize: 11,
                  fontWeight: '700',
                  writingDirection: 'rtl',
                }}
              >
                {s}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {/* Input pill */}
      <View
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          gap: 6,
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderRadius: 999,
          paddingVertical: 5,
          paddingHorizontal: 6,
        }}
      >
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder="שאל שאלה על הניתוח…"
          placeholderTextColor="#64748b"
          editable={!loading}
          maxLength={500}
          style={{
            flex: 1,
            fontSize: 14,
            color: '#0f172a',
            paddingHorizontal: 10,
            paddingVertical: 8,
            writingDirection: 'rtl',
            textAlign: 'right',
            fontWeight: '600',
          }}
          onSubmitEditing={() => submit(value)}
        />
        <Pressable
          onPress={() => submit(value)}
          accessibilityRole="button"
          accessibilityLabel="שלח שאלה"
          disabled={!canSubmit}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: canSubmit ? '#0369a1' : '#cbd5e1',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Send size={16} color="#fff" />
          )}
        </Pressable>
      </View>
    </View>
  );
}
