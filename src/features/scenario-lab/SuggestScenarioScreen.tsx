import { useState } from 'react';
import { Image as ExpoImage } from "expo-image";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronRight, Send } from 'lucide-react-native';
import LottieView from '../../components/ui/SafeLottieView';
import { FINN_STANDARD } from '../retention-loops/finnMascotConfig';
import { tapHaptic, successHaptic } from '../../utils/haptics';
import { useScenarioLabStore } from './useScenarioLabStore';

export function SuggestScenarioScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = title.trim().length >= 3 && description.trim().length >= 10;

  const submitSuggestion = useScenarioLabStore((s) => s.submitSuggestion);

  const handleSubmit = () => {
    if (!canSubmit) return;
    tapHaptic();
    submitSuggestion(title, description);
    successHaptic();
    setSubmitted(true);

    setTimeout(() => {
      router.back();
    }, 2500);
  };

  if (submitted) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <Animated.View entering={FadeInDown.duration(400)} style={{ alignSelf: 'center' }}>
            <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 240, height: 240 }} contentFit="contain" />
          </Animated.View>
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <Text style={styles.successTitle}>תודה רבה! 🎉</Text>
            <Text style={styles.successSub}>ההצעה שלך נשלחה לצוות המומחים שלנו</Text>
            <Text style={styles.successNote}>אם התרחיש ייבחר, תקבל/י עדכון באפליקציה</Text>
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>הצע תרחיש חדש</Text>
        <Pressable
          onPress={() => { tapHaptic(); router.back(); }}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="חזור"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronRight size={24} color="#0369a1" />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Intro */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.introRow}>
            <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 128, height: 128 }} contentFit="contain" />
            <View style={styles.introBubble}>
              <Text style={styles.introText}>
                יש לך רעיון לתרחיש כלכלי מעניין? ספר/י לנו ואולי הוא יהפוך למשחק באפליקציה! 💡
              </Text>
            </View>
          </Animated.View>

          {/* Title input */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <Text style={styles.label}>שם התרחיש</Text>
            <TextInput
              style={styles.input}
              placeholder='לדוגמה: "קריסת מטבע דיגיטלי"'
              placeholderTextColor="#94a3b8"
              value={title}
              onChangeText={setTitle}
              maxLength={60}
              textAlign="right"
              accessibilityLabel="שם התרחיש"
            />
            <Text style={styles.charCount}>{title.length}/60</Text>
          </Animated.View>

          {/* Description input */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <Text style={styles.label}>תאר/י את התרחיש</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="מה קורה בתרחיש? אילו החלטות המשתמש צריך לקבל? למה זה מעניין?"
              placeholderTextColor="#94a3b8"
              value={description}
              onChangeText={setDescription}
              maxLength={500}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              textAlign="right"
              accessibilityLabel="תאר את התרחיש"
            />
            <Text style={styles.charCount}>{description.length}/500</Text>
          </Animated.View>

          {/* Submit button */}
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.submitBtn,
                !canSubmit && styles.submitBtnDisabled,
                pressed && canSubmit && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="שלח לצוות המומחים"
            >
              <Send size={18} color={canSubmit ? '#fff' : '#94a3b8'} style={{ transform: [{ scaleX: -1 }] }} />
              <Text style={[styles.submitText, !canSubmit && styles.submitTextDisabled]}>
                שלח לצוות המומחים
              </Text>
            </Pressable>
          </Animated.View>

          {/* Tips card */}
          <Animated.View entering={FadeInDown.duration(400).delay(400)} style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>💡 טיפים לתרחיש מנצח</Text>
            <Text style={styles.tipItem}>• תרחיש מבוסס על אירוע כלכלי אמיתי או אפשרי</Text>
            <Text style={styles.tipItem}>• דילמה ברורה — המשתמש צריך לבחור כיוון</Text>
            <Text style={styles.tipItem}>• לקח פיננסי שאפשר ללמוד ממנו</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f9ff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 16 : 56,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    writingDirection: 'rtl',
  },
  headerSpacer: { width: 40 },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 48,
    gap: 20,
  },

  introRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  introBubble: {
    flex: 1,
    backgroundColor: '#e0f2fe',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
    padding: 14,
  },
  introText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#0369a1',
    writingDirection: 'rtl',
    textAlign: 'right',
    fontWeight: '600',
  },

  label: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0369a1',
    writingDirection: 'rtl',
    textAlign: 'right',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#bae6fd',
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1e293b',
    writingDirection: 'rtl',
  },
  textArea: {
    minHeight: 140,
    paddingTop: 14,
    lineHeight: 24,
  },
  charCount: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'left',
    marginTop: 4,
  },

  submitBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#0369a1',
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#0369a1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnDisabled: {
    backgroundColor: '#e2e8f0',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#fff',
    writingDirection: 'rtl',
  },
  submitTextDisabled: {
    color: '#94a3b8',
  },

  tipsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0369a1',
    writingDirection: 'rtl',
    textAlign: 'right',
    marginBottom: 4,
  },
  tipItem: {
    fontSize: 13,
    lineHeight: 20,
    color: '#475569',
    writingDirection: 'rtl',
    textAlign: 'right',
  },

  // Success state
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1e293b',
    textAlign: 'center',
    marginTop: 12,
  },
  successSub: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0369a1',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 8,
  },
  successNote: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 4,
  },
});
