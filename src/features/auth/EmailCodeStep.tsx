import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import {
  authErrorDetail,
  requestEmailCode,
  verifyEmailCode,
  type VerifiedSession,
} from "../../lib/api/auth";
import { captureEvent } from "../../lib/posthog";

// Email sign-in proves the address with a 6-digit code (2026-11-13). Before,
// typing any address returned that account's session, so anyone could sign in
// as anyone. Hosts: RegisterScreen, LoginScreen, the onboarding login sub-step.
// The copy avoids gendered verbs, so it fits both the onboarding voice
// (singular) and the system voice (docs/BRAND.md).

export const EMAIL_CODE_LENGTH = 6;
const RESEND_AFTER_SEC = 30;

export type EmailCodeSource = "register" | "login" | "onboarding_login";

/** Hebrew message for a failed code request (shown on the email step). */
export function emailCodeRequestError(err: unknown): string {
  const d = authErrorDetail(err);
  switch (d.code) {
    case "INVALID_EMAIL":
      return "כתובת המייל לא תקינה. כדאי לבדוק אותה.";
    case "RATE_LIMITED":
      return d.retryAfterSec !== null && d.retryAfterSec <= 90
        ? `אפשר לבקש קוד חדש בעוד ${d.retryAfterSec} שניות.`
        : "יותר מדי בקשות. אפשר לנסות שוב בעוד כמה דקות.";
    case "NETWORK":
      return "אין חיבור לרשת כרגע. אפשר לנסות שוב בעוד רגע.";
    default:
      return "לא הצלחנו לשלוח קוד. אפשר לנסות שוב בעוד רגע.";
  }
}

/** Ask the server to mail a code. Resolves to null on success, else the Hebrew error. */
export async function sendEmailCode(email: string, source: EmailCodeSource): Promise<string | null> {
  try {
    await requestEmailCode(email);
    captureEvent("auth_email_code_requested", { source });
    return null;
  } catch (err: unknown) {
    captureEvent("auth_email_code_request_failed", { source, error_code: authErrorDetail(err).code });
    return emailCodeRequestError(err);
  }
}

/** Hebrew message for a rejected code, and whether that code can still work. */
function verifyErrorMessage(err: unknown): { message: string; codeDead: boolean } {
  const d = authErrorDetail(err);
  switch (d.code) {
    case "EMAIL_CODE_INVALID":
      if (d.attemptsLeft === 0) return { message: "הקוד כבר לא בתוקף. אפשר לשלוח קוד חדש.", codeDead: true };
      if (d.attemptsLeft === 1) return { message: "הקוד לא נכון. נשאר ניסיון אחד.", codeDead: false };
      if (d.attemptsLeft !== null) return { message: `הקוד לא נכון. נשארו ${d.attemptsLeft} ניסיונות.`, codeDead: false };
      return { message: "הקוד לא נכון. אפשר לנסות שוב.", codeDead: false };
    case "EMAIL_CODE_EXPIRED":
      return { message: "תוקף הקוד פג. אפשר לשלוח קוד חדש.", codeDead: true };
    case "EMAIL_CODE_TOO_MANY_ATTEMPTS":
      return { message: "יותר מדי ניסיונות. אפשר לשלוח קוד חדש.", codeDead: true };
    case "RATE_LIMITED":
      return { message: "יותר מדי ניסיונות. אפשר לנסות שוב בעוד כמה דקות.", codeDead: false };
    case "NETWORK":
      return { message: "אין חיבור לרשת כרגע. אפשר לנסות שוב בעוד רגע.", codeDead: false };
    default:
      return { message: "משהו השתבש. אפשר לנסות שוב.", codeDead: false };
  }
}

function formatCountdown(sec: number): string {
  return `0:${String(sec).padStart(2, "0")}`;
}

interface EmailCodeStepProps {
  /** Address the code was sent to (already trimmed + lowercased). */
  email: string;
  /** Used only when the code creates a new account. */
  displayName: string | null;
  source: EmailCodeSource;
  /** Runs once the server accepted the code. Throwing keeps the user on this step with an error. */
  onVerified: (session: VerifiedSession) => Promise<void>;
  onChangeEmail: () => void;
  /** Lets a host match its own primary button. */
  buttonStyle?: StyleProp<ViewStyle>;
  buttonTextStyle?: StyleProp<TextStyle>;
}

export function EmailCodeStep({
  email,
  displayName,
  source,
  onVerified,
  onChangeEmail,
  buttonStyle,
  buttonTextStyle,
}: EmailCodeStepProps) {
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_AFTER_SEC);
  const inputRef = useRef<TextInput>(null);
  const mountedRef = useRef(true);
  const verifyingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    captureEvent("auth_email_code_step_viewed", { source });
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  const canSubmit = code.length === EMAIL_CODE_LENGTH && !verifying;

  async function submit(value: string) {
    if (value.length !== EMAIL_CODE_LENGTH || verifyingRef.current) return;
    verifyingRef.current = true;
    setVerifying(true);
    setError(null);
    setNotice(null);

    let session: VerifiedSession;
    try {
      session = await verifyEmailCode(email, value, displayName);
    } catch (err: unknown) {
      const { message, codeDead } = verifyErrorMessage(err);
      captureEvent("auth_email_code_failed", { source, error_code: authErrorDetail(err).code });
      if (mountedRef.current) {
        setError(message);
        setCode("");
        if (codeDead) setSecondsLeft(0);
        setVerifying(false);
        inputRef.current?.focus();
      }
      verifyingRef.current = false;
      return;
    }

    captureEvent("auth_email_code_verified", { source });
    try {
      await onVerified(session);
    } catch {
      // The code was consumed by the server, so a retry needs a new one.
      if (mountedRef.current) {
        setError("משהו השתבש בכניסה. אפשר לשלוח קוד חדש ולנסות שוב.");
        setCode("");
        setSecondsLeft(0);
        setVerifying(false);
      }
      verifyingRef.current = false;
    }
    // On success the host navigates away; the spinner stays until then.
  }

  async function resend() {
    if (secondsLeft > 0 || resending || verifying) return;
    setResending(true);
    setError(null);
    setNotice(null);
    const failure = await sendEmailCode(email, source);
    if (!mountedRef.current) return;
    setResending(false);
    if (failure) {
      setError(failure);
      return;
    }
    setCode("");
    setSecondsLeft(RESEND_AFTER_SEC);
    setNotice("שלחנו קוד חדש.");
    inputRef.current?.focus();
  }

  return (
    <View style={{ width: "100%" }}>
      <Text
        style={{ fontSize: 18, fontWeight: "800", color: "#0f172a", textAlign: "center", writingDirection: "rtl", marginBottom: 6 }}
        accessibilityRole="header"
      >
        {/* The isolate marks keep the address left-to-right inside the Hebrew line. */}
        {`שלחנו קוד ל-⁨${email}⁩`}
      </Text>
      <Text style={{ fontSize: 13, color: "#64748b", textAlign: "center", writingDirection: "rtl", lineHeight: 20, marginBottom: 14 }}>
        {"הקוד תקף ל-10 דקות. לא הגיע? כדאי לבדוק גם בספאם."}
      </Text>

      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={(v) => {
          const digits = v.replace(/\D/g, "").slice(0, EMAIL_CODE_LENGTH);
          setCode(digits);
          if (error) setError(null);
          // Autofill and paste deliver all six digits at once: submit right away.
          if (digits.length === EMAIL_CODE_LENGTH) void submit(digits);
        }}
        editable={!verifying}
        autoFocus
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={EMAIL_CODE_LENGTH}
        placeholder="••••••"
        placeholderTextColor="#cbd5e1"
        returnKeyType="done"
        onSubmitEditing={() => void submit(code)}
        accessibilityLabel="קוד בן 6 ספרות"
        accessibilityHint="הקוד שנשלח למייל"
        style={{
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: error ? "#fca5a5" : "#e2e8f0",
          backgroundColor: "#f8fafc",
          paddingVertical: 12,
          fontSize: 26,
          fontWeight: "800",
          letterSpacing: 10,
          color: "#0f172a",
          textAlign: "center",
          writingDirection: "ltr",
          marginBottom: 10,
        }}
      />

      {error ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{ fontSize: 13, fontWeight: "600", color: "#dc2626", textAlign: "center", writingDirection: "rtl", marginBottom: 10 }}
        >
          {error}
        </Text>
      ) : notice ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontSize: 13, fontWeight: "600", color: "#0e7490", textAlign: "center", writingDirection: "rtl", marginBottom: 10 }}
        >
          {notice}
        </Text>
      ) : null}

      <Pressable
        disabled={!canSubmit}
        onPress={() => void submit(code)}
        accessibilityRole="button"
        accessibilityLabel="המשך"
        accessibilityState={{ disabled: !canSubmit, busy: verifying }}
        style={[
          {
            width: "100%",
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0891b2",
            borderBottomWidth: 4,
            borderBottomColor: "#0e7490",
          },
          buttonStyle,
          { opacity: canSubmit || verifying ? 1 : 0.5 },
        ]}
      >
        {verifying ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={[{ fontSize: 15, fontWeight: "700", color: "#ffffff" }, buttonTextStyle]}>המשך</Text>
        )}
      </Pressable>

      <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
        {secondsLeft > 0 ? (
          <Text style={{ fontSize: 13, color: "#94a3b8", writingDirection: "rtl" }}>
            {`קוד חדש בעוד ${formatCountdown(secondsLeft)}`}
          </Text>
        ) : (
          <Pressable
            onPress={() => void resend()}
            disabled={resending || verifying}
            accessibilityRole="button"
            accessibilityLabel="שליחת קוד חדש"
            hitSlop={8}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#0891b2", writingDirection: "rtl", opacity: resending ? 0.5 : 1 }}>
              {resending ? "שולחים..." : "שליחת קוד חדש"}
            </Text>
          </Pressable>
        )}
        <Pressable
          onPress={onChangeEmail}
          disabled={verifying}
          accessibilityRole="button"
          accessibilityLabel="שינוי כתובת המייל"
          hitSlop={8}
        >
          <Text style={{ fontSize: 13, color: "#64748b", textDecorationLine: "underline", writingDirection: "rtl" }}>
            שינוי כתובת
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
