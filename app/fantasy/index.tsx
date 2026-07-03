import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlobalWealthHeader } from '../../src/components/ui/GlobalWealthHeader';
import { FantasyLobbyScreen } from '../../src/features/fantasy-league/screens/FantasyLobbyScreen';

export default function FantasyIndex() {
  const insets = useSafeAreaInsets();
  // The /fantasy route lives OUTSIDE the (tabs) group — the only place that
  // renders GlobalWealthHeader — so entering here used to hide the wallet.
  // Re-mount the standard wealth header on top and let the lobby sit below it.
  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <View style={{ backgroundColor: '#ffffff' }}>
        <View style={{ paddingTop: insets.top }} />
        <GlobalWealthHeader />
      </View>
      <View style={{ flex: 1 }}>
        <FantasyLobbyScreen />
      </View>
    </View>
  );
}
