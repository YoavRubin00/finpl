import React, { useState, useRef, useEffect } from 'react';
import { FlatList, View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useClanChatStore } from '../useClanChatStore';
import { useChatSimulator } from '../useChatSimulator';
import { SELF_ID } from '../clanData';
import type { ClanChatMessage } from '../clanTypes';
import { ChatBubble } from '../components/ChatBubble';
import { ChatSystemMessage } from '../components/ChatSystemMessage';
import { CLAN } from '../../../constants/theme';
import { S } from '../strings';

export function ClanChatTab(): React.ReactElement {
  const messages = useClanChatStore((s) => s.messages);
  const sendMessage = useClanChatStore((s) => s.sendMessage);
  const isTyping = useClanChatStore((s) => s.isTyping);

  const [text, setText] = useState('');
  const listRef = useRef<FlatList<ClanChatMessage>>(null);

  // Start auto-reply simulator while this tab is mounted
  useChatSimulator(true);

  function handleSend(): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage(SELF_ID, 'את/ה', '🦈', trimmed);
    setText('');
  }

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToEnd?.({ animated: true });
    }
  }, [messages.length]);

  function renderItem({ item }: { item: ClanChatMessage }): React.ReactElement {
    if (item.kind === 'system') {
      return <ChatSystemMessage message={item} />;
    }
    return <ChatBubble message={item} isSelf={item.authorId === SELF_ID} />;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={120}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        maxToRenderPerBatch={20}
        windowSize={10}
        onContentSizeChange={() => listRef.current?.scrollToEnd?.({ animated: false })}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>💬</Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, writingDirection: 'rtl' }}>
              {S.chatEmpty}
            </Text>
          </View>
        }
        ListFooterComponent={
          isTyping ? (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 6,
                alignItems: 'flex-start',
              }}
            >
              <View
                style={{
                  backgroundColor: CLAN.otherBubble,
                  borderRadius: 16,
                  borderBottomStartRadius: 4,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  flexDirection: 'row',
                  gap: 4,
                }}
              >
                {[0, 1, 2].map((i) => (
                  <View
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: 'rgba(255,255,255,0.5)',
                    }}
                  />
                ))}
              </View>
            </Animated.View>
          ) : null
        }
      />

      {/* Composer */}
      <View
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          padding: 12,
          gap: 10,
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.08)',
          backgroundColor: CLAN.bg,
        }}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={S.chatPlaceholder}
          placeholderTextColor="rgba(255,255,255,0.3)"
          multiline
          maxLength={280}
          onSubmitEditing={handleSend}
          style={{
            flex: 1,
            backgroundColor: 'rgba(255,255,255,0.08)',
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 10,
            color: '#ffffff',
            fontSize: 14,
            textAlign: 'right',
            writingDirection: 'rtl',
            maxHeight: 100,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.12)',
          }}
        />
        <Pressable
          onPress={handleSend}
          disabled={!text.trim()}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: text.trim() ? (pressed ? CLAN.tierGold : CLAN.tierGoldLight) : 'rgba(255,255,255,0.1)',
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <Text style={{ fontSize: 18 }}>↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}