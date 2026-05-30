import React from 'react';
import { View, Text } from 'react-native';

interface Props {
  text: string;
}

/** Yellow pill matching the mockup, used to render the user's query. */
export function UserQueryBubble({ text }: Props): React.ReactElement {
  return (
    <View style={{ flexDirection: 'row-reverse', justifyContent: 'flex-end' }}>
      <View
        style={{
          backgroundColor: '#fde68a',
          borderRadius: 999,
          paddingHorizontal: 18,
          paddingVertical: 10,
          alignSelf: 'flex-end',
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
          maxWidth: '85%',
        }}
      >
        <Text
          style={{
            color: '#78350f',
            fontWeight: '800',
            fontSize: 15,
            writingDirection: 'rtl',
            textAlign: 'right',
          }}
        >
          {text}
        </Text>
      </View>
    </View>
  );
}
