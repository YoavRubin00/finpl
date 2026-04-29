/**
 * MindMapTree — pure inline renderer for hierarchical mind maps.
 * Used by both MindMapViewer (modal) and ChapterIntroScreen (inline).
 * Visualizes per-node completion + locked state for nodes that map to modules.
 */
import { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Check, Lock } from 'lucide-react-native';
import { tapHaptic } from '../../utils/haptics';

/* ── Types ── */

export interface MindMapNode {
  name: string;
  /** When present, this node represents a study module. Inline JSON wins over sidecar. */
  moduleId?: string;
  children?: MindMapNode[];
}

export interface MindMapTreeProps {
  data: MindMapNode;
  accentColor: string;
  /** Module IDs the user has completed in the current chapter. */
  completedModuleIds: ReadonlySet<string>;
  /** Module IDs that are gated behind earlier modules. Tap = no-op. */
  lockedModuleIds?: ReadonlySet<string>;
  /** Sidecar overlay: nodePath ("level1>level2") → moduleId. */
  moduleIdByPath?: Readonly<Record<string, string>>;
  onNodeTap?: (moduleId: string) => void;
}

/* ── Node colors by depth ── */
const DEPTH_COLORS = [
  '#0369a1',
  '#0ea5e9',
  '#38bdf8',
  '#7dd3fc',
  '#bae6fd',
];

const DEPTH_BG = [
  'rgba(14,165,233,0.12)',
  'rgba(56,189,248,0.10)',
  'rgba(125,211,252,0.08)',
  'rgba(186,230,253,0.06)',
  'rgba(224,242,254,0.05)',
];

const COMPLETED_BORDER = '#16a34a';
const COMPLETED_TEXT = '#15803d';
const NEUTRAL_DOT = '#94a3b8';

/* ── Internal node ── */

interface TreeNodeProps {
  node: MindMapNode;
  depth: number;
  index: number;
  path: string[];
  completedModuleIds: ReadonlySet<string>;
  lockedModuleIds: ReadonlySet<string>;
  moduleIdByPath: Readonly<Record<string, string>>;
  onNodeTap?: (moduleId: string) => void;
}

function resolveModuleId(
  node: MindMapNode,
  path: string[],
  moduleIdByPath: Readonly<Record<string, string>>,
): string | undefined {
  if (node.moduleId) return node.moduleId;
  if (path.length === 0) return undefined;
  return moduleIdByPath[path.join('>')];
}

function TreeNode({
  node,
  depth,
  index,
  path,
  completedModuleIds,
  lockedModuleIds,
  moduleIdByPath,
  onNodeTap,
}: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = !!(node.children && node.children.length > 0);
  const color = DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)];
  const bg = DEPTH_BG[Math.min(depth, DEPTH_BG.length - 1)];

  const moduleId = resolveModuleId(node, path, moduleIdByPath);
  const isCompleted = !!moduleId && completedModuleIds.has(moduleId);
  const isLocked = !!moduleId && lockedModuleIds.has(moduleId);
  const isModuleNode = !!moduleId;

  const handlePress = useCallback(() => {
    if (isModuleNode) {
      tapHaptic();
      if (isLocked) return;
      if (onNodeTap && moduleId) {
        onNodeTap(moduleId);
        return;
      }
    }
    if (hasChildren) {
      tapHaptic();
      setExpanded((p) => !p);
    }
  }, [hasChildren, isLocked, isModuleNode, moduleId, onNodeTap]);

  // Visual styling derived from completion/locked state
  const opacity = isModuleNode && !isCompleted ? (isLocked ? 0.4 : 0.6) : 1;
  const textColor = isCompleted ? COMPLETED_TEXT : color;
  const borderStyle = isCompleted
    ? { borderRightWidth: 3, borderRightColor: COMPLETED_BORDER }
    : null;

  const a11yLabel = isModuleNode
    ? `${node.name}${isCompleted ? ', הושלם' : isLocked ? ', נעול' : ''}`
    : node.name;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 40 + depth * 60).duration(300)}
      style={[styles.nodeContainer, { marginRight: depth * 16 }]}
    >
      <Pressable
        onPress={handlePress}
        accessibilityRole={isModuleNode || hasChildren ? 'button' : 'text'}
        accessibilityLabel={a11yLabel}
        accessibilityHint={
          isModuleNode
            ? isLocked
              ? 'נעול. השלם את המודולות הקודמות כדי לפתוח'
              : 'לחץ להתחלת המודול'
            : hasChildren
              ? 'לחץ כדי לפתוח או לסגור'
              : undefined
        }
        style={[styles.nodeRow, { backgroundColor: bg, opacity }, borderStyle]}
      >
        {/* Leading badge — Check / Lock / colored dot / neutral dot */}
        {isCompleted ? (
          <Check size={14} color={COMPLETED_BORDER} />
        ) : isLocked ? (
          <Lock size={12} color={NEUTRAL_DOT} />
        ) : (
          <View
            style={[
              styles.dot,
              { backgroundColor: isModuleNode ? NEUTRAL_DOT : color },
            ]}
          />
        )}

        {/* Label */}
        <Text
          style={[
            styles.nodeText,
            {
              color: textColor,
              fontWeight: depth === 0 ? '900' : depth === 1 ? '800' : '600',
              fontSize: depth === 0 ? 18 : depth === 1 ? 16 : 14,
            },
          ]}
        >
          {node.name}
        </Text>

        {hasChildren && (
          <Text style={[styles.expandIcon, { color: textColor }]}>
            {expanded ? '▾' : '◂'}
          </Text>
        )}
      </Pressable>

      {expanded && hasChildren && (
        <View style={styles.childrenContainer}>
          <View style={[styles.connectorLine, { backgroundColor: color, opacity: 0.2 }]} />
          {node.children!.map((child, i) => (
            <TreeNode
              key={`${child.name}-${i}`}
              node={child}
              depth={depth + 1}
              index={i}
              path={[...path, child.name]}
              completedModuleIds={completedModuleIds}
              lockedModuleIds={lockedModuleIds}
              moduleIdByPath={moduleIdByPath}
              onNodeTap={onNodeTap}
            />
          ))}
        </View>
      )}
    </Animated.View>
  );
}

/* ── Public component ── */

const EMPTY_PATH_MAP: Readonly<Record<string, string>> = {};

export function MindMapTree({
  data,
  accentColor: _accentColor,
  completedModuleIds,
  lockedModuleIds,
  moduleIdByPath,
  onNodeTap,
}: MindMapTreeProps) {
  const lockedSet = useMemo(
    () => lockedModuleIds ?? (new Set<string>() as ReadonlySet<string>),
    [lockedModuleIds],
  );
  const pathMap = moduleIdByPath ?? EMPTY_PATH_MAP;

  return (
    <TreeNode
      node={data}
      depth={0}
      index={0}
      path={[]}
      completedModuleIds={completedModuleIds}
      lockedModuleIds={lockedSet}
      moduleIdByPath={pathMap}
      onNodeTap={onNodeTap}
    />
  );
}

/* ── Styles ── */

const styles = StyleSheet.create({
  nodeContainer: {
    marginBottom: 4,
  },
  nodeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nodeText: {
    flex: 1,
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 22,
  },
  expandIcon: {
    fontSize: 14,
    fontWeight: '700',
    width: 16,
    textAlign: 'center',
  },
  childrenContainer: {
    position: 'relative',
    paddingRight: 8,
  },
  connectorLine: {
    position: 'absolute',
    right: 19,
    top: 0,
    bottom: 8,
    width: 2,
    borderRadius: 1,
  },
});
