import { View, Text, Pressable, Modal } from 'react-native';
import { Diamond } from 'lucide-react-native';
import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { GoldCoinIcon } from '../../components/ui/GoldCoinIcon';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface ConfirmModalProps {
  visible: boolean;
  itemName: string;
  coinCost: number;
  originalCoinCost?: number;
  gemCost?: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  visible,
  itemName,
  coinCost,
  originalCoinCost,
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
          <Text style={[RTL, { fontSize: 14, color: '#64748b', marginBottom: originalCoinCost ? 4 : 20 }]}>
            אישור רכישה. לא ניתן לבטל לאחר מכן.
          </Text>
          {originalCoinCost && (
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Text style={{ fontSize: 12, color: '#9ca3af', textDecorationLine: 'line-through' }}>
                {originalCoinCost.toLocaleString()}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#16a34a' }}>
                {coinCost.toLocaleString()} ✓ הנחת PRO 20%
              </Text>
            </View>
          )}

          <View style={{ flexDirection: 'row-reverse', gap: 12 }}>
            <AnimatedPressable
              onPress={onConfirm}
              style={{
                flex: 1.4,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderRadius: 14,
                backgroundColor: '#1d4ed8',
                paddingVertical: 14,
                borderBottomWidth: 3,
                borderBottomColor: '#1e3a8a',
                shadowColor: '#1d4ed8',
                shadowOpacity: 0.35,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 3 },
                elevation: 5,
              }}
              accessibilityLabel={isGemPurchase ? `אשר רכישה ב-${gemCost} יהלומים` : `אשר רכישה ב-${coinCost} מטבעות`}
            >
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl' }}>
                קנה
              </Text>
              {isGemPurchase ? (
                <>
                  <Diamond size={18} color="#ffffff" />
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#ffffff' }}>
                    {gemCost}
                  </Text>
                </>
              ) : (
                <>
                  <GoldCoinIcon size={18} />
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#ffffff' }}>
                    {coinCost.toLocaleString()}
                  </Text>
                </>
              )}
            </AnimatedPressable>
            <AnimatedPressable
              onPress={onCancel}
              style={{ flex: 1, borderRadius: 14, borderWidth: 1.5, borderColor: '#e5e7eb', paddingVertical: 14, backgroundColor: '#f9fafb' }}
            >
              <Text style={[RTL, { textAlign: 'center', fontSize: 15, fontWeight: '700', color: '#6b7280' }]}>
                ביטול
              </Text>
            </AnimatedPressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
