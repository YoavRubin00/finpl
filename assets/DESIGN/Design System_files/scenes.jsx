// scenes.jsx — Shark watering animation scenes

// Watering can — drawn as simple SVG, held by the shark's "hand" area.
// Sized to feel proportional to the shark (~80px wide).
function WateringCan({ tilt = 0 }) {
  // tilt in degrees, 0 = upright, positive = pouring forward
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" style={{
      transform: `rotate(${tilt}deg)`,
      transformOrigin: '60px 70px',
      transition: 'none',
      overflow: 'visible',
    }}>
      {/* Spout */}
      <path d="M 30 55 Q 12 50 4 38 L 8 32 Q 22 42 36 48 Z" fill="#7a8a99" stroke="#4a5560" strokeWidth="1.5" strokeLinejoin="round"/>
      {/* Spout rose (sprinkler head) */}
      <ellipse cx="6" cy="35" rx="5" ry="4" fill="#5a6975" stroke="#3a4550" strokeWidth="1.5"/>
      <circle cx="4" cy="34" r="0.8" fill="#2a3540"/>
      <circle cx="7" cy="33" r="0.8" fill="#2a3540"/>
      <circle cx="6" cy="37" r="0.8" fill="#2a3540"/>
      <circle cx="9" cy="35" r="0.8" fill="#2a3540"/>
      {/* Body */}
      <path d="M 30 45 L 90 45 Q 96 45 95 52 L 90 88 Q 88 94 82 94 L 38 94 Q 32 94 30 88 L 25 52 Q 24 45 30 45 Z" fill="#8fa3b3" stroke="#4a5560" strokeWidth="1.8" strokeLinejoin="round"/>
      {/* Body shading */}
      <path d="M 30 45 L 90 45 Q 96 45 95 52 L 93 60 L 27 60 L 25 52 Q 24 45 30 45 Z" fill="#a8bcc9" opacity="0.6"/>
      {/* Top opening */}
      <ellipse cx="60" cy="45" rx="30" ry="5" fill="#3a4550" stroke="#2a3540" strokeWidth="1.5"/>
      <ellipse cx="60" cy="44" rx="28" ry="3.5" fill="#1a2530"/>
      {/* Handle (top arc) */}
      <path d="M 45 45 Q 60 22 78 45" fill="none" stroke="#4a5560" strokeWidth="4.5" strokeLinecap="round"/>
      <path d="M 45 45 Q 60 22 78 45" fill="none" stroke="#7a8a99" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Side handle */}
      <path d="M 90 55 Q 102 60 100 78 Q 98 88 90 86" fill="none" stroke="#4a5560" strokeWidth="4" strokeLinecap="round"/>
      <path d="M 90 55 Q 102 60 100 78 Q 98 88 90 86" fill="none" stroke="#7a8a99" strokeWidth="2" strokeLinecap="round"/>
      {/* Highlight */}
      <path d="M 35 52 Q 38 65 42 80" fill="none" stroke="#c8d8e3" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
    </svg>
  );
}

// A single droplet that streams down from the spout.
function Droplet({ delay = 0, x = 0 }) {
  const time = useTime();
  // Each droplet runs on a 0.7s loop, offset by `delay`
  const cycle = 0.85;
  const localT = ((time - delay) % cycle + cycle) % cycle;
  const t = localT / cycle;

  // Falls from y=0 to y=200, slight horizontal drift
  const y = t * 240;
  const opacity = t < 0.05 ? t / 0.05 : t > 0.85 ? (1 - t) / 0.15 : 1;
  const scale = 0.6 + 0.4 * Math.sin(t * Math.PI);

  return (
    <div style={{
      position: 'absolute',
      left: x, top: y,
      width: 8, height: 14,
      opacity,
      transform: `scale(${scale})`,
      pointerEvents: 'none',
    }}>
      <svg width="8" height="14" viewBox="0 0 8 14">
        <path d="M 4 1 Q 7 7 7 10 Q 7 13 4 13 Q 1 13 1 10 Q 1 7 4 1 Z"
          fill="#6cb8e8" stroke="#4a9bd1" strokeWidth="0.8" opacity="0.9"/>
        <ellipse cx="3" cy="6" rx="0.8" ry="2" fill="#b8e0f5" opacity="0.8"/>
      </svg>
    </div>
  );
}

// A continuous water stream connecting spout to ground — soft blue tube.
function WaterStream({ active = 0 }) {
  // active is 0..1 — fade in/out
  if (active <= 0) return null;
  return (
    <svg width="40" height="240" viewBox="0 0 40 240" style={{
      position: 'absolute',
      left: 0, top: 0,
      opacity: active,
      pointerEvents: 'none',
    }}>
      <defs>
        <linearGradient id="streamGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8ed0f5" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#4a9bd1" stopOpacity="0.5"/>
        </linearGradient>
      </defs>
      <path
        d="M 16 0 Q 14 80 18 160 Q 22 200 20 240"
        fill="none"
        stroke="url(#streamGrad)"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M 16 0 Q 14 80 18 160 Q 22 200 20 240"
        fill="none"
        stroke="#cfeaf9"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

// Small splash circles where the water lands.
function Splash({ active = 0 }) {
  const time = useTime();
  if (active <= 0) return null;
  const ring1 = (time * 1.4) % 1;
  const ring2 = ((time * 1.4) + 0.5) % 1;
  return (
    <div style={{
      position: 'absolute',
      left: -30, top: 220,
      width: 100, height: 30,
      opacity: active,
      pointerEvents: 'none',
    }}>
      <svg width="100" height="30" viewBox="0 0 100 30" style={{ overflow: 'visible' }}>
        {[ring1, ring2].map((r, i) => (
          <ellipse
            key={i}
            cx="50" cy="15"
            rx={6 + r * 28}
            ry={1.5 + r * 5}
            fill="none"
            stroke="#6cb8e8"
            strokeWidth={1.5 * (1 - r)}
            opacity={(1 - r) * 0.7}
          />
        ))}
      </svg>
    </div>
  );
}

// The shark sprite — uses the original webp, animated as a whole.
function SharkScene() {
  const time = useTime();
  const duration = 6;
  const t = (time % duration) / duration; // 0..1 loop

  // ── Position: drift in from left, settle ──
  const enterDur = 0.18; // first 18% = entry
  const enterT = Math.min(1, t / enterDur);
  const enterEase = Easing.easeOutCubic(enterT);
  const baseX = -200 + 200 * enterEase; // -200 → 0

  // ── Bobbing (continuous gentle vertical) ──
  const bob = Math.sin(time * 1.6) * 8;

  // ── Anticipation + pour cycle ──
  // 0.0–0.18 : enter
  // 0.18–0.32: anticipation (lean back, lift can)
  // 0.32–0.78: pour (lean forward, water flows)
  // 0.78–1.0 : settle back

  let bodyTilt = 0;
  let bodyShiftY = 0;
  let canTilt = 0;
  let canLift = 0;
  let waterActive = 0;

  if (t < 0.18) {
    // entry
    bodyTilt = -2 * enterEase;
  } else if (t < 0.32) {
    // anticipation
    const lt = (t - 0.18) / (0.32 - 0.18);
    const e = Easing.easeOutCubic(lt);
    bodyTilt = -2 - 6 * e;        // tilt back
    canLift = -8 * e;
    canTilt = -8 * e;             // tip can away
  } else if (t < 0.78) {
    // pour
    const lt = (t - 0.32) / (0.78 - 0.32);
    const eIn = Easing.easeOutCubic(Math.min(1, lt * 4));    // quick tilt forward
    const eOut = Easing.easeInCubic(Math.max(0, (lt - 0.85) / 0.15));
    bodyTilt = -8 + 16 * eIn - 4 * eOut;       // -8 → +8 → +4
    bodyShiftY = 4 * eIn;
    canTilt = -8 + 78 * eIn;                   // tip into pour
    canLift = -8 + 14 * eIn;
    // water on during the bulk of pour
    if (lt > 0.18 && lt < 0.92) {
      const fadeIn = Math.min(1, (lt - 0.18) / 0.08);
      const fadeOut = Math.min(1, (0.92 - lt) / 0.08);
      waterActive = Math.min(fadeIn, fadeOut);
    }
  } else {
    // settle back
    const lt = (t - 0.78) / 0.22;
    const e = Easing.easeInOutCubic(lt);
    bodyTilt = 4 - 4 * e;
    canTilt = 70 - 70 * e;
    canLift = 6 - 6 * e;
  }

  // Subtle breathing scale
  const breath = 1 + Math.sin(time * 2.2) * 0.012;

  // Shark image dimensions
  const SHARK_W = 380;
  const SHARK_H = 380;
  const stageW = 1280;
  const stageH = 720;
  const sharkX = stageW / 2 - SHARK_W / 2 + baseX * 0.3;
  const sharkY = stageH / 2 - SHARK_H / 2 + bob + bodyShiftY;

  // Watering can position relative to shark (shark's right hand area)
  // Shark image: right "hand" / fin appears near lower-right
  const canOffsetX = 215;  // relative to shark top-left
  const canOffsetY = 165 + canLift;

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* Soft ground shadow under shark */}
      <div style={{
        position: 'absolute',
        left: stageW / 2 - 140 + baseX * 0.3,
        top: stageH / 2 + SHARK_H / 2 - 30 + bob * 0.3,
        width: 280, height: 32,
        background: 'radial-gradient(ellipse at center, rgba(40,60,90,0.18) 0%, rgba(40,60,90,0) 70%)',
        pointerEvents: 'none',
      }}/>

      {/* Shark + watering can group */}
      <div style={{
        position: 'absolute',
        left: sharkX,
        top: sharkY,
        width: SHARK_W,
        height: SHARK_H,
        transform: `rotate(${bodyTilt}deg) scale(${breath})`,
        transformOrigin: '50% 70%',
        willChange: 'transform',
      }}>
        {/* Shark image */}
        <img
          src="assets/shark.webp"
          alt="shark"
          style={{
            width: '100%', height: '100%',
            display: 'block',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        />

        {/* Watering can — positioned near shark's lower-right "hand" */}
        <div style={{
          position: 'absolute',
          left: canOffsetX,
          top: canOffsetY,
          width: 120,
          height: 120,
          willChange: 'transform',
        }}>
          <WateringCan tilt={canTilt}/>

          {/* Water stream from spout — spout is at can's left side */}
          <div style={{
            position: 'absolute',
            // Spout tip in can-local: ~(4, 35), but rotated by canTilt
            // Simplification: place stream container at fixed offset
            // and let it be visible only when waterActive > 0
            left: -8,
            top: 32,
            transform: `rotate(${canTilt * 0.6}deg)`,
            transformOrigin: 'top left',
          }}>
            <WaterStream active={waterActive}/>
            {/* Droplets */}
            <Droplet delay={0} x={14}/>
            <Droplet delay={0.2} x={18}/>
            <Droplet delay={0.45} x={12}/>
            <Droplet delay={0.65} x={20}/>
          </div>
        </div>
      </div>

      {/* Splash at the bottom where the water lands (in stage coords) */}
      <div style={{
        position: 'absolute',
        left: sharkX + canOffsetX - 30,
        top: sharkY + canOffsetY + 220,
      }}>
        <Splash active={waterActive}/>
      </div>
    </div>
  );
}

// Time tracker for data-screen-label (1s ticks)
function TimestampLabel() {
  const time = useTime();
  React.useEffect(() => {
    const root = document.querySelector('[data-anim-root]');
    if (root) {
      const sec = Math.floor(time);
      root.setAttribute('data-screen-label', `t=${sec}s`);
    }
  }, [Math.floor(time)]);
  return null;
}

Object.assign(window, { WateringCan, Droplet, WaterStream, Splash, SharkScene, TimestampLabel });
