/**
 * MindMapViewer, Interactive mind map tree visualization.
 * Renders a hierarchical JSON mind map with animated expandable nodes.
 * Designed for RTL (Hebrew) with chapter-themed colors.
 */
import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { AnimatedPressable } from './AnimatedPressable';
import { X } from 'lucide-react-native';
import { tapHaptic } from '../../utils/haptics';

/* ── Types ── */

interface MindMapNode {
  name: string;
  children?: MindMapNode[];
}

interface MindMapViewerProps {
  visible: boolean;
  onClose: () => void;
  data: MindMapNode;
  chapterTitle: string;
  accentColor: string;
}

/* ── Node colors by depth ── */
const DEPTH_COLORS = [
  '#0369a1', // root, deep blue
  '#0ea5e9', // level 1, sky blue
  '#38bdf8', // level 2, lighter blue
  '#7dd3fc', // level 3, pale blue
  '#bae6fd', // level 4+
];

const DEPTH_BG = [
  'rgba(14,165,233,0.12)',
  'rgba(56,189,248,0.10)',
  'rgba(125,211,252,0.08)',
  'rgba(186,230,253,0.06)',
  'rgba(224,242,254,0.05)',
];

/* ── TreeNode, recursive expandable node ── */

function TreeNode({ node, depth = 0, index = 0 }: { node: MindMapNode; depth?: number; index?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const color = DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)];
  const bg = DEPTH_BG[Math.min(depth, DEPTH_BG.length - 1)];

  const handlePress = useCallback(() => {
    if (hasChildren) {
      tapHaptic();
      setExpanded((p) => !p);
    }
  }, [hasChildren]);

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 40 + depth * 60).duration(300)}
      style={[styles.nodeContainer, { marginRight: depth * 16 }]}
    >
      <Pressable onPress={handlePress} style={[styles.nodeRow, { backgroundColor: bg }]}>
        {/* Connector dot */}
        <View style={[styles.dot, { backgroundColor: color }]} />

        {/* Label */}
        <Text style={[styles.nodeText, { color, fontWeight: depth === 0 ? '900' : depth === 1 ? '800' : '600', fontSize: depth === 0 ? 18 : depth === 1 ? 16 : 14 }]}>
          {node.name}
        </Text>

        {/* Expand indicator */}
        {hasChildren && (
          <Text style={[styles.expandIcon, { color }]}>
            {expanded ? '▾' : '◂'}
          </Text>
        )}
      </Pressable>

      {/* Children */}
      {expanded && hasChildren && (
        <View style={styles.childrenContainer}>
          {/* Vertical connector line */}
          <View style={[styles.connectorLine, { backgroundColor: color, opacity: 0.2 }]} />
          {node.children!.map((child, i) => (
            <TreeNode key={`${child.name}-${i}`} node={child} depth={depth + 1} index={i} />
          ))}
        </View>
      )}
    </Animated.View>
  );
}

/* ── Main Component ── */

export function MindMapViewer({ visible, onClose, data, chapterTitle, accentColor }: MindMapViewerProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent={false} accessibilityViewIsModal>
      <View style={styles.container}>
        {/* Header, close button on RIGHT (RTL), title center */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <View style={{ width: 38 }} />
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: accentColor }]}>
              מפת הלמידה
            </Text>
            <Text style={styles.headerSubtitle}>{chapterTitle}</Text>
          </View>
          <AnimatedPressable onPress={onClose} style={styles.closeBtn}>
            <X size={22} color="#0369a1" />
          </AnimatedPressable>
        </Animated.View>

        {/* Hint */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.hint}>
          <Text style={styles.hintText}>לחץ על ענף כדי לפתוח או לסגור</Text>
        </Animated.View>

        {/* Tree */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TreeNode node={data} depth={0} index={0} />
        </ScrollView>
      </View>
    </Modal>
  );
}

/* ── Styles ── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eff6ff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: '#f0f9ff',
    borderBottomWidth: 1,
    borderBottomColor: '#bae6fd',
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7dd3fc',
    marginTop: 2,
  },
  hint: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#e0f2fe',
    borderBottomWidth: 1,
    borderBottomColor: '#bae6fd',
  },
  hintText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0369a1',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
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
