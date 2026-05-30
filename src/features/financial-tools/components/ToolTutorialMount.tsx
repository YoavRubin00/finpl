import React from 'react';
import { useTutorialStore } from '../../../stores/useTutorialStore';
import type { ToolKey } from '../toolsRegistry';
import { TOOL_TUTORIALS } from '../data/toolTutorials';
import { ToolTutorialOverlay } from './ToolTutorialOverlay';

interface Props {
  toolKey: ToolKey;
}

/**
 * Drop-in mount for the per-tool tutorial overlay, for tool routes that
 * don't use `ToolHeader` (compound, fire, payslip, analyst — they wrap a
 * sim/screen directly). Renders nothing if the tool has no tutorial entry
 * or the user has already seen it.
 *
 * Tools that DO use ToolHeader should pass `toolKey` to it instead — no
 * separate mount needed.
 */
export function ToolTutorialMount({ toolKey }: Props): React.ReactElement | null {
  const tutorialSteps = TOOL_TUTORIALS[toolKey];
  const hasSeen = useTutorialStore((s) => s.hasSeenToolTutorial[toolKey] ?? false);
  if (!tutorialSteps || hasSeen) return null;
  return <ToolTutorialOverlay toolKey={toolKey} steps={tutorialSteps} />;
}
