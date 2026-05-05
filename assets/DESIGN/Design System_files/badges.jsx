/* FinPlay upgraded BADGES & PILLS — 3 variants */

// VARIANT 1 · "Currency Pill Cluster" — header bar showing all 3 currencies at a glance
// Replaces 3 separate icons with a single tight cluster matching the existing GlobalWealthHeader feel.
const CurrencyCluster = ({ xp = 1240, coins = 8420, gems = 24, hearts = 4, maxHearts = 5 }) => (
  <div style={{
    display: 'flex', gap: 6, alignItems: 'center', flexDirection: 'row-reverse',
    background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)',
    borderRadius: 999, padding: 4,
    border: '1px solid #e0e3e5',
    boxShadow: '0 2px 8px rgba(62,60,143,0.08)',
  }}>
    {/* Hearts */}
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4, flexDirection: 'row-reverse',
      padding: '4px 8px', borderRadius: 999,
      background: '#fee2e2',
    }}>
      <Heart size={12} />
      <span style={{ fontSize: 11, fontWeight: 900, color: '#991b1b', fontVariantNumeric: 'tabular-nums' }}>{hearts}/{maxHearts}</span>
    </div>
    {/* Gems */}
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4, flexDirection: 'row-reverse',
      padding: '4px 8px', borderRadius: 999,
      background: '#cffafe',
    }}>
      <Gem size={12} />
      <span style={{ fontSize: 11, fontWeight: 900, color: '#0e7490', fontVariantNumeric: 'tabular-nums' }}>{gems}</span>
    </div>
    {/* Coins */}
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4, flexDirection: 'row-reverse',
      padding: '4px 8px', borderRadius: 999,
      background: '#fef3c7',
    }}>
      <Coin size={12} />
      <span style={{ fontSize: 11, fontWeight: 900, color: '#854d0e', fontVariantNumeric: 'tabular-nums' }}>{coins.toLocaleString()}</span>
    </div>
    {/* XP — flat at end (RTL: leftmost = least important visually) */}
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4, flexDirection: 'row-reverse',
      padding: '4px 10px 4px 8px', borderRadius: 999,
      background: 'linear-gradient(135deg, #c3c0ff, #a78bfa)',
    }}>
      <XPLightning size={12} />
      <span style={{ fontSize: 11, fontWeight: 900, color: '#3e3c8f', fontVariantNumeric: 'tabular-nums' }}>{xp.toLocaleString()}</span>
    </div>
  </div>
);

// VARIANT 2 · Achievement pills — semantic, with state
// Currently FinPlay has the basic ProBadge crown. This expands to a full state vocabulary.
const AchievementPill = ({ kind, count }) => {
  const variants = {
    streak: { bg: 'linear-gradient(135deg, #fed7aa, #fdba74)', border: '#f97316', text: '#9a3412', icon: '🔥', label: `${count} ימים` },
    pro: { bg: 'linear-gradient(135deg, #facc15, #f59e0b)', border: '#ca8a04', text: '#1a1035', icon: <Crown size={12} />, label: 'PRO' },
    new: { bg: '#dcfce7', border: '#16a34a', text: '#14532d', icon: '✨', label: 'חדש' },
    locked: { bg: '#f2f4f6', border: '#c0c7d4', text: '#707783', icon: <Lock size={11} />, label: 'נעול' },
    elite: { bg: 'linear-gradient(135deg, #a78bfa, #7c3aed)', border: '#5b21b6', text: '#fff', icon: '💎', label: 'ELITE' },
    chapter: { bg: 'linear-gradient(135deg, #93c5fd, #3b82f6)', border: '#1d4ed8', text: '#fff', icon: '📘', label: `פרק ${count}` },
  };
  const v = variants[kind];
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, flexDirection: 'row-reverse',
      background: v.bg, border: `1.5px solid ${v.border}`,
      padding: '4px 10px', borderRadius: 999,
      fontSize: 11, fontWeight: 900, color: v.text,
      boxShadow: kind === 'elite' || kind === 'pro' ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
    }}>
      {typeof v.icon === 'string' ? <span style={{ fontSize: 12 }}>{v.icon}</span> : v.icon}
      <span style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: kind === 'pro' || kind === 'elite' ? 0.6 : 0 }}>{v.label}</span>
    </div>
  );
};

// VARIANT 3 · Avatar frame with level + status
// For leaderboards / friends — combines avatar, level number, online/active state
const AvatarFrame = ({ level = 4, online = true, name = "מאיה כ.", initial = "מ" }) => (
  <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
    <div style={{ position: 'relative', width: 56, height: 56 }}>
      {/* level ring */}
      <svg width="56" height="56" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
        <defs>
          <linearGradient id="avRingG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e9c400" />
            <stop offset="1" stopColor="#d4a017" />
          </linearGradient>
        </defs>
        <circle cx="28" cy="28" r="24" fill="none" stroke="url(#avRingG)" strokeWidth="3" strokeDasharray="2 4" />
      </svg>
      {/* avatar */}
      <div style={{
        position: 'absolute', inset: 4,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #9ccee6, #005bb1)',
        display: 'grid', placeItems: 'center',
        color: '#fff', fontSize: 22, fontWeight: 900,
      }}>{initial}</div>
      {/* level chip */}
      <div style={{
        position: 'absolute', bottom: -2, right: -2,
        background: '#e9c400', color: '#1a1035',
        width: 22, height: 22, borderRadius: '50%',
        display: 'grid', placeItems: 'center',
        fontSize: 11, fontWeight: 900,
        border: '2px solid #fff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
      }}>{level}</div>
      {/* online dot */}
      {online && (
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: 12, height: 12, borderRadius: '50%',
          background: '#16a34a', border: '2px solid #fff',
        }} />
      )}
    </div>
    <div style={{ fontSize: 11, fontWeight: 800, color: '#191c1e', textAlign: 'center', maxWidth: 60, lineHeight: 1.1 }}>{name}</div>
  </div>
);

Object.assign(window, { CurrencyCluster, AchievementPill, AvatarFrame });
