import React from 'react';
import { Modal, View, Text, Pressable, ScrollView } from 'react-native';
import { CLASH, STITCH } from '../../../constants/theme';
import { COMPETITION_RULES } from '../fantasyData';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function RulesModal({ visible, onClose }: Props): React.ReactElement {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable onPress={() => {}}>
          <View
            style={{
              backgroundColor: CLASH.bgSecondary,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingTop: 12,
              paddingBottom: 40,
            }}
          >
            {/* Handle */}
            <View
              style={{
                width: 48,
                height: 5,
                borderRadius: 3,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignSelf: 'center',
                marginBottom: 20,
              }}
            />

            {/* Title */}
            <View
              style={{
                flexDirection: 'row-reverse',
                alignItems: 'center',
                paddingHorizontal: 20,
                marginBottom: 20,
                gap: 10,
              }}
            >
              <Text style={{ fontSize: 22 }}>📋</Text>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: '900',
                  color: '#ffffff',
                  writingDirection: 'rtl',
                }}
              >
                חוקי התחרות
              </Text>
            </View>

            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
              showsVerticalScrollIndicator={false}
            >
              {COMPETITION_RULES.map((rule, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row-reverse',
                    alignItems: 'flex-start',
                    gap: 12,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderRadius: 12,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.08)',
                  }}
                >
                  <View
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      backgroundColor: CLASH.goldBorder,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '900', color: '#000' }}>
                      {i + 1}
                    </Text>
                  </View>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 14,
                      color: 'rgba(255,255,255,0.9)',
                      writingDirection: 'rtl',
                      textAlign: 'right',
                      lineHeight: 21,
                    }}
                  >
                    {rule}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                marginHorizontal: 20,
                marginTop: 24,
                backgroundColor: pressed ? CLASH.goldLight : CLASH.goldBorder,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: 'center',
              })}
              accessibilityRole="button"
              accessibilityLabel="סגור חוקי תחרות"
            >
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#000' }}>
                הבנתי! בואו נדרפט 🚀
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}