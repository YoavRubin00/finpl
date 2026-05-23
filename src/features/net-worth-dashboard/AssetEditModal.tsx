import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';

import { STITCH } from '../../constants/theme';
import { tapHaptic } from '../../utils/haptics';
import {
  LabeledTextInput,
  MoneyInput,
  PercentInput,
  PeriodChips,
  SectionLabel,
} from '../financial-tools/components/atoms';
import { CalculateButton } from '../financial-tools/components/atoms/CalculateButton';
import {
  type Asset,
  type AssetType,
  type Track,
  TRACK_LABEL,
  TRACKS_FOR_TYPE,
  findTypeMeta,
  getDefaultReturn,
} from './assetCatalog';
import { AssetTypePicker } from './components/AssetTypePicker';
import { useNetWorthStore } from './useNetWorthStore';

interface AssetEditModalProps {
  visible: boolean;
  /** When provided, modal opens in edit mode pre-filled with this asset's data. */
  asset: Asset | null;
  onClose: () => void;
}

const ACCENT = '#ec4899';

/**
 * Add / edit a single net-worth asset. Wraps the form in a native Modal with
 * formSheet presentation. Reused atoms for inputs; AssetTypePicker for type;
 * PeriodChips for track when applicable.
 */
export function AssetEditModal({
  visible,
  asset,
  onClose,
}: AssetEditModalProps): React.ReactElement {
  const addAsset = useNetWorthStore((s) => s.addAsset);
  const updateAsset = useNetWorthStore((s) => s.updateAsset);
  const removeAsset = useNetWorthStore((s) => s.removeAsset);

  const isEdit = asset !== null;

  const [type, setType] = useState<AssetType>('investment_account');
  const [name, setName] = useState('');
  const [value, setValue] = useState('0');
  const [liquid, setLiquid] = useState<boolean>(true);
  const [track, setTrack] = useState<Track>('none');
  const [monthlyDeposit, setMonthlyDeposit] = useState('0');
  const [expectedReturn, setExpectedReturn] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');

  // Reset form whenever modal opens for a different asset (or fresh add).
  useEffect(() => {
    if (!visible) return;
    if (asset) {
      setType(asset.type);
      setName(asset.name);
      setValue(String(asset.value));
      setLiquid(asset.liquid);
      setTrack(asset.track ?? TRACKS_FOR_TYPE[asset.type][0] ?? 'none');
      setMonthlyDeposit(String(asset.monthlyDeposit));
      setExpectedReturn(asset.expectedReturnPct);
      setNotes(asset.notes ?? '');
    } else {
      const initType: AssetType = 'investment_account';
      setType(initType);
      setName('');
      setValue('0');
      setLiquid(findTypeMeta(initType).defaultLiquid);
      setTrack(TRACKS_FOR_TYPE[initType][0] ?? 'none');
      setMonthlyDeposit('0');
      setExpectedReturn(undefined);
      setNotes('');
    }
  }, [visible, asset]);

  const meta = findTypeMeta(type);
  const availableTracks = TRACKS_FOR_TYPE[type];
  const defaultReturn = getDefaultReturn(type, track);

  function handleTypeChange(next: AssetType) {
    setType(next);
    const nextMeta = findTypeMeta(next);
    setLiquid(nextMeta.defaultLiquid);
    const nextTracks = TRACKS_FOR_TYPE[next];
    if (!nextTracks.includes(track)) setTrack(nextTracks[0] ?? 'none');
  }

  function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('שם נדרש', 'תנו שם לנכס כדי לזהות אותו ברשימה.');
      return;
    }
    const payload = {
      type,
      name: trimmedName,
      value: Number(value) || 0,
      liquid,
      track: meta.hasTrack ? track : undefined,
      monthlyDeposit: Number(monthlyDeposit) || 0,
      expectedReturnPct: expectedReturn,
      notes: notes.trim() || undefined,
    };
    tapHaptic();
    if (isEdit && asset) {
      updateAsset(asset.id, payload);
    } else {
      addAsset(payload);
    }
    onClose();
  }

  function handleDelete() {
    if (!asset) return;
    Alert.alert(
      'מחיקת נכס',
      `למחוק את "${asset.name}"? לא ניתן לשחזר.`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: () => {
            removeAsset(asset.id);
            onClose();
          },
        },
      ],
    );
  }

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      presentationStyle="formSheet"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.safe}
      >
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="סגירה"
            hitSlop={10}
          >
            <X size={22} color={STITCH.onSurface} strokeWidth={2.6} />
          </Pressable>
          <Text style={styles.title}>{isEdit ? 'עריכת נכס' : 'הוספת נכס'}</Text>
          <View style={styles.closeBtn} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SectionLabel>סוג הנכס</SectionLabel>
          <AssetTypePicker value={type} onChange={handleTypeChange} />

          <SectionLabel>פרטים</SectionLabel>

          <LabeledTextInput
            label="שם הנכס"
            value={name}
            onChangeText={setName}
            placeholder={`לדוגמה: ${meta.label} - הראל`}
            maxLength={60}
            accentColor={ACCENT}
          />

          <MoneyInput
            label="שווי נוכחי"
            value={value}
            onChangeText={setValue}
            placeholder="0"
            accentColor={ACCENT}
            step={1000}
            min={0}
          />

          <View style={styles.switchCard}>
            <Switch
              value={liquid}
              onValueChange={setLiquid}
              trackColor={{ true: ACCENT, false: STITCH.surfaceHighest }}
              thumbColor="#ffffff"
            />
            <View style={styles.switchTextWrap}>
              <Text style={styles.switchTitle}>נזיל</Text>
              <Text style={styles.switchSubtitle}>
                {liquid
                  ? 'ניתן למשיכה מיידית או תוך ימים בודדים'
                  : 'דורש זמן/תהליך — לא חלק מהנזילות הזמינה'}
              </Text>
            </View>
          </View>

          {meta.hasTrack ? (
            <PeriodChips<Track>
              label="מסלול השקעה"
              value={track}
              options={availableTracks}
              onChange={setTrack}
              renderLabel={(v) => TRACK_LABEL[v]}
              accentColor={ACCENT}
            />
          ) : null}

          <MoneyInput
            label="הפקדה חודשית"
            value={monthlyDeposit}
            onChangeText={setMonthlyDeposit}
            placeholder="0"
            accentColor={ACCENT}
            step={100}
            min={0}
          />

          <View style={styles.returnRow}>
            <PercentInput
              label={`תשואה שנתית משוערת · דיפולט ${defaultReturn.toFixed(1)}%`}
              value={expectedReturn ?? defaultReturn}
              onChange={(v) => setExpectedReturn(v)}
              presets={[3, 5, 7, 10]}
              decimals={1}
              accentColor={ACCENT}
            />
            {expectedReturn !== undefined ? (
              <Pressable
                style={styles.resetBtn}
                onPress={() => setExpectedReturn(undefined)}
                accessibilityRole="button"
                accessibilityLabel="חזרה לערך דיפולט"
              >
                <Text style={styles.resetBtnText}>חזרה לדיפולט</Text>
              </Pressable>
            ) : null}
          </View>

          <LabeledTextInput
            label="הערות"
            value={notes}
            onChangeText={setNotes}
            placeholder="לדוגמה: נזיל מ-2028, ניתן לקחת הלוואה..."
            multiline
            rows={3}
            maxLength={240}
            accentColor={ACCENT}
          />

          {isEdit ? (
            <Pressable
              style={styles.deleteBtn}
              onPress={handleDelete}
              accessibilityRole="button"
              accessibilityLabel="מחיקת נכס"
            >
              <Text style={styles.deleteBtnText}>מחק נכס</Text>
            </Pressable>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <CalculateButton
            label={isEdit ? 'שמירת שינויים' : 'הוסף נכס'}
            variant="pink"
            onPress={handleSave}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: STITCH.background },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: STITCH.surfaceLowest,
    borderBottomWidth: 1,
    borderBottomColor: STITCH.surfaceHighest,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
  },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, paddingBottom: 32, gap: 12 },

  switchCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
  },
  switchTextWrap: { flex: 1, alignItems: 'flex-end' },
  switchTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
  },
  switchSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
    textAlign: 'right',
    marginTop: 2,
  },

  returnRow: { gap: 6 },
  resetBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  resetBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: ACCENT,
    writingDirection: 'rtl',
  },

  deleteBtn: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#dc2626',
    writingDirection: 'rtl',
  },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 22,
    backgroundColor: STITCH.surfaceLowest,
    borderTopWidth: 1,
    borderTopColor: STITCH.surfaceHighest,
  },
});

