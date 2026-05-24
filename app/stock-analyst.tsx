import { View } from 'react-native';
import { StockAnalystScreen } from '../src/features/stock-analyst/StockAnalystScreen';
import { ToolTutorialMount } from '../src/features/financial-tools/components/ToolTutorialMount';

export default function StockAnalystRoute() {
  return (
    <View style={{ flex: 1 }}>
      <StockAnalystScreen />
      <ToolTutorialMount toolKey="analyst" />
    </View>
  );
}
