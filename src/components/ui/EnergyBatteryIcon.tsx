import Svg, { Defs, LinearGradient, Stop, Rect, Path, ClipPath, G } from 'react-native-svg';
import { ENERGY, ENERGY_BOLT_PATH } from '../../features/energy/energyTheme';

/**
 * THE canonical energy battery — Duolingo-style rounded battery + white
 * lightning bolt, in the signature PURPLE. Single source of truth for every
 * battery visual in the app (header pill, power-station card, in-lesson bar,
 * depletion modal, shop). Never re-draw a battery elsewhere — render this.
 *
 * `level` (0..1) fills the interior so the SAME component serves as both the
 * static brand mark (level=1, default) and a live meter. Fill flows from the
 * RIGHT edge (RTL), so a draining battery empties leftward like the rest of the
 * RTL UI.
 */
export function EnergyBatteryIcon({
  size = 24,
  level = 1,
  showBolt = true,
}: {
  /** width in px; height is derived from the 100×84 aspect ratio */
  size?: number;
  /** 0..1 interior fill. 1 = full purple brand mark. */
  level?: number;
  /** hide the bolt for a pure gauge look (default: show) */
  showBolt?: boolean;
}) {
  const w = size;
  const h = (size * 84) / 100;
  const clamped = Math.max(0, Math.min(1, level));
  // Body interior spans x:4..84 (width 80). RTL: fill anchored to the right.
  const bodyX = 4;
  const bodyW = 80;
  const fillW = bodyW * clamped;
  const fillX = bodyX + (bodyW - fillW);

  return (
    <Svg width={w} height={h} viewBox="0 0 100 84" fill="none">
      <Defs>
        <LinearGradient id="energyFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={ENERGY.base} />
          <Stop offset="1" stopColor={ENERGY.deep} />
        </LinearGradient>
        <ClipPath id="bodyClip">
          <Rect x={bodyX} y={12} width={bodyW} height={60} rx={18} ry={18} />
        </ClipPath>
      </Defs>

      {/* Empty track (only visible when not full) */}
      <Rect x={bodyX} y={12} width={bodyW} height={60} rx={18} ry={18} fill={ENERGY.track} />

      {/* Purple fill, clipped to the rounded body, anchored right (RTL) */}
      {clamped > 0 && (
        <G clipPath="url(#bodyClip)">
          <Rect x={fillX} y={12} width={fillW} height={60} fill="url(#energyFill)" />
          {/* top glass shine */}
          <Rect x={fillX} y={16} width={fillW} height={12} rx={6} fill={ENERGY.bolt} opacity={0.22} />
        </G>
      )}

      {/* Body outline */}
      <Rect
        x={bodyX}
        y={12}
        width={bodyW}
        height={60}
        rx={18}
        ry={18}
        fill="none"
        stroke={ENERGY.deep}
        strokeWidth={4}
        opacity={clamped >= 1 ? 0 : 0.9}
      />

      {/* Positive terminal nub (right side) */}
      <Rect x={88} y={30} width={8} height={24} rx={4} ry={4} fill={ENERGY.deep} />

      {/* Lightning bolt */}
      {showBolt && <Path d={ENERGY_BOLT_PATH} fill={ENERGY.bolt} />}
    </Svg>
  );
}