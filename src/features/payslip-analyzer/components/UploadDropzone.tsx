import { useCallback, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Upload, Camera, Lock, Trash2, Sparkles } from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import Animated, { FadeIn } from "react-native-reanimated";
import { GlowCard } from "../../../components/ui/GlowCard";
import { SupercellButton } from "../../../components/ui/SupercellButton";
import { STITCH } from "../../../constants/theme";
import { usePayslipAnalyzerStore } from "../usePayslipAnalyzerStore";
import { preprocessImage } from "../lib/preprocessImage";
import { validateFile } from "../lib/clientValidate";
import type { ChosenFile, PayslipErrorCode } from "../types";

const RTL = { writingDirection: "rtl" as const, textAlign: "right" as const };
const RTL_CENTER = { writingDirection: "rtl" as const, textAlign: "center" as const };

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
];

function inferMimeFromAsset(
  mimeType: string | undefined | null,
  uri: string,
): string {
  if (mimeType && mimeType.length > 0) return mimeType;
  const lower = uri.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic")) return "image/heic";
  return "image/jpeg";
}

function deriveDisplayName(
  candidate: string | null | undefined,
  uri: string,
): string {
  if (candidate && candidate.length > 0) return candidate;
  const seg = uri.split("/").pop() ?? "";
  return seg.length > 0 ? seg : "תלוש שכר";
}

async function resolveByteSize(
  uri: string,
  hinted: number | undefined,
): Promise<number> {
  if (typeof hinted === "number" && hinted > 0 && Number.isFinite(hinted)) {
    return hinted;
  }
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && typeof info.size === "number" && info.size > 0) {
      return info.size;
    }
  } catch {
    // fall through
  }
  return 0;
}

export function UploadDropzone() {
  const chooseFile = usePayslipAnalyzerStore((s) => s.chooseFile);
  const setError = usePayslipAnalyzerStore((s) => s.setError);
  const [busy, setBusy] = useState(false);

  const finalizeChosen = useCallback(
    async (params: {
      uri: string;
      mimeType: string;
      byteSize: number;
      displayName: string;
    }) => {
      const initial: ChosenFile = {
        uri: params.uri,
        mimeType: params.mimeType,
        byteSize: params.byteSize,
        previewUri: params.uri,
        displayName: params.displayName,
      };

      const validation = validateFile(initial);
      if (!validation.ok) {
        setError(validation.code);
        return;
      }

      if (params.mimeType.startsWith("image/")) {
        try {
          const processed = await preprocessImage(initial);
          const finalFile: ChosenFile = {
            ...initial,
            uri: processed.uri,
            byteSize: processed.byteSize,
            previewUri: processed.uri,
            mimeType: "image/jpeg",
          };
          const reValidation = validateFile(finalFile);
          if (!reValidation.ok) {
            setError(reValidation.code);
            return;
          }
          chooseFile(finalFile);
          return;
        } catch {
          const fallback: PayslipErrorCode = "parse_failed";
          setError(fallback);
          return;
        }
      }

      chooseFile(initial);
    },
    [chooseFile, setError],
  );

  const handleUpload = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ACCEPTED_TYPES,
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) {
        setError("picker_cancelled");
        return;
      }
      const asset = result.assets[0];
      if (!asset) {
        setError("picker_cancelled");
        return;
      }
      const mimeType = inferMimeFromAsset(asset.mimeType, asset.uri);
      const byteSize = await resolveByteSize(asset.uri, asset.size);
      await finalizeChosen({
        uri: asset.uri,
        mimeType,
        byteSize,
        displayName: deriveDisplayName(asset.name, asset.uri),
      });
    } catch {
      setError("unknown");
    } finally {
      setBusy(false);
    }
  }, [busy, finalizeChosen, setError]);

  const handleCamera = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setError("picker_cancelled");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.95,
        base64: false,
        exif: false,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) {
        setError("picker_cancelled");
        return;
      }
      const asset = result.assets[0];
      if (!asset) {
        setError("picker_cancelled");
        return;
      }
      const mimeType = inferMimeFromAsset(asset.mimeType, asset.uri);
      const byteSize = await resolveByteSize(asset.uri, asset.fileSize);
      await finalizeChosen({
        uri: asset.uri,
        mimeType,
        byteSize,
        displayName: deriveDisplayName(asset.fileName, asset.uri),
      });
    } catch {
      setError("unknown");
    } finally {
      setBusy(false);
    }
  }, [busy, finalizeChosen, setError]);

  return (
    <Animated.View entering={FadeIn.duration(280)} style={styles.wrap}>
      <GlowCard glowColor={STITCH.secondaryPurple} pressable={false} style={styles.card}>
        <Text style={[styles.title, RTL_CENTER]} allowFontScaling={false}>
          העלאת תלוש שכר
        </Text>
        <Text style={[styles.subtitle, RTL_CENTER]} allowFontScaling={false}>
          תמונה (JPEG/PNG/WebP/HEIC) או PDF — עד 4MB/8MB.
        </Text>

        <View style={styles.buttonsRow}>
          <View style={styles.buttonCol}>
            <SupercellButton
              label="העלה"
              variant="blue"
              buttonStyle="duo"
              size="md"
              onPress={handleUpload}
              disabled={busy}
              icon={<Upload size={18} color="#ffffff" strokeWidth={2.5} />}
            />
          </View>
          <View style={styles.buttonCol}>
            <SupercellButton
              label="צלם"
              variant="orange"
              buttonStyle="duo"
              size="md"
              onPress={handleCamera}
              disabled={busy}
              icon={<Camera size={18} color="#ffffff" strokeWidth={2.5} />}
            />
          </View>
        </View>

        <View style={styles.chipsRow}>
          <View style={styles.chip}>
            <Lock size={13} color="#0c4a6e" strokeWidth={2.5} />
            <Text style={[styles.chipText, RTL]} allowFontScaling={false}>
              מאובטח
            </Text>
          </View>
          <View style={styles.chip}>
            <Trash2 size={13} color="#0c4a6e" strokeWidth={2.5} />
            <Text style={[styles.chipText, RTL]} allowFontScaling={false}>
              לא נשמר
            </Text>
          </View>
          <View style={styles.chip}>
            <Sparkles size={13} color="#0c4a6e" strokeWidth={2.5} />
            <Text style={[styles.chipText, RTL]} allowFontScaling={false}>
              AI חכם
            </Text>
          </View>
        </View>
      </GlowCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  card: {
    paddingVertical: 22,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0c4a6e",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 16,
    lineHeight: 18,
  },
  buttonsRow: {
    flexDirection: "row-reverse",
    gap: 12,
    marginBottom: 16,
  },
  buttonCol: {
    flex: 1,
  },
  chipsRow: {
    flexDirection: "row-reverse",
    justifyContent: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  chip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(14,165,233,0.10)",
    borderWidth: 1,
    borderColor: "rgba(14,165,233,0.22)",
  },
  chipText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0c4a6e",
  },
});
