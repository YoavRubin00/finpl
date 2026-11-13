/**
 * The clock and the geometry of a living diagram. Pure: no React, no
 * Reanimated imports, so the plan can be checked without a device. The
 * easing helpers carry the "worklet" directive because the renderer calls
 * them on the UI thread.
 *
 * Timing is a native take on Ensemble's island clock (lead pulse, a packet
 * that rides each wire, a landing beat, a tick, a hold, a fade to empty).
 */
import { FLOW_MAX_LEGS, FLOW_MAX_NODES } from "./flowTypes";
import type { FlowNodeSpec, FlowStageSpec, FlowTone } from "./flowTypes";

/** ms: the first node breathes once before it sends. */
export const LEAD_MS = 450;
/** ms a coin rides one path. */
export const HOP_MS = 720;
/** ms of the landing beat before the next stage. */
export const LAND_MS = 320;
export const STAGGER_MS = 140;
/** ms after the last landing until the diagram counts as finished. */
export const TAIL_MS = 650;
/** ms the finished diagram holds before the round fades. */
export const HOLD_MS = 2400;
export const FADE_MS = 450;
/** ms a landing pulse lasts. */
export const PULSE_MS = 480;
/** ms a badge takes to pop. */
export const BADGE_MS = 420;
/** ms a number takes to count to its new value. */
export const COUNT_MS = 520;
/** A ring never fills faster than this, so the eye can follow it. */
const MIN_RING_MS = 420;

export interface PlannedLeg {
  key: string;
  from: string;
  to: string;
  startMs: number;
  hopMs: number;
  route: "h" | "v";
  tone: FlowTone;
  token: "coin" | "dot";
  /** True when the opposite leg also exists (a loop): both arc away from each other. */
  arced: boolean;
}

export interface PlannedNode {
  id: string;
  /** When each incoming coin lands, ascending. Empty for a node that only sends. */
  arrivals: number[];
  /** When the node lights up (0 for the first sender). */
  litAt: number;
  /** When its ring is full and its badge pops. */
  doneAt: number;
  isSource: boolean;
}

export interface FlowPlan {
  legs: PlannedLeg[];
  nodes: Record<string, PlannedNode>;
  /** ms: everything has landed and ticked. The still frame. */
  endMs: number;
  /** The node the story ends on (the last one to finish). */
  payoffId: string;
  payoffAt: number;
}

export function planFlow(nodes: FlowNodeSpec[], stages: FlowStageSpec[]): FlowPlan {
  const known = new Set(nodes.slice(0, FLOW_MAX_NODES).map((n) => n.id));
  const legs: PlannedLeg[] = [];
  const arrivals: Record<string, number[]> = {};
  const pairs = new Set<string>();

  for (const stage of stages) {
    for (const [from, to] of stage.legs) pairs.add(`${from}>${to}`);
  }

  let t = LEAD_MS;
  for (const stage of stages) {
    const valid = stage.legs.filter(([from, to]) => known.has(from) && known.has(to) && from !== to);
    if (valid.length === 0) continue;
    const stagger = stage.staggerMs ?? STAGGER_MS;
    const hopMs = stage.hopMs ?? HOP_MS;
    let used = 0;
    for (const [from, to] of valid) {
      if (legs.length >= FLOW_MAX_LEGS) break;
      const startMs = t + used * stagger;
      legs.push({
        key: `${from}>${to}#${legs.length}`,
        from,
        to,
        startMs,
        hopMs,
        route: stage.route ?? "h",
        tone: stage.tone ?? "cyan",
        token: stage.token ?? "coin",
        arced: pairs.has(`${to}>${from}`),
      });
      (arrivals[to] ??= []).push(startMs + hopMs);
      used += 1;
    }
    t += Math.max(0, used - 1) * stagger + hopMs + LAND_MS + (stage.holdMs ?? 0);
  }

  const sourceId = legs[0]?.from ?? nodes[0]?.id ?? "";
  const planned: Record<string, PlannedNode> = {};
  let payoffId = sourceId;
  let payoffAt = 0;

  for (const node of nodes.slice(0, FLOW_MAX_NODES)) {
    const list = (arrivals[node.id] ?? []).slice().sort((a, b) => a - b);
    const isSource = node.id === sourceId;
    // A node that only sends is an input: it is lit from the start, like the first sender.
    const litAt = isSource ? 0 : list[0] ?? 0;
    const last = list.length > 0 ? list[list.length - 1] : litAt;
    const doneAt = list.length > 0 ? Math.max(last + 150, litAt + MIN_RING_MS) : LEAD_MS - 60;
    planned[node.id] = { id: node.id, arrivals: list, litAt, doneAt, isSource };
    if (doneAt >= payoffAt) {
      payoffAt = doneAt;
      payoffId = node.id;
    }
  }

  const lastLanding = legs.reduce((max, leg) => Math.max(max, leg.startMs + leg.hopMs), LEAD_MS);
  const endMs = Math.max(lastLanding, payoffAt) + TAIL_MS;
  return { legs, nodes: planned, endMs, payoffId, payoffAt };
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

export interface Pt {
  x: number;
  y: number;
}

/** A cubic Bezier as eight numbers, so a worklet can capture it without objects. */
export interface Curve {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
  d: string;
  length: number;
}

function curveLength(c: Omit<Curve, "d" | "length">): number {
  let len = 0;
  let px = c.x0;
  let py = c.y0;
  const steps = 24;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const x = u * u * u * c.x0 + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t * c.x3;
    const y = u * u * u * c.y0 + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t * c.y3;
    len += Math.hypot(x - px, y - py);
    px = x;
    py = y;
  }
  return len;
}

function finish(c: Omit<Curve, "d" | "length">): Curve {
  const f = (n: number) => n.toFixed(1);
  return {
    ...c,
    d: `M${f(c.x0)} ${f(c.y0)}C${f(c.x1)} ${f(c.y1)} ${f(c.x2)} ${f(c.y2)} ${f(c.x3)} ${f(c.y3)}`,
    length: curveLength(c) + 1,
  };
}

/**
 * The path between two node centres, trimmed so it starts and ends on the
 * nodes' rims (radius `r`).
 * - "h": a soft S that leaves sideways (the reading direction).
 * - "v": a soft S that leaves downwards or upwards.
 * - arced: the two legs of a loop bow away from each other.
 */
export function legCurve(from: Pt, to: Pt, r: number, route: "h" | "v", arced: boolean): Curve {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (arced) {
    // Perpendicular bow. The normal flips with the direction, so A>B and B>A never overlap.
    const dist = Math.hypot(dx, dy) || 1;
    const nx = -dy / dist;
    const ny = dx / dist;
    // The bow is sized from the node, so each leg stays within the nodes' own height
    // (0.35r + 0.75 * bow < r) and never runs through the labels under or above them.
    const bow = Math.max(6, Math.min(r * 0.75 - 4, dist * 0.3));
    const ux = dx / dist;
    const uy = dy / dist;
    // Leave and arrive a little off the centre line, on the bowed side (still on the rim).
    const sx = from.x + ux * r * 0.937 + nx * r * 0.35;
    const sy = from.y + uy * r * 0.937 + ny * r * 0.35;
    const ex = to.x - ux * r * 0.937 + nx * r * 0.35;
    const ey = to.y - uy * r * 0.937 + ny * r * 0.35;
    return finish({
      x0: sx,
      y0: sy,
      x1: sx + ux * dist * 0.22 + nx * bow,
      y1: sy + uy * dist * 0.22 + ny * bow,
      x2: ex - ux * dist * 0.22 + nx * bow,
      y2: ey - uy * dist * 0.22 + ny * bow,
      x3: ex,
      y3: ey,
    });
  }

  if (route === "v" && Math.abs(dy) > 1) {
    const sy = from.y + Math.sign(dy) * r;
    const ey = to.y - Math.sign(dy) * r;
    const my = (sy + ey) / 2;
    return finish({ x0: from.x, y0: sy, x1: from.x, y1: my, x2: to.x, y2: my, x3: to.x, y3: ey });
  }

  const dir = Math.sign(dx) || 1;
  const sx = from.x + dir * r;
  const ex = to.x - dir * r;
  const mx = (sx + ex) / 2;
  return finish({ x0: sx, y0: from.y, x1: mx, y1: from.y, x2: mx, y2: to.y, x3: ex, y3: to.y });
}

// ---------------------------------------------------------------------------
// Easing (UI thread)
// ---------------------------------------------------------------------------

export function clamp01(x: number): number {
  "worklet";
  return x <= 0 ? 0 : x >= 1 ? 1 : x;
}

/** Travel: cubic in-out. */
export function easeInOut(x: number): number {
  "worklet";
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function easeOut(x: number): number {
  "worklet";
  return 1 - Math.pow(1 - x, 3);
}

/** A small overshoot, for badges and pops. */
export function backOut(x: number): number {
  "worklet";
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

/** 0 while the round is building or holding, rising to 1 as it fades back to empty. */
export function fadeAt(clock: number, endMs: number): number {
  "worklet";
  return clamp01((clock - endMs - HOLD_MS) / FADE_MS);
}
