// Fin.jsx — canonical FinPlay shark, drawn to match the reference image:
//   - Big rounded teardrop body, head pointing UP-LEFT, body tapering to upper-right
//   - Two-tone blue: dark blue back, lighter blue mid, pale belly
//   - Big round eyes (left smaller, partially obscured by snout), 2 white shines each
//   - Open friendly smile with one prominent fang on each side, pink tongue
//   - Two dark nostrils on the snout (left side of face)
//   - Tail fin at top-right corner, pointing up-right
//   - Front flipper bottom-left, sticking forward
//   - Small bottom tail fin near belly bottom
//   - 3 gill curves on the right cheek
//
// viewBox: 0 0 400 400 — body roughly fills 80-340 horizontally, 100-340 vertically.
// All parts are wrapped in their own group so they can be transformed individually.

const FIN = {
  // body blues — sampled from the canonical reference
  bodyDark:    "#3d6da0",   // top/back
  bodyMid:     "#5990bf",   // body main
  bodyLight:   "#84afd0",   // belly transition
  bellyMain:   "#bcd4e3",   // belly main pale
  bellyHi:     "#d8e6ef",   // belly highlight
  outline:     "#22456e",
  finDark:     "#2d5687",
  finShade:    "#3d6da0",
  finLines:    "#22456e",
  // face
  mouthOuter:  "#1a2f4a",
  mouthRed:    "#e89aa8",
  mouthPink:   "#f3b8c1",
  toothWhite:  "#fbf6e7",
  eyeWhite:    "#fbf6e7",
  eyeBlack:    "#1a2536",
  eyeShine:    "#ffffff",
  blush:       "#5990bf",
};

// ---- TAIL — top-right triangular fin ----
// Pivot ~ (320, 150)
const FinTail = () => (
  <g>
    <path
      d="M 305 175 Q 320 120 360 95 Q 365 140 350 175 Q 330 185 305 175 Z"
      fill={FIN.finDark}
      stroke={FIN.outline}
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <path
      d="M 318 165 Q 332 130 352 110"
      fill="none"
      stroke={FIN.finLines}
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.6"
    />
  </g>
);

// ---- BOTTOM TAIL FIN — small lower tail near bottom-right ----
// Pivot ~ (290, 320)
const FinBottom = () => (
  <g>
    <path
      d="M 280 305 Q 305 320 312 350 Q 285 358 268 348 Q 262 325 274 308 Z"
      fill={FIN.finDark}
      stroke={FIN.outline}
      strokeWidth="3"
      strokeLinejoin="round"
    />
  </g>
);

// ---- FLIPPER / front fin — bottom-left, sticking forward ----
// Pivot ~ (150, 270)
const FinFlipper = () => (
  <g>
    <path
      d="M 155 265 Q 110 280 88 310 Q 105 328 142 318 Q 170 305 175 280 Q 168 268 155 265 Z"
      fill={FIN.bodyLight}
      stroke={FIN.outline}
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <path
      d="M 105 308 Q 125 305 155 295"
      fill="none"
      stroke={FIN.finLines}
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.55"
    />
  </g>
);

// ---- BODY — teardrop, head up-left, tapering up-right ----
const FinBody = () => (
  <g>
    {/* main silhouette */}
    <path
      d="
        M 160 105
        Q 95 130 88 200
        Q 85 250 115 290
        Q 145 325 195 335
        Q 245 340 285 320
        Q 320 295 325 245
        Q 325 195 305 155
        Q 270 110 215 100
        Q 185 100 160 105 Z
      "
      fill={FIN.bodyMid}
      stroke={FIN.outline}
      strokeWidth="3.5"
      strokeLinejoin="round"
    />

    {/* dark back shading — covers top */}
    <path
      d="
        M 160 105
        Q 100 130 92 185
        Q 92 200 100 205
        Q 165 175 230 178
        Q 280 182 318 200
        Q 325 175 315 155
        Q 280 115 220 102
        Q 185 100 160 105 Z
      "
      fill={FIN.bodyDark}
    />

    {/* gill curves on right cheek */}
    <path d="M 240 215 Q 252 232 246 250" stroke={FIN.finLines} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.85" />
    <path d="M 254 218 Q 266 235 260 253" stroke={FIN.finLines} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.85" />
    <path d="M 268 222 Q 280 238 274 256" stroke={FIN.finLines} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.85" />

    {/* belly — pale curved area, lower-front */}
    <path
      d="
        M 100 230
        Q 90 290 130 320
        Q 180 340 230 332
        Q 270 320 295 290
        Q 260 300 215 300
        Q 165 300 100 230 Z
      "
      fill={FIN.bellyMain}
    />
    {/* belly highlight */}
    <path
      d="
        M 115 270
        Q 140 320 190 322
        Q 240 320 270 300
        Q 230 310 195 310
        Q 150 310 115 270 Z
      "
      fill={FIN.bellyHi}
      opacity="0.85"
    />
    {/* belly demarcation */}
    <path
      d="M 100 230 Q 145 268 210 268 Q 275 268 320 240"
      fill="none"
      stroke={FIN.outline}
      strokeWidth="2.2"
      strokeLinecap="round"
      opacity="0.45"
    />
  </g>
);

// ---- MOUTH ----
// Default: open friendly smile with 2 fangs and a pink tongue.
// shape: 'smile' | 'frown' | 'flat' | 'o'
const FinMouth = ({ open = 0.6, shape = "smile" }) => {
  const o = Math.max(0, Math.min(1, open));

  if (shape === "frown") {
    return (
      <path
        d="M 130 252 Q 160 232 195 245"
        fill="none"
        stroke={FIN.outline}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    );
  }
  if (shape === "flat") {
    return (
      <path
        d="M 130 245 Q 162 248 195 245"
        fill="none"
        stroke={FIN.outline}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    );
  }
  if (shape === "o") {
    return (
      <ellipse cx="160" cy="248" rx={6 + 6 * o} ry={5 + 8 * o} fill={FIN.mouthOuter} stroke={FIN.outline} strokeWidth="2.5" />
    );
  }

  // canonical open smile
  const sy = 0.4 + 0.6 * o;
  return (
    <g>
      {/* mouth interior — vertical squash by `open` amount */}
      <g transform={`translate(160 248) scale(1 ${sy}) translate(-160 -248)`}>
        {/* dark mouth opening */}
        <path
          d="
            M 125 232
            Q 155 270 198 250
            Q 195 240 180 238
            Q 150 234 125 232 Z
          "
          fill={FIN.mouthOuter}
          stroke={FIN.outline}
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        {/* pink tongue */}
        <path
          d="M 138 252 Q 158 268 188 254 Q 172 248 158 248 Q 145 248 138 252 Z"
          fill={FIN.mouthRed}
        />
        {/* tongue highlight */}
        <path
          d="M 145 254 Q 162 263 180 256"
          fill="none"
          stroke={FIN.mouthPink}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* LEFT fang */}
        <path
          d="M 134 234 L 140 248 L 146 234 Z"
          fill={FIN.toothWhite}
          stroke={FIN.outline}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        {/* RIGHT fang */}
        <path
          d="M 178 236 L 184 248 L 190 236 Z"
          fill={FIN.toothWhite}
          stroke={FIN.outline}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </g>

      {/* upper lip line */}
      <path
        d="M 122 232 Q 155 226 198 238"
        fill="none"
        stroke={FIN.outline}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.7"
      />
      {/* right corner cheek dimple */}
      <path
        d="M 198 240 Q 207 246 213 252"
        fill="none"
        stroke={FIN.outline}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </g>
  );
};

// ---- EYES — big round, with sparkly shines ----
const FinEyes = ({ blink = 0, pupilDX = 0, pupilDY = 0, eyebrow = "neutral", eyeScale = 1 }) => {
  const b = Math.max(0, Math.min(1, blink));
  const open = 1 - b;

  const browL = {
    neutral: "M 162 168 Q 178 162 195 172",
    angry:   "M 162 174 L 198 162",
    calm:    "M 160 174 Q 178 178 195 174",
    happy:   "M 162 162 Q 178 154 195 165",
    surprise:"M 162 158 Q 178 154 195 162",
  };
  const browR = {
    neutral: "M 215 172 Q 232 162 250 174",
    angry:   "M 215 162 L 252 178",
    calm:    "M 215 174 Q 232 178 250 174",
    happy:   "M 215 165 Q 232 154 250 164",
    surprise:"M 215 162 Q 232 154 250 158",
  };

  return (
    <g>
      {/* Eyebrows */}
      <path d={browL[eyebrow] || browL.neutral} fill="none" stroke={FIN.outline} strokeWidth="3.4" strokeLinecap="round" />
      <path d={browR[eyebrow] || browR.neutral} fill="none" stroke={FIN.outline} strokeWidth="3.4" strokeLinecap="round" />

      {/* LEFT eye (smaller — partially behind snout) */}
      <g transform="translate(180 195)">
        <ellipse cx="0" cy="0" rx={13 * eyeScale} ry={13 * open * eyeScale} fill={FIN.eyeWhite} stroke={FIN.outline} strokeWidth="2.4" />
        {open > 0.05 && (
          <g transform={`translate(${pupilDX} ${pupilDY})`}>
            <ellipse cx="2" cy="2" rx={8 * eyeScale} ry={8 * Math.min(1, open * 1.2) * eyeScale} fill={FIN.eyeBlack} />
            <circle cx={4.5 * eyeScale} cy={-3 * eyeScale} r={2.6 * eyeScale} fill={FIN.eyeShine} />
            <circle cx={-2 * eyeScale} cy={3.5 * eyeScale} r={1.3 * eyeScale} fill={FIN.eyeShine} />
          </g>
        )}
        {b > 0.05 && (
          <line x1={-13 * eyeScale} y1="0" x2={13 * eyeScale} y2="0" stroke={FIN.outline} strokeWidth="2.5" strokeLinecap="round" opacity={b} />
        )}
      </g>

      {/* RIGHT eye (slightly bigger) */}
      <g transform="translate(232 198)">
        <ellipse cx="0" cy="0" rx={15 * eyeScale} ry={15 * open * eyeScale} fill={FIN.eyeWhite} stroke={FIN.outline} strokeWidth="2.4" />
        {open > 0.05 && (
          <g transform={`translate(${pupilDX} ${pupilDY})`}>
            <ellipse cx="2" cy="2" rx={9.5 * eyeScale} ry={9.5 * Math.min(1, open * 1.2) * eyeScale} fill={FIN.eyeBlack} />
            <circle cx={5 * eyeScale} cy={-3 * eyeScale} r={3 * eyeScale} fill={FIN.eyeShine} />
            <circle cx={-2 * eyeScale} cy={4 * eyeScale} r={1.5 * eyeScale} fill={FIN.eyeShine} />
          </g>
        )}
        {b > 0.05 && (
          <line x1={-15 * eyeScale} y1="0" x2={15 * eyeScale} y2="0" stroke={FIN.outline} strokeWidth="2.5" strokeLinecap="round" opacity={b} />
        )}
      </g>
    </g>
  );
};

// Nostrils — two dots on the snout (left side)
const FinNostrils = () => (
  <g>
    <ellipse cx="115" cy="218" rx="3" ry="4.5" fill={FIN.outline} />
    <ellipse cx="130" cy="214" rx="3" ry="4.5" fill={FIN.outline} />
  </g>
);

const FinBlush = ({ opacity = 0 }) => (
  <g opacity={opacity}>
    <ellipse cx="155" cy="232" rx="11" ry="5" fill={FIN.blush} />
    <ellipse cx="225" cy="234" rx="11" ry="5" fill={FIN.blush} />
  </g>
);

// ---- COMPOSITE FIN ----
const Fin = ({
  body = { tx: 0, ty: 0, rot: 0, sx: 1, sy: 1 },
  tail = { rot: 0 },
  dorsal = { rot: 0 },           // unused but kept for compat
  flipper = { rot: 0 },
  bottomFin = { rot: 0 },
  mouthOpen = 0.6,
  mouthShape = "smile",
  blink = 0,
  pupilDX = 0,
  pupilDY = 0,
  eyebrow = "neutral",
  eyeScale = 1,
  blushOpacity = 0,
}) => {
  const rotAt = (deg, cx, cy) => `rotate(${deg} ${cx} ${cy})`;
  return (
    <g
      transform={
        `translate(${body.tx} ${body.ty}) ` +
        `translate(205 220) ` +
        `rotate(${body.rot}) ` +
        `scale(${body.sx} ${body.sy}) ` +
        `translate(-205 -220)`
      }
    >
      <g transform={rotAt(tail.rot, 320, 150)}><FinTail /></g>
      <g transform={rotAt(bottomFin.rot, 290, 320)}><FinBottom /></g>
      <FinBody />
      <g transform={rotAt(flipper.rot, 150, 270)}><FinFlipper /></g>
      <FinNostrils />
      <FinBlush opacity={blushOpacity} />
      <FinMouth open={mouthOpen} shape={mouthShape} />
      <FinEyes blink={blink} pupilDX={pupilDX} pupilDY={pupilDY} eyebrow={eyebrow} eyeScale={eyeScale} />
    </g>
  );
};

Object.assign(window, {
  Fin, FinBody, FinTail, FinFlipper, FinBottom, FinMouth, FinEyes, FinNostrils, FinBlush,
  FIN_COLORS: FIN,
});
