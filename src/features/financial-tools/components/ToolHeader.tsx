import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';

import { STITCH } from '../../../constants/theme';
import { tapHaptic } from '../../../utils/haptics';
import { useTutorialStore } from '../../../stores/useTutorialStore';
import type { ToolKey } from '../toolsRegistry';
import { TOOL_TUTORIALS } from '../data/toolTutorials';
import { ToolTutorialOverlay } from './ToolTutorialOverlay';
import { useRecordToolUsage } from '../hooks/useRecordToolUsage';

interface ToolHeaderProps {
  title: string;
  subtitle?: string;
  /** Accent color used for the back-button pill and icon tint. Defaults to STITCH primary blue. */
  accentColor?: string;
  /** Optional Lucide icon shown in a colored circle next to the title (Duo-style). */
  Icon?: LucideIcon;
  /**
   * When provided, ToolHeader auto-mounts the first-visit Captain Shark
   * tutorial overlay if the user hasn't seen it yet for this tool.
   * Skip on tools that don't have an entry in TOOL_TUTORIALS.
   */
  toolKey?: ToolKey;
}

/**
 * Shared RTL header for every Financial Tool screen. Back button always returns
 * the user to the Tools hub (/(tabs)/tools) — never relies on history, so deep
 * links and back-on-first-screen both land on the hub instead of bailing out.
 */
export function ToolHeader({ title, subtitle, accentColor = STITCH.primary, Icon, toolKey }: ToolHeaderProps) {
  const router = useRouter();

  // Spending >10s inside a real tool (toolKey set) counts as today's streak
  // day. The utility moment earns identity credit the same way a lesson
  // would. Also fires `tool_used` for NSM measurement. Idempotent.
  useRecordToolUsage(!!toolKey, toolKey);

  // First-visit tutorial — only render the overlay when the user hasn't
  // seen it AND the tool has a tutorial defined. Reading the flag with a
  // narrow selector avoids re-renders when other tutorial flags change.
  const tutorialSteps = toolKey ? TOOL_TUTORIALS[toolKey] : undefined;
  const hasSeenTutorial = useTutorialStore(
    (s) => (toolKey ? s.hasSeenToolTutorial[toolKey] ?? false : true),
  );
  const showTutorial = !!toolKey && !!tutorialSteps && !hasSeenTutorial;

  const handleBack = () => {
    tapHaptic();
    router.replace('/(tabs)/tools' as never);
  };

  return (
    <>
      <View style={styles.bar}>
        {/* Back button — anchored on the right edge in RTL */}
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [
            styles.backBtn,
            { borderColor: accentColor + '33', backgroundColor: accentColor + '14' },
            pressed && styles.backBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="חזרה לכלים"
          hitSlop={8}
        >
          <ChevronRight size={22} color={accentColor} strokeWidth={2.6} />
        </Pressable>

        {Icon ? (
          <View style={[styles.iconWrap, { backgroundColor: accentColor + '1f' }]}>
            <Icon size={22} color={accentColor} strokeWidth={2.4} />
          </View>
        ) : null}

        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1} allowFontScaling={false}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1} allowFontScaling={false}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Tutorial overlay is rendered as a SIBLING of the bar (not a child).
          `position: absolute` resolves against the nearest ancestor, so when
          the overlay sat inside the ~60px bar its `bottom: 0` anchored to
          the bar's bottom edge instead of the screen's. Hoisting it out
          lets the SafeAreaView host of the tool screen become the anchor,
          giving the overlay full-screen height. */}
      {showTutorial && toolKey && tutorialSteps ? (
        <ToolTutorialOverlay toolKey={toolKey} steps={tutorialSteps} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: STITCH.surfaceHighest,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: STITCH.onSurface,
    textAlign: 'right',
    writingDirection: 'rtl',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: STITCH.onSurfaceVariant,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 2,
  },
});
