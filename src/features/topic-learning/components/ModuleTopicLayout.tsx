import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { FastForward } from 'lucide-react-native';
import { TopicChip } from './TopicChip';
import { scenesForModule } from '../pathScenes';
import type { Topic } from '../types';

const SCREEN_W = Dimensions.get('window').width;

const NODE_SIZE = 78;
const ROW_HEIGHT = NODE_SIZE + 36;
const WAVE_AMPLITUDE = 42;
const WAVE_PERIOD = 6;
// Decorative Shark+Daisy loops in the side gutters (Duolingo-style). The `-v2`
// WebPs are full-frame with transparent padding (no crop), so NO character is
// ever clipped by the asset itself.
//
// Sizing history: bumped 110→200 ("גדול יותר"), trimmed to 160 ("תקטין
// טיפה"), shrunk to 90 to fit the narrow gutter — then Yoav 2026-06-11
// asked to restore the previous size ("תגדיל קצת ... לגודל שהם היו קודם"),
// so back to 160. The chip column is COLUMN_W (~210px) wide and centered,
// leaving ~70px gutters; at 160 a small off-screen bleed keeps the character
// clear of the chips (see SCENE_BLEED).
const SCENE_SIZE = 160;
const COLUMN_W = Math.min(SCREEN_W * 0.5, 220);
const SCENE_VISIBLE_W = SCENE_SIZE;
// Off-screen tuck — pulls the loop partly past the screen edge so the
// character peeks in from the margin (Duolingo / Hay Day pattern) instead of
// butting against the chip column.
const SCENE_BLEED = 24;
// Exactly TWO scenes per module: themed loop + generic loop. Upper anchor
// pulled near the very top per Yoav 2026-06-11 ("יותר למעלה"); lower stays
// in the lower third.
const SCENE_ANCHOR_FRACTIONS = [0.06, 0.74] as const;
// Vertical gap rendered above the first chip and below the last chip.
// Kept tight so the transitions read as "natural continuation" rather
// than dedicated trail segments (Yoav R5.12 2026-06-10: "החיבור בין
// סוף המודולה לפנינה שאחריו תהיה קצרה יותר וטבעית. כנל בין כפתור
// המודולה למה שבא אחריו"). Earlier R5.11 ran 96px+40px overlap which
// felt like a separate trail; this halves both.
const EDGE_CONNECTOR_H = 44;
// Entry connector ALSO extends upward into the parent ModuleNode's
// space — DuoLearnScreen doesn't render any trail between mod-1-1 and
// the accordion (its outer PathConnector goes AFTER the accordion to
// the NEXT module). The overlap is JUST enough to kiss mod-1-1's
// bottom edge so the transition reads as a short, natural step.
const ENTRY_OVERLAP = 14;
function pathOffset(i: number): number {
  return Math.round(Math.sin((i * 2 * Math.PI) / WAVE_PERIOD) * WAVE_AMPLITUDE);
}

// Force the first and last chip to offset 0 so the entry and exit
// connectors meet the outer DuoLearnScreen trail dead-center, with no
// horizontal jog. Wave still runs for middle chips (Yoav R5.13
// 2026-06-10: "שיהיה חלק" — make the trail smooth).
function endAlignedOffset(i: number, total: number): number {
  if (total <= 1) return 0;
  if (i === 0 || i === total - 1) return 0;
  return pathOffset(i);
}


interface ModuleTopicLayoutProps {
  topics: Topic[];
  isCompletedMap: Record<string, boolean>;
  recommendedTopicId?: string | null;
  /** Retained for API stability — the GrowingTree it used to drive was
   *  retired in R5.10 per Yoav ("תוריד בבקשה את העץ, הוא לא מתאים"). */
  progressPct?: number;
  /** Horizontal wave offset of the parent ModuleNode on the OUTER map
   *  (DuoLearnScreen `getNodeOffset(i)`). The chip column is centered
   *  (first/last chip forced to 0), but the node above and the pearl
   *  connector below both sit at this offset. Without it the entry/exit
   *  connectors run dead-center and the trail JOGS horizontally where the
   *  sub-module map meets the general map (Yoav 2026-06-11: "החיבור בין
   *  המפת למידה תת מודולה למפה הכללית לוקה בחסר"). Entry routes node→column,
   *  exit routes column→next-connector so both ends meet flush. */
  nodeOffsetX?: number;
  onTopicPress: (topic: Topic) => void;
  /** "למידה רציפה" autopilot launcher. When provided, a KEY (מקש) renders to
   *  the LEFT of the FIRST chip — anchored in the FULL-WIDTH container (NOT the
   *  narrow pathColumn, which clips it on Android), so it reliably shows in the
   *  left gutter beside the intro chip (Yoav 2026-06-14). Parent
   *  (TopicTreeAccordion) passes this only in the early window (no content chip
   *  completed yet, chapter 1+); we additionally gate on the live completed
   *  count so it hides the moment a real chip is done. */
  onStartContinuous?: () => void;
}

/**
 * R5.9 (2026-06-10) — restore entry/exit connectors:
 *  - Entry PathConnector fills the gap above the first chip so the
 *    outer mod-1-1 gold trail visually continues INTO the chip column
 *    rather than dead-ending in whitespace.
 *  - Exit PathConnector fills the gap below the last chip so the
 *    column hands off cleanly to the next pearl's trail. Both are
 *    rendered in the same dotted style as the inter-chip connectors
 *    so the entire surface reads as one continuous path.
 *
 * Earlier (R5.4 → R5.8): entry/exit oscillated between white-dotted,
 * coin column, and nothing. None looked right. The cause was
 * underestimating how visible the gap is on first paint — the outer
 * DuoLearnScreen trail terminates at mod-1-1's bottom edge and only
 * resumes BELOW the accordion content; the accordion needs to draw
 * its own connector across that span.
 */
export const ModuleTopicLayout = React.memo(function ModuleTopicLayout({
  topics,
  isCompletedMap,
  recommendedTopicId,
  nodeOffsetX = 0,
  onTopicPress,
  onStartContinuous,
}: ModuleTopicLayoutProps): React.ReactElement {
  const sorted = useMemo(
    () =>
      (topics ?? [])
        .filter(Boolean)
        .slice()
        .sort((a, b) => (a.defaultOrder ?? 0) - (b.defaultOrder ?? 0)),
    [topics],
  );

  // Early-window gate for the autopilot KEY: visible only until the user
  // completes their first NON-intro (content) chip. Mirrors the count the
  // parent uses to anchor the accordion top, so the key is always on-screen
  // while shown.
  const completedNonIntroCount = useMemo(
    () => sorted.filter((t) => t.kind !== 'intro' && isCompletedMap[t.id]).length,
    [sorted, isCompletedMap],
  );
  const showAutopilotKey = Boolean(onStartContinuous) && completedNonIntroCount < 1;

  // Height = entry connector + n chip rows + exit connector.
  const totalHeight = EDGE_CONNECTOR_H + sorted.length * ROW_HEIGHT + EDGE_CONNECTOR_H;
  const firstCompleted = sorted.length > 0 && Boolean(isCompletedMap[sorted[0].id]);
  const lastCompleted =
    sorted.length > 0 && Boolean(isCompletedMap[sorted[sorted.length - 1].id]);

  // Decorative side-gutter character loops (Duolingo-style). Distributed down
  // the column, alternating sides, anchored to chip rows but placed on the
  // gutter OPPOSITE the chip's lean for max clearance. Suppressed entirely
  // under reduced-motion (pure decoration). No-ops while PATH_SCENES is empty.
  const reduceMotion = useReducedMotion();
  const moduleId = sorted[0]?.moduleId;
  const scenes = useMemo(() => {
    const n = sorted.length;
    if (reduceMotion || n < 2) return [];
    const [themed, generic] = scenesForModule(moduleId);
    const pair = [themed, generic];

    // Place EACH scene on the gutter OPPOSITE the chip lean at ITS OWN anchor
    // row, so every loop sits in the emptier margin and never hides behind a
    // chip. Earlier the 2nd scene was just forced to the side opposite the 1st
    // (for balance) — which dropped it straight onto the chip column whenever
    // both rows leaned the same way (Yoav 2026-06-11: "הוובפים מוסתרים ע"י
    // התתי מודולות / צד שמאל צריך להופיע מימין"). A chip offset > 0 leans into
    // the RIGHT gutter, so the loop goes LEFT, and vice-versa; a centered chip
    // (offset 0) defaults to the right gutter (the side with free space).
    const rowFor = (frac: number) => Math.max(0, Math.min(n - 1, Math.round(n * frac)));
    const sideForFrac = (frac: number): 'left' | 'right' =>
      endAlignedOffset(rowFor(frac), n) > 0 ? 'left' : 'right';
    const sides = [
      sideForFrac(SCENE_ANCHOR_FRACTIONS[0]),
      sideForFrac(SCENE_ANCHOR_FRACTIONS[1]),
    ] as const;

    return pair.map((scene, idx) => {
      const anchorRow = rowFor(SCENE_ANCHOR_FRACTIONS[idx]);
      const rowCenter = EDGE_CONNECTOR_H + anchorRow * ROW_HEIGHT + ROW_HEIGHT / 2;
      return {
        id: scene.id,
        source: scene.source,
        top: rowCenter - SCENE_SIZE / 2,
        side: sides[idx],
        // Negative offset bleeds part of the loop off-screen so the character
        // peeks in from the margin (Duolingo pattern) without crowding the
        // chip column or getting chopped by an overflow clip.
        offset: -SCENE_BLEED,
      };
    });
  }, [sorted.length, moduleId, reduceMotion]);

  return (
    <View style={[styles.container, { height: totalHeight }]}>
      {/* Decorative Shark+Daisy loops in the side gutters. First child +
          pointerEvents="none" so they paint behind the chips and never
          intercept a tap. Looping is handled by the animated WebP itself.
          R8 follow-up (Yoav 2026-06-10, iter 3): the perceived "black
          bars" on web turned out to be the lack of an explicit
          transparent background — expo-image on RN-web composites
          alpha against the View's background, which inherits no color
          and renders as black on certain Chromium builds. Adding
          backgroundColor: 'transparent' on both the wrapper AND the
          image element forces a clean alpha composite without needing
          to crop. */}
      {scenes.length > 0 && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {scenes.map((s) => (
            <View
              key={s.id}
              style={{
                position: 'absolute',
                top: s.top,
                width: SCENE_VISIBLE_W,
                height: SCENE_SIZE,
                backgroundColor: 'transparent',
                zIndex: 0,
                ...(s.side === 'right' ? { right: s.offset } : { left: s.offset }),
              }}
            >
              <ExpoImage
                source={s.source}
                accessible={false}
                contentFit="contain"
                style={{
                  width: SCENE_SIZE,
                  height: SCENE_SIZE,
                  backgroundColor: 'transparent',
                }}
              />
            </View>
          ))}
        </View>
      )}

      {/* The "למידה רציפה" autopilot KEY renders further down, in the
          full-width container (see styles.autopilotKey), anchored to the first
          chip's row in the left gutter. It can't live inside the narrow
          pathColumn — Android clips children that overflow it (Yoav 2026-06-14). */}

      {/* Entry connector — from outer module node DOWN to the intro chip.
          Extends UPWARD by ENTRY_OVERLAP so it overlaps the parent
          ModuleNode's bottom edge, AND now extends DOWN past the top of the
          first row all the way to the intro chip's vertical CENTER
          (ROW_HEIGHT/2 below the row top). Earlier it stopped at the row top
          (EDGE_CONNECTOR_H), leaving a ~57px empty gap between the trail and
          the intro chip — the "פער באמצע" Yoav reported 2026-06-11. The chip
          (drawn after) covers the trail's lower end, so it reads as a single
          continuous path from the module title into the intro chip. First
          chip is end-aligned at offset 0 → straight vertical column. */}
      <View
        style={[
          styles.entryConnectorSlot,
          { top: -ENTRY_OVERLAP, height: EDGE_CONNECTOR_H + ENTRY_OVERLAP + ROW_HEIGHT / 2 },
        ]}
        pointerEvents="none"
      >
        <PathConnector
          fromOffsetX={nodeOffsetX}
          toOffsetX={0}
          done={firstCompleted}
          height={EDGE_CONNECTOR_H + ENTRY_OVERLAP + ROW_HEIGHT / 2}
        />
      </View>

      {/* Path column centered horizontally; sine-wave offsets fan
          chips left/right around its midline. */}
      <View style={[styles.pathColumn, { marginTop: EDGE_CONNECTOR_H }]}>
        {sorted.map((topic, i) => {
          const isCompleted = Boolean(isCompletedMap[topic.id]);
          const offsetX = endAlignedOffset(i, sorted.length);
          const nextOffsetX = i < sorted.length - 1 ? endAlignedOffset(i + 1, sorted.length) : null;

          return (
            <Animated.View
              key={topic.id}
              entering={FadeInDown.delay(60 + i * 90).duration(320).springify().damping(14)}
              style={styles.row}
            >
              {/* Dotted PathConnector — identical to outer DuoLearnScreen
                  trail, so the topic-tree's chip-to-chip path reads as
                  the same surface as the outer module-to-module path
                  (Yoav R5.8: "השביל מטבעות... לא אחיד כמו שאר המפת
                  למידה"). */}
              {nextOffsetX !== null && (
                <View style={styles.midConnectorSlot} pointerEvents="none">
                  <PathConnector
                    fromOffsetX={offsetX}
                    toOffsetX={nextOffsetX}
                    done={isCompleted}
                    height={ROW_HEIGHT}
                  />
                </View>
              )}
              <View style={[styles.nodeSlot, { transform: [{ translateX: offsetX }] }]}>
                <TopicChip
                  topic={topic}
                  completed={isCompleted}
                  recommended={
                    !isCompleted && recommendedTopicId === topic.id
                  }
                  onPress={onTopicPress}
                />
              </View>
            </Animated.View>
          );
        })}
      </View>

      {/* Exit connector — from last chip out to the next pearl below.
          Last chip is end-aligned at offset 0 (see endAlignedOffset), so
          this is a straight vertical column meeting the outer trail
          dead-center with no horizontal jog. */}
      <View style={[styles.exitConnectorSlot, { height: EDGE_CONNECTOR_H }]} pointerEvents="none">
        <PathConnector
          fromOffsetX={0}
          toOffsetX={nodeOffsetX}
          done={lastCompleted}
          height={EDGE_CONNECTOR_H}
        />
      </View>

      {/* "למידה רציפה" autopilot KEY — rendered in the FULL-WIDTH container
          (sibling of the gutter scenes), NOT inside the half-width pathColumn.
          On Android a child that overflows the narrow pathColumn's bounds gets
          clipped, so the key was invisible whenever it sat in the left gutter
          (Yoav 2026-06-14: "ראו אותו רק כשהיה מתחת לציפ הראשי"). Absolutely
          anchored to the FIRST chip's row, in the left gutter beside the intro
          chip — left:50% is the container (=chip) center, marginLeft pulls it
          one chip-half + gap + key-width to the left. zIndex keeps it tappable
          above the chips. */}
      {showAutopilotKey && onStartContinuous && (
        <Pressable
          onPress={onStartContinuous}
          accessibilityRole="button"
          accessibilityLabel="למידה רציפה — למד את כל המודולה ברצף, בלי לעצור"
          hitSlop={8}
          style={({ pressed }) => [
            styles.autopilotKey,
            pressed && styles.autopilotKeyPressed,
          ]}
        >
          <FastForward size={17} color="#ffffff" fill="#ffffff" strokeWidth={0} />
          <Text style={styles.autopilotKeyLabel} allowFontScaling={false}>
            למידה{'\n'}רציפה
          </Text>
        </Pressable>
      )}
    </View>
  );
});

/** Cloned from DuoLearnScreen.PathConnector (line 296). Memoized — each
 *  instance renders ~124 absolutely-positioned dots, and ModuleTopicLayout
 *  re-renders on every isCompletedMap change. React.memo skips the whole
 *  recompute when this connector's own props are unchanged. */
const PathConnector = React.memo(function PathConnector({
  fromOffsetX,
  toOffsetX,
  done,
  height,
}: {
  fromOffsetX: number;
  toOffsetX: number;
  done: boolean;
  height: number;
}): React.ReactElement {
  const NUM_DOTS = 16;
  const CONNECTOR_H = height;
  const dotColor = done ? '#f59e0b' : '#d1d5db';
  const trailColor = done ? '#fde68a' : '#e5e7eb';
  const glowColor = '#fde68a';

  const interp = useMemo(
    () => (t: number) => {
      const smooth = 0.5 - 0.5 * Math.cos(t * Math.PI);
      return fromOffsetX + (toOffsetX - fromOffsetX) * smooth;
    },
    [fromOffsetX, toOffsetX],
  );

  return (
    <View pointerEvents="none" style={styles.connectorAbs}>
      {done && Array.from({ length: 60 }).map((_, i) => {
        const t = i / 59;
        const cx = interp(t);
        const cy = t * CONNECTOR_H;
        return (
          <View
            key={`glow-${i}`}
            style={{
              position: 'absolute',
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: glowColor,
              left: '50%',
              marginLeft: cx - 7,
              top: cy,
              opacity: 0.18,
            }}
          />
        );
      })}
      {Array.from({ length: NUM_DOTS * 3 }).map((_, i) => {
        const t = i / (NUM_DOTS * 3 - 1);
        const cx = interp(t);
        const cy = t * CONNECTOR_H;
        const sz = done ? 10 : 6;
        return (
          <View
            key={`trail-${i}`}
            style={{
              position: 'absolute',
              width: sz,
              height: sz,
              borderRadius: sz / 2,
              backgroundColor: trailColor,
              left: '50%',
              marginLeft: cx - sz / 2,
              top: cy,
              opacity: done ? 0.5 : 0.25,
            }}
          />
        );
      })}
      {Array.from({ length: NUM_DOTS }).map((_, i) => {
        const t = i / (NUM_DOTS - 1);
        const cx = interp(t);
        const cy = t * (CONNECTOR_H - 4);
        const dotSize = done
          ? 10 + Math.sin(t * Math.PI) * 3
          : 7 + Math.sin(t * Math.PI) * 2;
        return (
          <View
            key={`dot-${i}`}
            style={{
              position: 'absolute',
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: dotColor,
              left: '50%',
              marginLeft: cx - dotSize / 2,
              top: cy,
              opacity: done ? 1 : 0.55,
              ...(done && {
                borderWidth: 1.5,
                borderColor: '#fffbeb',
                shadowColor: '#f59e0b',
                shadowOpacity: 0.6,
                shadowRadius: 4,
                elevation: 3,
              }),
            }}
          />
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  entryConnectorSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    // top + height are set inline so we can extend upward into the
    // parent ModuleNode's space without leaking through the styles
    // object (each instance computes its own overlap).
  },
  exitConnectorSlot: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  pathColumn: {
    width: Math.min(SCREEN_W * 0.5, 220),
    alignSelf: 'center',
  },
  row: {
    height: ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  nodeSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  connectorAbs: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Pull the inter-chip connector down so it emerges from the chip's
  // vertical center (NODE_SIZE/2 below the row top, which is where the
  // chip sits centered).
  midConnectorSlot: {
    position: 'absolute',
    top: NODE_SIZE / 2,
    left: 0,
    right: 0,
    height: ROW_HEIGHT,
  },
  // "למידה רציפה" autopilot KEY — absolute in the FULL-WIDTH container (NOT the
  // narrow pathColumn, which clips it on Android). Anchored to the FIRST chip's
  // row center: top = entry-connector height + (row − key)/2. left:'50%' is the
  // container/chip center; the negative marginLeft = NODE_SIZE/2 (half chip) +
  // 10 gap + KEY width, putting it in the left gutter beside the intro chip.
  autopilotKey: {
    position: 'absolute',
    top: EDGE_CONNECTOR_H + (ROW_HEIGHT - 56) / 2,
    left: '50%',
    marginLeft: -(NODE_SIZE / 2 + 10 + 66),
    width: 66,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    borderWidth: 1.5,
    borderColor: '#60a5fa',
    borderBottomWidth: 4,
    borderBottomColor: '#1e40af',
    zIndex: 30,
    shadowColor: '#2563eb',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 12,
  },
  autopilotKeyPressed: {
    backgroundColor: '#1d4ed8',
    borderBottomWidth: 2,
    transform: [{ translateY: 2 }],
  },
  autopilotKeyLabel: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '900',
    lineHeight: 13,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
