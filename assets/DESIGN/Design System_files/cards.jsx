/* FinPlay upgraded CARDS — 3 variants in real screen context */

const Coin = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <defs>
      <radialGradient id="coinG" cx="40%" cy="35%" r="65%">
        <stop offset="0" stopColor="#fde68a" />
        <stop offset="1" stopColor="#facc15" />
      </radialGradient>
    </defs>
    <circle cx="12" cy="12" r="10" fill="url(#coinG)" stroke="#854d0e" strokeWidth="1.4" />
    <text x="12" y="16" fontSize="11" fontWeight="900" textAnchor="middle" fill="#854d0e" fontFamily="Heebo">$</text>
  </svg>
);

const Gem = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M12 3 L20 10 L12 21 L4 10 Z" fill="#22d3ee" stroke="#0e7490" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M12 3 L20 10 L12 10 Z" fill="#67e8f9" />
  </svg>
);

const XPLightning = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M13 2 L4 14 H10 L9 22 L20 9 H14 Z" fill="#a78bfa" stroke="#3b1d80" strokeWidth="1" strokeLinejoin="round" />
  </svg>
);

const Heart = ({ size = 14, filled = true }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M12 21 Q3 14 3 8 Q3 3 8 3 Q11 3 12 6 Q13 3 16 3 Q21 3 21 8 Q21 14 12 21 Z"
      fill={filled ? "#ef4444" : "transparent"} stroke="#7f1d1d" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

const Lock = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11 V7 a4 4 0 0 1 8 0 v4" />
  </svg>
);

const Crown = ({ size = 14, color = "#1a1035" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M3 8 L7 14 L12 5 L17 14 L21 8 L19 19 H5 Z" fill={color} stroke={color} strokeWidth="1" strokeLinejoin="round" />
    <circle cx="3" cy="8" r="1.5" fill={color} />
    <circle cx="21" cy="8" r="1.5" fill={color} />
    <circle cx="12" cy="5" r="1.5" fill={color} />
  </svg>
);

const Sparkles = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z" fill="#facc15" />
  </svg>
);

// ─────────────────────────────────────────────
// CARD VARIANT 1 · "Mission Card" (light Stitch)
// Replaces the current generic feed item with a goal-oriented card
// that surfaces XP+Coin reward upfront, with a quest-style accent ribbon
// ─────────────────────────────────────────────
const MissionCard = () => (
  <div style={{
    background: '#fff', borderRadius: 20, overflow: 'hidden',
    boxShadow: '0 4px 14px rgba(62,60,143,0.08), 0 1px 0 rgba(192,199,212,0.6) inset',
    border: '1px solid #e0e3e5',
  }}>
    {/* gradient header strip — chapter color */}
    <div style={{
      height: 70, background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle at 80% 50%, rgba(255,255,255,0.18), transparent 50%)',
      }} />
      {/* chapter pill */}
      <div style={{
        position: 'absolute', top: 12, right: 12,
        background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(6px)',
        padding: '4px 10px', borderRadius: 999,
        fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: 0.3,
      }}>פרק 1 · הישרדות</div>
      {/* XP+coins reward chip — bottom-left */}
      <div style={{
        position: 'absolute', bottom: -14, left: 14,
        background: '#fff', borderRadius: 999,
        border: '2px solid #e0e3e5',
        padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 6,
        boxShadow: '0 2px 6px rgba(62,60,143,0.1)',
      }}>
        <XPLightning size={14} />
        <span style={{ fontSize: 12, fontWeight: 900, color: '#3b1d80', fontVariantNumeric: 'tabular-nums' }}>+40</span>
        <span style={{ width: 1, height: 12, background: '#e0e3e5' }} />
        <Coin size={14} />
        <span style={{ fontSize: 12, fontWeight: 900, color: '#854d0e', fontVariantNumeric: 'tabular-nums' }}>+120</span>
      </div>
    </div>

    {/* body */}
    <div style={{ padding: '22px 16px 14px', textAlign: 'right' }}>
      <h3 style={{
        margin: 0, fontSize: 17, fontWeight: 900, color: '#191c1e',
        lineHeight: 1.25, marginBottom: 4,
      }}>למה תקציב הוא לא מילה גסה</h3>
      <p style={{
        margin: 0, fontSize: 13, lineHeight: 1.5, color: '#404752',
        marginBottom: 14,
      }}>בשלושה צעדים פשוטים — להבין כמה נכנס, כמה יוצא, ומה נשאר בצד</p>

      {/* progress + CTA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexDirection: 'row-reverse' }}>
        <button className="duo-btn" style={{
          flex: 1, padding: '11px 16px', fontSize: 14,
          background: '#005bb1', color: '#fff',
          '--press-shadow': '#003a76',
        }}>בוא נתחיל →</button>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: '#f2f4f6', borderRadius: 999,
          padding: '6px 10px',
        }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#404752' }}>3 דק'</span>
        </div>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// CARD VARIANT 2 · "Loot Drop Card" (Clash dark + gold)
// For Shop / boost items — premium feel, gold border, animated shimmer
// ─────────────────────────────────────────────
const LootCard = ({ rarity = 'gold' }) => {
  const gradients = {
    gold: ['#d4a017', '#f5c842'],
    purple: ['#7c3aed', '#a78bfa'],
    cyan: ['#0891b2', '#22d3ee'],
  };
  const [g1, g2] = gradients[rarity];

  return (
    <div style={{
      background: `linear-gradient(135deg, ${g1}, ${g2})`,
      borderRadius: 20, padding: 2.5,
      boxShadow: `0 6px 20px ${g1}50, 0 0 0 1px rgba(255,255,255,0.1) inset`,
    }}>
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'rgba(10,22,40,0.92)', borderRadius: 17.5,
        padding: 14, textAlign: 'center',
      }}>
        {/* RARITY ribbon top-right */}
        <div style={{
          position: 'absolute', top: 8, left: 8,
          background: g1, borderRadius: 6,
          padding: '2px 8px', fontSize: 9, fontWeight: 900,
          color: rarity === 'gold' ? '#1a1035' : '#fff',
          letterSpacing: 0.8, textTransform: 'uppercase',
        }}>אגדי</div>

        {/* Item visual */}
        <div style={{
          width: 90, height: 90, margin: '8px auto 10px',
          background: `radial-gradient(circle at 50% 35%, ${g1}33 0%, transparent 70%)`,
          display: 'grid', placeItems: 'center',
          position: 'relative',
        }}>
          {/* sparkle scatter */}
          <Sparkles size={16} />
          <div style={{ position: 'absolute', top: 8, right: 12 }}><Sparkles size={10} /></div>
          <div style={{ position: 'absolute', bottom: 14, left: 8 }}><Sparkles size={8} /></div>
          {/* mega boost rocket */}
          <svg width="60" height="60" viewBox="0 0 24 24" style={{ position: 'absolute' }}>
            <defs>
              <linearGradient id="rktG" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#fb923c" />
                <stop offset="1" stopColor="#dc2626" />
              </linearGradient>
            </defs>
            <path d="M12 2 Q16 6 16 14 L14 18 H10 L8 14 Q8 6 12 2 Z" fill="url(#rktG)" stroke="#7f1d1d" strokeWidth="1.2" strokeLinejoin="round" />
            <circle cx="12" cy="9" r="2" fill="#fef3c7" stroke="#7f1d1d" strokeWidth="1" />
            <path d="M8 14 L5 17 L7 18 L9 16 Z" fill="#fb923c" stroke="#7f1d1d" strokeWidth="1" strokeLinejoin="round" />
            <path d="M16 14 L19 17 L17 18 L15 16 Z" fill="#fb923c" stroke="#7f1d1d" strokeWidth="1" strokeLinejoin="round" />
            <path d="M10 18 Q12 22 14 18 Q13 20 12 19.5 Q11 20 10 18 Z" fill="#fde047" />
          </svg>
        </div>

        <h3 style={{
          margin: 0, fontSize: 14, fontWeight: 900, color: '#fef3c7',
          marginBottom: 4, textShadow: '0 2px 4px rgba(0,0,0,0.6)',
        }}>Mega Boost</h3>
        <p style={{
          margin: 0, fontSize: 11, lineHeight: 1.4, color: '#94a8c2',
          marginBottom: 10,
        }}>XP×2 + מטבעות×2 לשעה</p>

        {/* timer + price */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexDirection: 'row-reverse' }}>
          <button className="duo-btn" style={{
            flex: 1, padding: '9px 12px', fontSize: 13,
            background: 'linear-gradient(180deg, #16a34a, #15803d)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            '--press-shadow': '#14532d',
          }}>
            <Gem size={14} /><span style={{ fontVariantNumeric: 'tabular-nums' }}>150</span>
          </button>
          <div style={{
            background: 'rgba(255,255,255,0.08)', borderRadius: 8,
            padding: '5px 8px', fontSize: 10, fontWeight: 700,
            color: '#fbf6e7', fontVariantNumeric: 'tabular-nums',
          }}>1:00</div>
        </div>

        {/* shimmer */}
        <div className="shimmer" style={{ left: '-100px' }} />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// CARD VARIANT 3 · "Achievement Tile" (compact, stat-focused)
// For profile grids — matches level rings, badges. Tap-to-detail.
// ─────────────────────────────────────────────
const AchievementTile = ({ unlocked = true, locked = false }) => (
  <div style={{
    background: unlocked ? '#fff' : '#f2f4f6',
    borderRadius: 18, padding: 12,
    border: `1.5px solid ${unlocked ? '#e9c40044' : '#e0e3e5'}`,
    boxShadow: unlocked ? '0 4px 12px rgba(233,196,0,0.15)' : 'none',
    position: 'relative', overflow: 'hidden',
    opacity: locked ? 0.55 : 1,
  }}>
    {unlocked && (
      <div style={{
        position: 'absolute', top: -20, right: -20,
        width: 70, height: 70, borderRadius: '50%',
        background: 'radial-gradient(circle, #ffe16d66, transparent 70%)',
      }} />
    )}

    {/* medal */}
    <div style={{
      width: 56, height: 56, margin: '0 auto 8px',
      borderRadius: '50%', position: 'relative',
      background: unlocked
        ? 'linear-gradient(135deg, #fde68a, #d4a017)'
        : '#e0e3e5',
      display: 'grid', placeItems: 'center',
      boxShadow: unlocked
        ? '0 0 0 3px #fff, 0 0 0 4px #d4a017, 0 4px 8px rgba(0,0,0,0.1)'
        : 'none',
    }}>
      {locked
        ? <Lock size={20} />
        : <span style={{ fontSize: 24 }}>🔥</span>
      }
    </div>

    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: 12, fontWeight: 900, color: unlocked ? '#191c1e' : '#707783',
        marginBottom: 3, lineHeight: 1.2,
      }}>שבוע של אש</div>
      <div style={{
        fontSize: 10, color: '#404752', lineHeight: 1.3,
      }}>{locked ? '7 ימים ברצף' : '7 ימי רצף'}</div>
    </div>

    {unlocked && (
      <div style={{
        marginTop: 8, paddingTop: 8, borderTop: '1px dashed #e0e3e5',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
      }}>
        <Sparkles size={10} />
        <span style={{ fontSize: 10, fontWeight: 800, color: '#735c00' }}>נפתח אתמול</span>
      </div>
    )}
  </div>
);

Object.assign(window, { MissionCard, LootCard, AchievementTile, Coin, Gem, XPLightning, Heart, Lock, Crown, Sparkles });
