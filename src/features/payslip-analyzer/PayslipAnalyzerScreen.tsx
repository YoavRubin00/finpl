import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as FileSystem from "expo-file-system/legacy";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FileText, RotateCcw, X } from "lucide-react-native";
import { useRouter } from "expo-router";
import { BackButton } from "../../components/ui/BackButton";
import { SupercellButton } from "../../components/ui/SupercellButton";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { useAuthStore } from "../auth/useAuthStore";
import { useIsPro } from "../subscription/useSubscription";
import { useUsageStore } from "../subscription/useUsageStore";
import { useUpgradeModalStore } from "../../stores/useUpgradeModalStore";
import { usePayslipAnalyzerStore } from "./usePayslipAnalyzerStore";
import { usePayslipMetaStore } from "./usePayslipMetaStore";
import { analyzePayslipFile } from "./lib/uploadFile";
import { grantPayslipReward } from "./lib/rewardPolicy";
import { ERROR_COPY } from "./lib/errorCopy";
import { buildAnonymizedStats } from "./lib/anonymizedStats";
import { tapHaptic } from "../../utils/haptics";
import { SharkAccountantBanner, type SharkBannerMood } from "./components/SharkAccountantBanner";
import { UploadDropzone } from "./components/UploadDropzone";
import { AnalyzingState } from "./components/AnalyzingState";
import { ResultCard } from "./components/ResultCard";
import { PayslipChat } from "./components/PayslipChat";
import { ToolNextStepCard } from "../financial-tools/components/ToolNextStepCard";
import { useFinancialProfileStore } from "../financial-tools/useFinancialProfileStore";
import { useToolInstrumentation } from "../financial-tools/hooks/useToolInstrumentation";
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
  useToolInstrumentation('payslip');
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

  // Moni Sample Loop (2026-05-30): Free users get 1 payslip analysis per
  // week. Pro is unlimited. Gate fires before the actual analyzePayslipFile()
  // call so we don't burn an OCR/AI invocation on a blocked request — and
  // because the global UpgradeModal feels more native than letting analysis
  // start then aborting.
  const isPro = useIsPro();
  const canUsePayslip = useUsageStore((s) => s.canUse('payslip', isPro));
  const incrementUsage = useUsageStore((s) => s.incrementUsage);
  const showUpgrade = useUpgradeModalStore((s) => s.show);

  const [showLegal, setShowLegal] = useState<boolean>(legalAcceptedAt === null);
  const [analyzing, setAnalyzing] = useState(false);

  const lastFileUriRef = useRef<string | null>(null);
  const outerScrollRef = useRef<ScrollView | null>(null);

  // When the chat input gains focus we scroll the outer ScrollView to the
  // bottom so the input bar isn't hidden behind the keyboard. KAV reclaims
  // the bottom inset but the outer ScrollView still needs to surface the
  // input — without this scroll the user just sees more of the result above.
  const handleChatInputFocus = useCallback(() => {
    setTimeout(() => {
      outerScrollRef.current?.scrollToEnd({ animated: true });
    }, 250);
  }, []);

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

  const banner = useMemo(() => bannerCopyForPhase(phase), [phase]);

  const handleAnalyze = useCallback(async () => {
    if (!file || analyzing) return;
    if (!canUsePayslip) {
      // Free user already used their weekly payslip analysis. Surface the
      // standard upgrade modal — copy lives in UpgradeModal.tsx FEATURE_INFO.
      showUpgrade('payslip');
      return;
    }
    setAnalyzing(true);
    startAnalyzing();
    try {
      const response = await analyzePayslipFile(file, {
        name: displayName ?? undefined,
        financialGoal: financialGoal ?? undefined,
      });
      if (response.ok) {
        // Count the use only on success — failed OCR / network errors
        // shouldn't burn the user's weekly quota.
        incrementUsage('payslip');
        setResult(response.result);
        // Auto-share an anonymized fingerprint (gross range, pension %, credit points)
        // for the clan-comparison Robinhood card. Users can opt out via AnonymousPayslipCard.
        const anonymized = buildAnonymizedStats(response.result);
        usePayslipMetaStore.getState().setAnonymizedStats(anonymized);
        // Persist a private fingerprint to the standalone Financial
        // Profile store so every financial tool (Salary Net, Tax Refund,
        // Pension Fees…) opens pre-filled. Only writes when confidence
        // is high enough to trust the extraction; the user can always
        // overwrite via the Financial Profile screen if a field is wrong.
        // This store is intentionally separate from the onboarding
        // `useAuthStore.profile` so payslip data never leaks into the
        // signup flow.
        if (response.result.confidence >= 0.6) {
          const incomeTaxDeduction = response.result.deductions
            .filter((d) => d.kind === 'income_tax')
            .reduce((sum, d) => sum + d.amount, 0);
          const creditPointsMetric = response.result.metrics.find(
            (m) => m.kind === 'credit_points',
          );
          useFinancialProfileStore.getState().update({
            monthlySalaryGross: Math.round(response.result.brutto),
            monthlyTaxPaid: incomeTaxDeduction > 0
              ? Math.round(incomeTaxDeduction)
              : undefined,
            creditPoints: creditPointsMetric?.value,
          });
        }
        // Grant XP/coins silently — no celebration modal between analysis and result.
        if (!rewardGranted) {
          grantPayslipReward();
          markRewardGranted();
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
    canUsePayslip,
    showUpgrade,
    incrementUsage,
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

  const handleLegalAccepted = useCallback(() => {
    setShowLegal(false);
  }, []);

  const handleLegalDismiss = useCallback(() => {
    setShowLegal(false);
    router.replace('/(tabs)/tools' as never);
  }, [router]);

  const errorCopy = errorCode ? ERROR_COPY[errorCode] : null;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      // iOS: 'padding' lifts content. Android: 'height' explicitly measures
      // the keyboard so the chat input bar at the bottom stays visible —
      // same pattern as ChatScreen / StockAnalystScreen.
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={["#f0f9ff", "#e0f2fe", "#f8fafc"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.topBar}>
        <View style={styles.backWrap}>
          <BackButton color="#0c4a6e" onPress={() => router.replace('/(tabs)/tools' as never)} />
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
        ref={outerScrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(32, insets.bottom + 16) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
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

        {phase === "success" && result ? (
          <View style={styles.nextStepWrap}>
            <ToolNextStepCard toolKey="payslip" accentColor="#005bb1" />
          </View>
        ) : null}

        {phase === "success" && result ? (
          <PayslipChat
            result={result}
            fileName={file?.displayName}
            onInputFocus={handleChatInputFocus}
          />
        ) : null}

        {phase === "error" ? (
          <View style={styles.errorWrap}>
            <Text style={[styles.errorTitle, RTL_CENTER]} allowFontScaling={false}>
              {errorCopy?.title ?? "אירעה תקלה"}
            </Text>
            <Text style={[styles.errorBody, RTL_CENTER]} allowFontScaling={false}>
              {errorCopy?.body ?? "נסו שוב."}
            </Text>
            {errorCode ? (
              <View style={styles.errorCodeChip}>
                <Text style={styles.errorCodeText} allowFontScaling={false}>
                  קוד שגיאה: {errorCode}
                </Text>
              </View>
            ) : null}
            <View style={styles.retryButtonWrap}>
              <SupercellButton
                label={errorCopy?.cta ?? "נסה שוב"}
                variant="blue"
                buttonStyle="duo"
                size="md"
                onPress={() => {
                  tapHaptic();
                  clearAll();
                }}
                icon={<RotateCcw size={18} color="#ffffff" strokeWidth={2.6} />}
              />
            </View>
          </View>
        ) : null}
      </ScrollView>

      <LegalGateModal
        visible={showLegal}
        onAccepted={handleLegalAccepted}
        onDismiss={handleLegalDismiss}
      />
    </KeyboardAvoidingView>
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
  nextStepWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
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
  errorCodeChip: {
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fcd34d",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 4,
  },
  errorCodeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#78350f",
    writingDirection: "rtl",
  },
  retryButtonWrap: {
    alignSelf: "stretch",
    marginTop: 12,
  },
});
