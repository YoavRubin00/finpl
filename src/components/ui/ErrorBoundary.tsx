import React from "react";
import { View, Text, Pressable, Image } from "react-native";
// Ionicons removed — using Finn error illustration instead
import { captureException } from "../../lib/sentry";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
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
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
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
