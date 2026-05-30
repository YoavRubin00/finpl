import React from 'react';
import { View, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { Send } from 'lucide-react-native';
import { tapHaptic } from '../../../utils/haptics';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Bottom input pill, matching the mockup: send icon on RTL-left, mic
 * placeholder icon on RTL-right of the text field. Sleek dark glass look.
 */
export function AnalystInput({
  value,
  onChange,
  onSubmit,
  loading,
  disabled,
  placeholder = 'שאל את הקפטן…',
}: Props): React.ReactElement {
  const canSubmit = !loading && !disabled && value.trim().length > 0;

  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 999,
        paddingVertical: 5,
        paddingHorizontal: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      }}
    >
      {/* Text field */}
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#64748b"
        autoCapitalize="characters"
        autoCorrect={false}
        editable={!loading}
        maxLength={10}
        style={{
          flex: 1,
          fontSize: 14,
          color: '#0f172a',
          paddingHorizontal: 8,
          paddingVertical: 8,
          writingDirection: 'rtl',
          textAlign: 'right',
          fontWeight: '600',
          letterSpacing: 0.5,
        }}
        onSubmitEditing={() => {
          if (canSubmit) onSubmit();
        }}
      />

      {/* Send button */}
      <Pressable
        onPress={() => {
          if (!canSubmit) return;
          tapHaptic();
          onSubmit();
        }}
        accessibilityRole="button"
        accessibilityLabel="נתח מניה"
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: canSubmit ? '#0369a1' : '#cbd5e1',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Send size={18} color="#fff" />
        )}
      </Pressable>
    </View>
  );
}
