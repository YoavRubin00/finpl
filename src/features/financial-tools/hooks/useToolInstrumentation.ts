import { useEffect, useRef } from 'react';
import { track } from '../../../lib/analytics/events';
import { useRecordToolUsage } from './useRecordToolUsage';

/**
 * Single hook that emits BOTH `tool_opened` (on mount) and `tool_used`
 * (after 10s — via useRecordToolUsage). Mount once at the top of a tool
 * screen and the rest of the analytics surface lights up.
 *
 * Use this for tools that DO NOT render ToolHeader (e.g. PayslipAnalyzer,
 * StockAnalyst, Compound, FIRE — which use bespoke headers). Tools that
 * render ToolHeader already get both events through ToolHeader itself, so
 * don't double-fire by calling this AND ToolHeader on the same screen.
 */
export function useToolInstrumentation(toolKey: string): void {
  useRecordToolUsage(true, toolKey);

  const openedFiredRef = useRef(false);
  useEffect(() => {
    if (!toolKey || openedFiredRef.current) return;
    openedFiredRef.current = true;
    track({ name: 'tool_opened', props: { tool_key: toolKey } });
  }, [toolKey]);
}
