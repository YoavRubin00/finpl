import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../src/components/ui/ScreenHeader';
import { EmptyState } from '../src/components/ui/EmptyState';

/**
 * Generic placeholder. Used by toolsRegistry entries whose destination screen
 * isn't built yet (e.g. portfolio-analyzer, cashflow).
 *
 * Built from the shared ScreenHeader + EmptyState so it looks like the rest of
 * the app instead of a one-off screen. Copy follows docs/BRAND.md: no bare
 * "בקרוב" promise, state the fact and offer something to do right now.
 */
export default function ComingSoonRoute() {
  const router = useRouter();
  const goToTools = () => {
    router.replace('/(tabs)/tools' as never);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <ScreenHeader onLeadingPress={goToTools} leadingLabel="חזרה לכלים" />
      <View style={styles.body}>
        <EmptyState
          title="הכלי הזה עוד בבנייה"
          body="בינתיים שאר הכלים פתוחים ומחכים לכם."
          actionLabel="לכל הכלים"
          onAction={goToTools}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
