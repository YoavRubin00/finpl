import React from "react";
import { View, Text, Pressable, Image } from "react-native";
// Ionicons removed, using Finn error illustration instead
import { captureException } from "../../lib/sentry";
import { captureEvent } from "../../lib/posthog";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional render-prop fallback — replaces the default full-screen "אופס"
   *  so a host (e.g. the lesson flow) can show a small recover-and-continue UI
   *  instead of dead-ending on a blank screen. Receives a `reset` callback
   *  that clears the captured error. */
  fallback?: (reset: () => void) => React.ReactNode;
  /** When this value changes, the boundary auto-clears a previous error so the
   *  next content renders fresh after a recovered crash (e.g. the lesson phase
   *  key). */
  resetKey?: string | number;
}

export class GlobalErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    captureException(error, {
      componentStack: errorInfo.componentStack ?? "unknown",
    });
    // Mirror to PostHog Error Tracking so render-tree crashes are visible
    // alongside product analytics (until now $exception fired 0× — total blind
    // spot per the board, 2026-06-18). Sentry stays as the rich crash sink.
    try {
      captureEvent("$exception", {
        $exception_list: [
          {
            type: error.name,
            value: error.message,
            mechanism: { handled: true, synthetic: false },
          },
        ],
        $exception_message: error.message,
        $exception_type: error.name,
        component_stack: errorInfo.componentStack ?? "unknown",
        capture_source: "error_boundary",
      });
    } catch {
      /* analytics must never break the crash screen */
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Auto-recover when the host changes resetKey (e.g. advanced to a new
    // lesson phase) so a one-off crash doesn't stick the boundary open.
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback(this.handleRetry);
      return (
        <View
          accessible
          accessibilityRole="alert"
          style={{
            flex: 1,
            backgroundColor: "#09111f",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 32,
          }}
        >
          <Image source={{ uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/images/finn/finn-error.png' }} style={{ width: 120, height: 120, borderRadius: 16, marginBottom: 12 }} resizeMode="contain" />
          <Text
            accessibilityRole="header"
            style={{
              color: "#ffffff",
              fontSize: 22,
              fontWeight: "700",
              marginTop: 20,
              textAlign: "center",
            }}
          >
            אופס, משהו השתבש
          </Text>
          <Text
            style={{
              color: "#cbd5e1",
              fontSize: 15,
              marginTop: 12,
              textAlign: "center",
              lineHeight: 22,
            }}
          >
            קרתה שגיאה לא צפויה. נסה לחזור שוב.
          </Text>
          {__DEV__ && this.state.error && (
            <Text
              style={{
                color: "#64748b",
                fontSize: 11,
                marginTop: 16,
                textAlign: "left",
                fontFamily: "monospace",
                maxHeight: 120,
              }}
              numberOfLines={6}
            >
              {this.state.error.message}
            </Text>
          )}
          <Pressable
            onPress={this.handleRetry}
            accessibilityRole="button"
            accessibilityLabel="נסה שוב"
            accessibilityHint="לחץ כדי לטעון מחדש את האפליקציה"
            style={{
              marginTop: 28,
              backgroundColor: "#22d3ee",
              paddingHorizontal: 32,
              paddingVertical: 14,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "#09111f", fontSize: 16, fontWeight: "700" }}>
              נסה שוב
            </Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
