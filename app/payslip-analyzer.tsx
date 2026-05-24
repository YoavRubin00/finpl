import { View } from 'react-native';
import { PayslipAnalyzerScreen } from '../src/features/payslip-analyzer/PayslipAnalyzerScreen';
import { ToolTutorialMount } from '../src/features/financial-tools/components/ToolTutorialMount';

export default function PayslipAnalyzerRoute() {
  return (
    <View style={{ flex: 1 }}>
      <PayslipAnalyzerScreen />
      <ToolTutorialMount toolKey="payslip" />
    </View>
  );
}
