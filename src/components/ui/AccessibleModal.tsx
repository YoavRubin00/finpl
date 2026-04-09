import React, { useEffect } from "react";
import { Modal, ModalProps, Pressable, StyleSheet, View, AccessibilityInfo } from "react-native";

interface AccessibleModalProps extends ModalProps {
  visible: boolean;
  onRequestClose: () => void;
  /** Spoken when the modal opens. Default: "נפתח חלון". */
  openAnnouncement?: string;
  /** Label for the backdrop dismiss area. Default: "סגור". */
  dismissLabel?: string;
  /** When true (default), tapping outside the content closes the modal. */
  dismissOnBackdrop?: boolean;
  children?: React.ReactNode;
}

/**
 * Modal wrapper that adds a labeled backdrop dismiss, marks itself as
 * `accessibilityViewIsModal` so VoiceOver treats it as an isolated layer,
 * and announces opening for screen-reader users.
 */
export function AccessibleModal({
  visible,
  onRequestClose,
  openAnnouncement = "נפתח חלון",
  dismissLabel = "סגור",
  dismissOnBackdrop = true,
  children,
  ...rest
}: AccessibleModalProps) {
  useEffect(() => {
    if (visible) {
      AccessibilityInfo.announceForAccessibility(openAnnouncement);
    }
  }, [visible, openAnnouncement]);

  return (
    <Modal
      visible={visible}
      onRequestClose={onRequestClose}
      transparent
      animationType="fade"
      {...rest}
    >
      <View
        style={styles.root}
        accessibilityViewIsModal
        importantForAccessibility="yes"
      >
        {dismissOnBackdrop && (
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={onRequestClose}
            accessibilityRole="button"
            accessibilityLabel={dismissLabel}
          />
        )}
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
});