import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as FileSystem from "expo-file-system/legacy";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FileText, X } from "lucide-react-native";
import { useRouter } from "expo-router";
import { BackButton } from "../../components/ui/BackButton";
import { SharkTipModal } from "../../components/ui/SharkTipModal";
import { SharkLoveModal } from "../../components/ui/SharkLoveModal";
import { SupercellButton } from "../../components/ui/SupercellButton";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { useAuthStore } from "../auth/useAuthStore";
import { usePayslipAnalyzerStore } from "./usePayslipAnalyzerStore";
import { usePayslipMetaStore } from "./usePayslipMetaStore";
import { analyzePayslipFile } from "./lib/uploadFile";
import { grantPayslipReward } from "./lib/rewardPolicy";
import { ERROR_COPY } from "./lib/errorCopy";
import { SharkAccountantBanner, type SharkBannerMood } from "./components/SharkAccountantBanner";
import { UploadDropzone } from "./components/UploadDropzone";
import { AnalyzingState } from "./components/AnalyzingState";
import { ResultCard } from "./components/ResultCard";
import { LegalGateModal } from "./components/LegalGateModal";
import type { ChosenFile, PayslipPhase } from "./types";

const RTL = { writingDirection: "rtl" as const, textAlign: "right" as const };
const RTL_CENTER = {
  writingDirection: "rtl" as const,
  textAlign: "center" as const,
};

interface BannerCopy {
  mood: SharkBannerMood;
  text: string;
  sub?: string;
}

function bannerCopyForPhase(phase: PayslipPhase): BannerCopy {
  switch (phase) {
    case "idle":
      return {
        mood: "tablet",
        text: "שלום! אני שארק רואה החשבון.",
        sub: "תעלו תלוש שכר ואחזיר לכם ניתוח מהיר.",
      };
    case "file_chosen":
      return {
        mood: "talking",
        text: "מצוין, יש לי את התלוש.",
        sub: "לחצו על ״נתח עכשיו״ כדי שאקרא אותו.",
      };
    case "analyzing":
      return {
        mood: "happy",
        text: "סורק את המספרים…",
        sub: "סבלנות קצרה, רגע אחד.",
      };
    case "success":
      return {
        mood: "happy",
        text: "הניתוח מוכן!",
        sub: "גללו כדי לראות את הפירוט.",
      };
    case "error":
      return {
        mood: "empathic",
        text: "משהו לא הסתדר.",
        sub: "אפשר לנסות שוב.",
      };
    default:
      return { mood: "tablet", text: "שלום!" };
  }
}

interface FilePreviewProps {
  file: ChosenFile;
  onClear: () => void;
  onAnalyze: () => void;
  busy: boolean;
}

function FilePreview({ file, onClear, onAnalyze, busy }: FilePreviewProps) {
  const isImage = file.mimeType.startsWith("image/");
  return (
    <Animated.View entering={FadeInDown.duration(300)} style={styles.previewWrap}>
      <View style={styles.previewCard}>
        <View style={styles.previewHeader}>
          <Text
            style={[styles.previewName, RTL]}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {file.displayName}
          </Text>
          <AnimatedPressable
            onPress={onClear}
            accessibilityRole="button"
            accessibilityLabel="הסר קובץ"
            style={styles.clearBtn}
            noScale
          >
            <X size={16} color="#0c4a6e" strokeWidth={2.5} />
          </AnimatedPressable>
        </View>

        <View style={styles.previewBody}>
          {isImage ? (
            <ExpoImage
              source={{ uri: file.previewUri }}
              style={styles.previewImage}
              contentFit="cover"
              accessible={false}
            />
          ) : (
            <View style={styles.pdfThumb}>
              <FileText size={42} color="#1d4ed8" strokeWidth={2} />
              <Text style={[styles.pdfLabel, RTL_CENTER]} allowFontScaling={false}>
                PDF
              </Text>
            </View>
          )}
        </View>

        <View style={styles.previewActionWrap}>
          <SupercellButton
            label={busy ? "מנתח…" : "נתח עכשיו"}
            variant="blue"
            buttonStyle="duo"
            size="md"
            onPress={onAnalyze}
            disabled={busy}
          />
        </View>
      </View>
    </Animated.View>
  );
}

export function PayslipAnalyzerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const phase = usePayslipAnalyzerStore((s) => s.phase);
  const file = usePayslipAnalyzerStore((s) => s.file);
  const result = usePayslipAnalyzerStore((s) => s.result);
  const errorCode = usePayslipAnalyzerStore((s) => s.errorCode);
  const rewardGranted = usePayslipAnalyzerStore((s) => s.rewardGranted);
  const chooseFile = usePayslipAnalyzerStore((s) => s.chooseFile);
  const startAnalyzing = usePayslipAnalyzerStore((s) => s.startAnalyzing);
  const setResult = usePayslipAnalyzerStore((s) => s.setResult);
  const setError = usePayslipAnalyzerStore((s) => s.setError);
  const markRewardGranted = usePayslipAnalyzerStore((s) => s.markRewardGranted);
  const clearAll = usePayslipAnalyzerStore((s) => s.clearAll);

  const legalAcceptedAt = usePayslipMetaStore((s) => s.legalAcceptedAt);

  const displayName = useAuthStore((s) => s.displayName);
  const financialGoal = useAuthStore((s) => s.profile?.financialGoal);

  const [showLegal, setShowLegal] = useState<boolean>(legalAcceptedAt === null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardSummary, setRewardSummary] = useState<{
    xp: number;
    coins: number;
    firstTime: boolean;
  } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const analysisStartRef = useRef<number>(Date.now());
  const lastFileUriRef = useRef<string | null>(null);

  useEffect(() => {
    lastFileUriRef.current = file?.uri ?? lastFileUriRef.current;
  }, [file?.uri]);

  // Unmount cleanup — delete temp file + clear in-memory state.
  useEffect(() => {
    return () => {
      const uri = lastFileUriRef.current;
      if (uri) {
        FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {
          // best-effort — ignore failures
        });
      }
      clearAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (errorCode) {
      setShowErrorModal(true);
    }
  }, [errorCode]);

  const banner = useMemo(() => bannerCopyForPhase(phase), [phase]);

  const handleAnalyze = useCallback(async () => {
    if (!file || analyzing) return;
    setAnalyzing(true);
    analysisStartRef.current = Date.now();
    startAnalyzing();
    try {
      const response = await analyzePayslipFile(file, {
        name: displayName ?? undefined,
        financialGoal: financialGoal ?? undefined,
      });
      if (response.ok) {
        setResult(response.result);
        const reward = grantPayslipReward();
        if (!rewardGranted) {
          markRewardGranted();
          if (!reward.capped) {
            setRewardSummary({
              xp: reward.xp,
              coins: reward.coins,
              firstTime: reward.isFirstTime,
            });
            setShowRewardModal(true);
          }
        }
      } else {
        setError(response.code);
      }
    } catch {
      setError("unknown");
    } finally {
      setAnalyzing(false);
    }
  }, [
    file,
    analyzing,
    startAnalyzing,
    displayName,
    financialGoal,
    setResult,
    setError,
    rewardGranted,
    markRewardGranted,
  ]);

  const handleClearFile = useCallback(() => {
    if (file?.uri) {
      FileSystem.deleteAsync(file.uri, { idempotent: true }).catch(() => {
        // best-effort
      });
    }
    clearAll();
  }, [file?.uri, clearAll]);

  const handleErrorClose = useCallback(() => {
    setShowErrorModal(false);
    if (errorCode === "picker_cancelled") {
      clearAll();
    } else if (
      errorCode === "invalid_mime" ||
      errorCode === "file_too_large" ||
      errorCode === "not_a_payslip" ||
      errorCode === "password_pdf"
    ) {
      clearAll();
    } else {
      // retryable: revert to idle so the dropzone is shown
      clearAll();
    }
  }, [errorCode, clearAll]);

  const handleLegalAccepted = useCallback(() => {
    setShowLegal(false);
  }, []);

  const handleLegalDismiss = useCallback(() => {
    setShowLegal(false);
    router.back();
  }, [router]);

  const handleRewardClaim = useCallback(() => {
    setShowRewardModal(false);
  }, []);

  const elapsedSeconds = useMemo(() => {
    if (!rewardSummary) return 0;
    return Math.max(
      1,
      Math.round((Date.now() - analysisStartRef.current) / 1000),
    );
  }, [rewardSummary]);

  const errorCopy = errorCode ? ERROR_COPY[errorCode] : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={["#f0f9ff", "#e0f2fe", "#f8fafc"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.topBar}>
        <View style={styles.backWrap}>
          <BackButton color="#0c4a6e" />
        </View>
        <Animated.Text
          entering={FadeIn.duration(280)}
          style={[styles.topTitle, RTL_CENTER]}
          allowFontScaling={false}
        >
          ניתוח תלוש שכר
        </Animated.Text>
        <View style={styles.backWrap} />
      </View>

      <SharkAccountantBanner
        mood={banner.mood}
        bubbleText={banner.text}
        bubbleSubtext={banner.sub}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(32, insets.bottom + 16) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {phase === "idle" ? <UploadDropzone /> : null}

        {phase === "file_chosen" && file ? (
          <FilePreview
            file={file}
            onClear={handleClearFile}
            onAnalyze={handleAnalyze}
            busy={analyzing}
          />
        ) : null}

        {phase === "analyzing" ? (
          <View>
            <AnalyzingState />
            <View style={styles.analyzingSpinner}>
              <ActivityIndicator size="small" color="#0c4a6e" />
            </View>
          </View>
        ) : null}

        {phase === "success" && result ? <ResultCard result={result} /> : null}

        {phase === "error" ? (
          <View style={styles.errorWrap}>
            <Text style={[styles.errorTitle, RTL_CENTER]} allowFontScaling={false}>
              {errorCopy?.title ?? "אירעה תקלה"}
            </Text>
            <Text style={[styles.errorBody, RTL_CENTER]} allowFontScaling={false}>
              {errorCopy?.body ?? "נסו שוב."}
            </Text>
            <View style={styles.errorCtaWrap}>
              <SupercellButton
                label={errorCopy?.cta ?? "נסה שוב"}
                variant="blue"
                buttonStyle="duo"
                size="md"
                onPress={() => {
                  clearAll();
                  setShowErrorModal(false);
                }}
              />
            </View>
          </View>
        ) : null}
      </ScrollView>

      <SharkTipModal
        visible={showErrorModal && errorCopy !== null}
        message={`${errorCopy?.title ?? ""}\n${errorCopy?.body ?? ""}`}
        onClose={handleErrorClose}
        ctaLabel={errorCopy?.cta ?? "הבנתי"}
      />

      <LegalGateModal
        visible={showLegal}
        onAccepted={handleLegalAccepted}
        onDismiss={handleLegalDismiss}
      />

      {showRewardModal && rewardSummary ? (
        <SharkLoveModal
          xpEarned={rewardSummary.xp}
          coinsEarned={rewardSummary.coins}
          elapsedSeconds={elapsedSeconds}
          onClaim={handleRewardClaim}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f0f9ff",
  },
  topBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 4,
  },
  backWrap: {
    width: 56,
    alignItems: "flex-end",
  },
  topTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "900",
    color: "#0c4a6e",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  previewWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  previewCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(14,165,233,0.32)",
    padding: 14,
    gap: 12,
    shadowColor: "#0c4a6e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  previewHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  previewName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: "#0c4a6e",
  },
  clearBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(14,165,233,0.10)",
  },
  previewBody: {
    alignItems: "center",
    justifyContent: "center",
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    backgroundColor: "#e2e8f0",
  },
  pdfThumb: {
    width: "100%",
    height: 140,
    borderRadius: 12,
    backgroundColor: "rgba(29,78,216,0.08)",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  pdfLabel: {
    fontSize: 13,
    fontWeight: "900",
    color: "#1d4ed8",
    letterSpacing: 1,
  },
  previewActionWrap: {
    marginTop: 2,
  },
  analyzingSpinner: {
    paddingTop: 6,
    paddingBottom: 18,
    alignItems: "center",
  },
  errorWrap: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 12,
    alignItems: "center",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0c4a6e",
  },
  errorBody: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    lineHeight: 20,
  },
  errorCtaWrap: {
    width: "100%",
    maxWidth: 280,
    marginTop: 8,
  },
});
