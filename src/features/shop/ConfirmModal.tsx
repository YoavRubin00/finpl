import { View, Text, Pressable, Modal } from 'react-native';
import { Diamond } from 'lucide-react-native';
import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { GoldCoinIcon } from '../../components/ui/GoldCoinIcon';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface ConfirmModalProps {
  visible: boolean;
  itemName: string;
  coinCost: number;
  gemCost?: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  visible,
  itemName,
  coinCost,
  gemCost,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const isGemPurchase = (gemCost ?? 0) > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 24 }}
        onPress={onCancel}
      >
        <Pressable
          style={{ width: '100%', borderRadius: 24, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#ffffff', padding: 24 }}
          onPress={() => { }}
        >
          <Text style={[RTL, { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 4 }]}>
            {itemName}
          </Text>
          <Text style={[RTL, { fontSize: 14, color: '#64748b', marginBottom: 20 }]}>
            אישור רכישה. לא ניתן לבטל לאחר מכן.
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, backgroundColor: '#f1f5f9', paddingVertical: 12, marginBottom: 24 }}>
            {isGemPurchase ? (
              <>
                <Diamond size={18} color="#0891b2" />
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#0891b2' }}>
                  {gemCost} ג׳מים
                </Text>
              </>
            ) : (
              <>
                <GoldCoinIcon size={20} />
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#92400e' }}>
                  {coinCost} זהב
                </Text>
              </>
            )}
          </View>

          <View style={{ flexDirection: 'row-reverse', gap: 12 }}>
            <AnimatedPressable
              onPress={onConfirm}
              style={{ flex: 1, borderRadius: 12, backgroundColor: '#0891b2', paddingVertical: 12 }}
            >
              <Text style={[RTL, { textAlign: 'center', fontSize: 14, fontWeight: '700', color: '#ffffff' }]}>
                קנה עכשיו
              </Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={onCancel}
              style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', paddingVertical: 12 }}
            >
              <Text style={[RTL, { textAlign: 'center', fontSize: 14, fontWeight: '600', color: '#6b7280' }]}>
                ביטול
              </Text>
            </AnimatedPressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
