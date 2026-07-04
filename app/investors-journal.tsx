import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { InvestorsJournalSheet } from '../src/features/investors-journal/InvestorsJournalSheet';

/**
 * /investors-journal — route wrapper for the Investors Journal sheet, used by
 * the Financial Tools hub (the learn-screen chip opens the sheet in place).
 * The sheet is a bottom-sheet Modal; closing it pops back to the hub.
 */
export default function InvestorsJournalPage(): React.ReactElement {
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <InvestorsJournalSheet visible onClose={() => router.back()} />
    </View>
  );
}
