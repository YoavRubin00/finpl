import React from 'react';
import { View, Text, Pressable, Modal, ScrollView, Alert } from 'react-native';
import { ChevronRight, Trash2, Share2, Zap, Brain } from 'lucide-react-native';
import { useAnalystHistoryStore, type HistoryEntry } from '../useAnalystHistoryStore';
import { shareQuickAnalysis, shareDeepAnalysis } from '../services/shareAnalysis';
import { RecommendationChip } from './RecommendationChip';
import { tapHaptic } from '../../../utils/haptics';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface Props {
  visible: boolean;
  onClose: () => void;
}

function formatRelativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'עכשיו';
  if (minutes < 60) return `לפני ${minutes} דק׳`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `לפני ${hours} שע׳`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `לפני ${days} י׳`;
  const date = new Date(ts);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

export function HistoryModal({ visible, onClose }: Props): React.ReactElement {
  const entries = useAnalystHistoryStore((s) => s.entries);
  const removeEntry = useAnalystHistoryStore((s) => s.removeEntry);
  const clearAll = useAnalystHistoryStore((s) => s.clearAll);

  const handleShare = async (entry: HistoryEntry) => {
    tapHaptic();
    if (entry.mode === 'quick') await shareQuickAnalysis(entry.data);
    else await shareDeepAnalysis(entry.data);
  };

  const handleDelete = (id: string) => {
    tapHaptic();
    removeEntry(id);
  };

  const handleClearAll = () => {
    if (entries.length === 0) return;
    Alert.alert(
      'מחיקת היסטוריה',
      'למחוק את כל הניתוחים השמורים? לא ניתן לבטל.',
      [
        { text: 'ביטול', style: 'cancel' },
        { text: 'מחק', style: 'destructive', onPress: () => { tapHaptic(); clearAll(); } },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#0b1735' }}>
        {/* Header — centered title, RTL back chevron on the right (natural
            "back" direction), optional clear-all in the visual-left corner. */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 50,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255,255,255,0.1)',
            position: 'relative',
            alignItems: 'center',
          }}
        >
          <Text
            style={[
              RTL,
              { color: '#fff', fontSize: 18, fontWeight: '900', textAlign: 'center' },
            ]}
          >
            היסטוריית ניתוחים
          </Text>
          <Pressable
            onPress={() => { tapHaptic(); onClose(); }}
            accessibilityRole="button"
            accessibilityLabel="חזרה"
            style={{
              position: 'absolute',
              right: 16,
              top: 50,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.1)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronRight size={20} color="#cbd5e1" />
          </Pressable>
          {entries.length > 0 ? (
            <Pressable
              onPress={handleClearAll}
              accessibilityRole="button"
              accessibilityLabel="מחק הכל"
              style={{
                position: 'absolute',
                left: 16,
                top: 50,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(239,68,68,0.18)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trash2 size={16} color="#fca5a5" />
            </Pressable>
          ) : null}
        </View>

        {entries.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 }}>
            <Text style={{ fontSize: 56 }}>🌊</Text>
            <Text style={[RTL, { color: '#cbd5e1', fontSize: 16, fontWeight: '700', textAlign: 'center' }]}>
              עדיין לא ניתחת מניות
            </Text>
            <Text style={[RTL, { color: '#94a3b8', fontSize: 13, textAlign: 'center' }]}>
              הניתוחים שתבצע יישמרו כאן אוטומטית — כדי שתוכל לחזור אליהם בכל זמן.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }}>
            {entries.map((entry) => (
              <View
                key={entry.id}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.08)',
                  padding: 12,
                  gap: 10,
                }}
              >
                {/* Top row: ticker + mode chip + verdict + time */}
                <View
                  style={{
                    flexDirection: 'row-reverse',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, flex: 1 }}>
                    <View
                      style={{
                        backgroundColor: '#0f172a',
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 }}>
                        {entry.ticker}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: 'row-reverse',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor:
                          entry.mode === 'deep' ? 'rgba(124,58,237,0.2)' : 'rgba(14,165,233,0.2)',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 999,
                      }}
                    >
                      {entry.mode === 'deep' ? (
                        <Brain size={11} color="#a78bfa" />
                      ) : (
                        <Zap size={11} color="#7dd3fc" />
                      )}
                      <Text
                        style={{
                          color: entry.mode === 'deep' ? '#a78bfa' : '#7dd3fc',
                          fontSize: 10,
                          fontWeight: '800',
                        }}
                      >
                        {entry.mode === 'deep' ? 'מעמיקה' : 'קצרה'}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: '#94a3b8', fontSize: 11 }}>
                    {formatRelativeTime(entry.ts)}
                  </Text>
                </View>

                <Text style={[RTL, { color: '#e2e8f0', fontSize: 14, fontWeight: '700' }]}>
                  {entry.companyName}
                </Text>

                {/* Quick mode body */}
                {entry.mode === 'quick' ? (
                  <>
                    <Text
                      style={[RTL, { color: '#cbd5e1', fontSize: 13, lineHeight: 20 }]}
                      numberOfLines={3}
                    >
                      {entry.data.captainNote}
                    </Text>
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                      <RecommendationChip verdict={entry.verdict} size="sm" />
                      <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '700' }}>
                        ביטחון: {entry.data.confidence}%
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Text
                      style={[RTL, { color: '#cbd5e1', fontSize: 13, lineHeight: 20 }]}
                      numberOfLines={3}
                    >
                      {entry.data.summary.oneLiner}
                    </Text>
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                      <RecommendationChip verdict={entry.verdict} size="sm" />
                      <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '700' }}>
                        קונבישן: {entry.data.thesis.conviction}/10
                      </Text>
                    </View>
                  </>
                )}

                {/* Actions */}
                <View
                  style={{
                    flexDirection: 'row-reverse',
                    gap: 6,
                    borderTopWidth: 1,
                    borderTopColor: 'rgba(255,255,255,0.06)',
                    paddingTop: 8,
                  }}
                >
                  <Pressable
                    onPress={() => handleShare(entry)}
                    accessibilityRole="button"
                    accessibilityLabel="שתף ניתוח"
                    style={{
                      flex: 1,
                      flexDirection: 'row-reverse',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      backgroundColor: '#0369a1',
                      paddingVertical: 8,
                      borderRadius: 8,
                    }}
                  >
                    <Share2 size={14} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>שתף</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleDelete(entry.id)}
                    accessibilityRole="button"
                    accessibilityLabel="מחק ניתוח"
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      backgroundColor: 'rgba(239,68,68,0.15)',
                      borderRadius: 8,
                    }}
                  >
                    <Trash2 size={14} color="#fca5a5" />
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
