export interface PathPoint {
  x: number;
  y: number;
}

export const PATH_WAYPOINTS: ReadonlyArray<PathPoint> = [
  { x: 0.5, y: 0.02 },
  { x: 0.22, y: 0.18 },
  { x: 0.78, y: 0.34 },
  { x: 0.28, y: 0.5 },
  { x: 0.72, y: 0.66 },
  { x: 0.3, y: 0.8 },
  { x: 0.5, y: 0.92 },
];

const SEGMENT_LENGTHS: ReadonlyArray<number> = (() => {
  const lens: number[] = [];
  for (let i = 1; i < PATH_WAYPOINTS.length; i++) {
    const a = PATH_WAYPOINTS[i - 1];
    const b = PATH_WAYPOINTS[i];
    lens.push(Math.hypot(b.x - a.x, b.y - a.y));
  }
  return lens;
})();

const TOTAL_LENGTH: number = SEGMENT_LENGTHS.reduce((s, v) => s + v, 0);

export function pointAtProgress(progress: number): PathPoint {
  const clamped = Math.max(0, Math.min(1, progress));
  const target = clamped * TOTAL_LENGTH;
  let walked = 0;
  for (let i = 0; i < SEGMENT_LENGTHS.length; i++) {
    const len = SEGMENT_LENGTHS[i];
    if (walked + len >= target) {
      const t = (target - walked) / len;
      const a = PATH_WAYPOINTS[i];
      const b = PATH_WAYPOINTS[i + 1];
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      };
    }
    walked += len;
  }
  return PATH_WAYPOINTS[PATH_WAYPOINTS.length - 1];
}

export function distanceNorm(a: PathPoint, b: PathPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
