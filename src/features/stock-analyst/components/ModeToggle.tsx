import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Zap, Brain, Clock } from 'lucide-react-native';
import type { AnalystMode } from '../types';
import { tapHaptic } from '../../../utils/haptics';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface Props {
  mode: AnalystMode;
  onChange: (mode: AnalystMode) => void;
  quickRemaining: number | null; // null = unlimited (pro)
  deepRemaining: number | null;
}

export function ModeToggle({ mode, onChange, quickRemaining, deepRemaining }: Props): React.ReactElement {
  return (
    <View style={{ gap: 6 }}>
      <View
        style={{
          flexDirection: 'row-reverse',
          backgroundColor: '#f1f5f9',
          borderRadius: 14,
          padding: 4,
          gap: 4,
        }}
      >
        <Segment
          active={mode === 'quick'}
          onPress={() => {
            if (mode !== 'quick') {
              tapHaptic();
              onChange('quick');
            }
          }}
          label="קצרה"
          Icon={Zap}
          accent="#0ea5e9"
          remaining={quickRemaining}
        />
        <Segment
          active={mode === 'deep'}
          onPress={() => {
            if (mode !== 'deep') {
              tapHaptic();
              onChange('deep');
            }
          }}
          label="מעמיקה"
          Icon={Brain}
          accent="#7c3aed"
          remaining={deepRemaining}
        />
      </View>

      {/* When 'deep' is selected, surface the expected duration up front so
          users don't think the request died after 30s. */}
      {mode === 'deep' ? (
        <View
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'rgba(124,58,237,0.18)',
            borderColor: 'rgba(167,139,250,0.4)',
            borderWidth: 1,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 10,
          }}
        >
          <Clock size={12} color="#c4b5fd" />
          <Text
            style={[
              RTL,
              { color: '#ddd6fe', fontSize: 11, fontWeight: '700', flex: 1 },
            ]}
          >
            ניתוח מעמיק לוקח 1–2 דקות. השארק חושב בעמקים.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

interface SegmentProps {
  active: boolean;
  onPress: () => void;
  label: string;
  Icon: typeof Zap;
  accent: string;
  remaining: number | null;
}

function Segment({ active, onPress, label, Icon, accent, remaining }: SegmentProps): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        flex: 1,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: active ? '#ffffff' : 'transparent',
        paddingVertical: 10,
        borderRadius: 10,
        shadowColor: active ? accent : 'transparent',
        shadowOpacity: active ? 0.18 : 0,
        shadowRadius: active ? 6 : 0,
        shadowOffset: { width: 0, height: 2 },
        elevation: active ? 2 : 0,
      }}
    >
      <Icon size={14} color={active ? accent : '#64748b'} />
      <Text
        style={[
          RTL,
          { fontSize: 13, fontWeight: active ? '800' : '700', color: active ? accent : '#64748b' },
        ]}
      >
        {label}
      </Text>
      {remaining !== null && remaining < 999 ? (
        <View
          style={{
            backgroundColor: remaining > 0 ? '#fde68a' : '#fecaca',
            paddingHorizontal: 6,
            paddingVertical: 1,
            borderRadius: 999,
            minWidth: 18,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 10, color: remaining > 0 ? '#78350f' : '#7f1d1d', fontWeight: '800' }}>
            {remaining}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
