import React from 'react';
import { View, Text } from 'react-native';
import { DUO } from '../../../constants/theme';

interface OptionPollProps {
  options: string[];
  votes: number[];
}

export function OptionPoll({ options, votes }: OptionPollProps): React.ReactElement {
  const total = votes.reduce((s, v) => s + v, 0);

  return (
    <View style={{ gap: 8 }}>
      {options.map((opt, i) => {
        const count = votes[i] ?? 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const letter = i === 0 ? 'א׳' : 'ב׳';
        return (
          <View
            key={i}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: DUO.border,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <View
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: `${pct}%`,
                backgroundColor: i === 0 ? DUO.blueSurface : DUO.greenSurface,
              }}
            />
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                flexDirection: 'row-reverse',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: i === 0 ? DUO.blue : DUO.green,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '900' }}>{letter}</Text>
              </View>
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: '600',
                  color: DUO.text,
                  writingDirection: 'rtl',
                  textAlign: 'right',
                }}
              >
                {opt}
              </Text>
              {total > 0 && (
                <Text style={{ fontSize: 13, fontWeight: '900', color: i === 0 ? DUO.blue : DUO.green }}>
                  {pct}%
                </Text>
              )}
            </View>
          </View>
        );
      })}
      {total > 0 && (
        <Text style={{ fontSize: 11, color: DUO.textMuted, writingDirection: 'rtl', textAlign: 'right', marginTop: 2 }}>
          {total} הצביעו
        </Text>
      )}
    </View>
  );
}