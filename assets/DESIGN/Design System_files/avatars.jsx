/* FinPlay AVATAR MASCOTS — flat geometric in app's design language.
   ONE mascot identity ("Pip" — round blue coin-creature) shown with
   different props and accessories that map to financial archetypes.
   All in pure SVG, no raster, no realistic shading. Matches the visual
   DNA of Coin/Gem/Crown icons in cards.jsx. */

// ─────────────────────────────────────────────
// Base mascot body — round head with two eyes + smile.
// All variants compose on top of this.
// Color tokens follow the app: primary #005bb1, gold #d4a017,
// cyan #22d3ee, purple #a78bfa, green #16a34a.
// ─────────────────────────────────────────────

const AvatarBase = ({
  size = 120,
  bodyColor = '#3b82f6',
  bodyDark = '#1e3a8a',
  bellyColor = '#dbeafe',
  expression = 'happy',     // happy | focused | wink | smug | sleepy
  prop = null,              // SVG element to overlay (the archetype's tool)
  accessory = null,         // SVG element rendered on/around the head
  bgColor = '#0d2847',      // circle background — Clash dark by default
  bgPattern = 'diamond',    // diamond | rays | none | light
  border = true,
  glow = false,
}) => {
  const eyes = {
    happy:   <g><circle cx="42" cy="48" r="4" fill="#0a1628" /><circle cx="58" cy="48" r="4" fill="#0a1628" /><circle cx="43" cy="47" r="1.4" fill="#fff" /><circle cx="59" cy="47" r="1.4" fill="#fff" /></g>,
    focused: <g><rect x="38" y="46" width="8" height="3" rx="1.5" fill="#0a1628" /><rect x="54" y="46" width="8" height="3" rx="1.5" fill="#0a1628" /></g>,
    wink:    <g><circle cx="42" cy="48" r="4" fill="#0a1628" /><circle cx="43" cy="47" r="1.4" fill="#fff" /><path d="M53 48 Q58 45 63 48" stroke="#0a1628" strokeWidth="2.5" fill="none" strokeLinecap="round" /></g>,
    smug:    <g><path d="M37 49 Q42 46 47 49" stroke="#0a1628" strokeWidth="2.5" fill="none" strokeLinecap="round" /><path d="M53 49 Q58 46 63 49" stroke="#0a1628" strokeWidth="2.5" fill="none" strokeLinecap="round" /></g>,
    sleepy:  <g><path d="M37 49 Q42 51 47 49" stroke="#0a1628" strokeWidth="2.5" fill="none" strokeLinecap="round" /><path d="M53 49 Q58 51 63 49" stroke="#0a1628" strokeWidth="2.5" fill="none" strokeLinecap="round" /><circle cx="68" cy="42" r="2" fill="#a78bfa" /><circle cx="72" cy="36" r="1.2" fill="#a78bfa" /></g>,
  };

  const mouths = {
    happy:   <path d="M44 58 Q50 64 56 58" stroke="#0a1628" strokeWidth="2.5" fill="#1e3a8a" strokeLinecap="round" strokeLinejoin="round" />,
    focused: <path d="M45 60 L55 60" stroke="#0a1628" strokeWidth="2.5" fill="none" strokeLinecap="round" />,
    wink:    <path d="M44 58 Q50 64 56 58" stroke="#0a1628" strokeWidth="2.5" fill="#1e3a8a" strokeLinecap="round" strokeLinejoin="round" />,
    smug:    <path d="M44 60 Q50 56 56 60" stroke="#0a1628" strokeWidth="2.5" fill="none" strokeLinecap="round" />,
    sleepy:  <path d="M46 60 Q50 62 54 60" stroke="#0a1628" strokeWidth="2.5" fill="none" strokeLinecap="round" />,
  };

  const patterns = {
    diamond: (
      <pattern id="avBgDiamond" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
        <rect width="12" height="12" fill={bgColor} />
        <path d="M6 0 L12 6 L6 12 L0 6 Z" fill="rgba(42,90,140,0.18)" />
      </pattern>
    ),
    rays: (
      <radialGradient id="avBgRays" cx="50%" cy="50%" r="60%">
        <stop offset="0" stopColor="#1a3a5c" />
        <stop offset="1" stopColor={bgColor} />
      </radialGradient>
    ),
    light: null,
    none: null,
  };

  const bgFill = bgPattern === 'diamond' ? 'url(#avBgDiamond)'
    : bgPattern === 'rays' ? 'url(#avBgRays)'
    : bgPattern === 'light' ? '#f7f9fb'
    : bgColor;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100"
      style={glow ? { filter: 'drop-shadow(0 0 8px rgba(34,211,238,0.6))' } : {}}>
      <defs>
        {patterns[bgPattern]}
        <linearGradient id="avBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={bodyColor} />
          <stop offset="1" stopColor={bodyDark} />
        </linearGradient>
        <clipPath id="avClip"><circle cx="50" cy="50" r="48" /></clipPath>
      </defs>

      {/* circular bg */}
      <circle cx="50" cy="50" r="48" fill={bgFill} />
      {border && <circle cx="50" cy="50" r="48" fill="none" stroke={bgPattern === 'light' ? '#e0e3e5' : '#d4a017'} strokeWidth="2" />}

      <g clipPath="url(#avClip)">
        {/* Body — chubby teardrop coming up from below */}
        <ellipse cx="50" cy="92" rx="34" ry="22" fill="url(#avBody)" stroke="#0a1628" strokeWidth="1.8" />

        {/* Head — round dome */}
        <circle cx="50" cy="46" r="26" fill="url(#avBody)" stroke="#0a1628" strokeWidth="1.8" />

        {/* Belly highlight on body */}
        <ellipse cx="50" cy="86" rx="20" ry="13" fill={bellyColor} opacity="0.7" />

        {/* Cheeks blush */}
        <circle cx="34" cy="56" r="3.5" fill="#fb7185" opacity="0.6" />
        <circle cx="66" cy="56" r="3.5" fill="#fb7185" opacity="0.6" />

        {/* Tiny arms — just little nubs sticking out */}
        <ellipse cx="22" cy="80" rx="6" ry="9" fill="url(#avBody)" stroke="#0a1628" strokeWidth="1.5" transform="rotate(-15 22 80)" />
        <ellipse cx="78" cy="80" rx="6" ry="9" fill="url(#avBody)" stroke="#0a1628" strokeWidth="1.5" transform="rotate(15 78 80)" />

        {/* Face */}
        {eyes[expression]}
        {mouths[expression]}

        {/* Prop sits in front, often near the hands */}
        {prop}

        {/* Accessory on top of head */}
        {accessory}
      </g>
    </svg>
  );
};

// ─────────────────────────────────────────────
// PROPS — financial archetype tools the mascot holds
// ─────────────────────────────────────────────

const PropCoin = (
  <g transform="translate(50 78)">
    <circle cx="0" cy="0" r="11" fill="#fde68a" stroke="#0a1628" strokeWidth="1.8" />
    <circle cx="0" cy="0" r="8" fill="none" stroke="#854d0e" strokeWidth="1" />
    <text x="0" y="4" fontSize="11" fontWeight="900" textAnchor="middle" fill="#854d0e" fontFamily="Heebo">$</text>
  </g>
);

const PropBook = (
  <g transform="translate(50 80)">
    {/* open book */}
    <path d="M-14 -2 L0 -5 L0 7 L-14 9 Z" fill="#fbbf24" stroke="#0a1628" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M14 -2 L0 -5 L0 7 L14 9 Z" fill="#f59e0b" stroke="#0a1628" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M0 -5 L0 7" stroke="#0a1628" strokeWidth="1.4" />
    <path d="M-10 0 L-3 -1" stroke="#7c2d12" strokeWidth="0.8" />
    <path d="M-10 3 L-3 2" stroke="#7c2d12" strokeWidth="0.8" />
    <path d="M3 -1 L10 0" stroke="#7c2d12" strokeWidth="0.8" />
    <path d="M3 2 L10 3" stroke="#7c2d12" strokeWidth="0.8" />
  </g>
);

const PropPiggy = (
  <g transform="translate(50 82)">
    <ellipse cx="0" cy="0" rx="14" ry="10" fill="#f9a8d4" stroke="#0a1628" strokeWidth="1.6" />
    <circle cx="-9" cy="-2" r="1.2" fill="#0a1628" />
    <ellipse cx="-12" cy="2" rx="2.5" ry="2" fill="#fbcfe8" stroke="#0a1628" strokeWidth="1" />
    <circle cx="-13" cy="2" r="0.6" fill="#0a1628" />
    <circle cx="-11" cy="2" r="0.6" fill="#0a1628" />
    <path d="M8 -8 L9 -5" stroke="#0a1628" strokeWidth="1.4" strokeLinecap="round" />
    {/* coin slot */}
    <rect x="-2" y="-8" width="4" height="1.5" rx="0.5" fill="#0a1628" />
    {/* legs */}
    <rect x="-9" y="9" width="3" height="3" fill="#0a1628" />
    <rect x="6" y="9" width="3" height="3" fill="#0a1628" />
  </g>
);

const PropTablet = (
  <g transform="translate(50 80)">
    <rect x="-12" y="-9" width="24" height="16" rx="2" fill="#0d2847" stroke="#0a1628" strokeWidth="1.6" />
    {/* chart */}
    <polyline points="-9,3 -5,0 -1,-2 3,-5 7,-1 9,-4" stroke="#22d3ee" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="7" cy="-1" r="1.2" fill="#fbbf24" />
  </g>
);

const PropShield = (
  <g transform="translate(50 80)">
    <path d="M0 -10 L11 -7 L10 3 Q5 10 0 12 Q-5 10 -10 3 L-11 -7 Z"
      fill="#1e3a8a" stroke="#0a1628" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M0 -10 L11 -7 L0 -7 Z" fill="#3b82f6" />
    <text x="0" y="3" fontSize="10" fontWeight="900" textAnchor="middle" fill="#fbbf24" fontFamily="Heebo">$</text>
  </g>
);

const PropRocket = (
  <g transform="translate(50 80) rotate(-20)">
    <path d="M0 -12 Q4 -8 4 4 L2 8 H-2 L-4 4 Q-4 -8 0 -12 Z" fill="#dc2626" stroke="#0a1628" strokeWidth="1.4" strokeLinejoin="round" />
    <circle cx="0" cy="-4" r="2" fill="#fef3c7" stroke="#0a1628" strokeWidth="1" />
    <path d="M-4 4 L-7 7 L-5 8 L-3 6 Z" fill="#fb923c" stroke="#0a1628" strokeWidth="1" strokeLinejoin="round" />
    <path d="M4 4 L7 7 L5 8 L3 6 Z" fill="#fb923c" stroke="#0a1628" strokeWidth="1" strokeLinejoin="round" />
    <path d="M-2 8 Q0 12 2 8 Q1 11 0 10.5 Q-1 11 -2 8 Z" fill="#fde047" />
  </g>
);

const PropPlant = (
  <g transform="translate(50 82)">
    {/* pot */}
    <path d="M-9 2 L9 2 L7 10 L-7 10 Z" fill="#92400e" stroke="#0a1628" strokeWidth="1.6" strokeLinejoin="round" />
    <rect x="-10" y="0" width="20" height="3" rx="1" fill="#7c2d12" stroke="#0a1628" strokeWidth="1.2" />
    {/* stem */}
    <path d="M0 2 L0 -10" stroke="#15803d" strokeWidth="2" strokeLinecap="round" />
    {/* leaves */}
    <ellipse cx="-5" cy="-6" rx="5" ry="3" fill="#16a34a" stroke="#0a1628" strokeWidth="1.4" transform="rotate(-30 -5 -6)" />
    <ellipse cx="5" cy="-9" rx="5" ry="3" fill="#22c55e" stroke="#0a1628" strokeWidth="1.4" transform="rotate(30 5 -9)" />
    {/* coin growing on top */}
    <circle cx="0" cy="-13" r="4" fill="#fde68a" stroke="#0a1628" strokeWidth="1.3" />
    <text x="0" y="-11" fontSize="5" fontWeight="900" textAnchor="middle" fill="#854d0e" fontFamily="Heebo">$</text>
  </g>
);

const PropChart = (
  <g transform="translate(50 80)">
    {/* bar chart */}
    <rect x="-12" y="-2" width="4" height="10" fill="#22d3ee" stroke="#0a1628" strokeWidth="1.4" />
    <rect x="-6" y="-6" width="4" height="14" fill="#a78bfa" stroke="#0a1628" strokeWidth="1.4" />
    <rect x="0" y="-10" width="4" height="18" fill="#16a34a" stroke="#0a1628" strokeWidth="1.4" />
    <rect x="6" y="-13" width="4" height="21" fill="#fbbf24" stroke="#0a1628" strokeWidth="1.4" />
    {/* arrow */}
    <path d="M-12 -4 L10 -16 L7 -14 M10 -16 L8 -13" stroke="#dc2626" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </g>
);

const PropGlobe = (
  <g transform="translate(50 80)">
    <circle cx="0" cy="0" r="11" fill="#22d3ee" stroke="#0a1628" strokeWidth="1.6" />
    {/* continents */}
    <path d="M-7 -3 Q-4 -6 -1 -4 Q-3 -1 -6 0 Z" fill="#16a34a" stroke="#0a1628" strokeWidth="1" />
    <path d="M2 1 Q5 -1 8 1 Q7 4 4 5 Q1 4 2 1 Z" fill="#16a34a" stroke="#0a1628" strokeWidth="1" />
    <path d="M-3 5 Q0 4 3 7 Q0 8 -2 7 Z" fill="#16a34a" stroke="#0a1628" strokeWidth="1" />
    {/* meridian */}
    <ellipse cx="0" cy="0" rx="11" ry="5" fill="none" stroke="#0a1628" strokeWidth="0.7" opacity="0.5" />
    <line x1="0" y1="-11" x2="0" y2="11" stroke="#0a1628" strokeWidth="0.7" opacity="0.5" />
  </g>
);

const PropChess = (
  <g transform="translate(50 80)">
    {/* king piece */}
    <path d="M-7 8 L7 8 L8 5 L-8 5 Z" fill="#1a1035" stroke="#0a1628" strokeWidth="1.4" />
    <rect x="-6" y="-2" width="12" height="7" fill="#1a1035" stroke="#0a1628" strokeWidth="1.4" />
    <ellipse cx="0" cy="-2" rx="7" ry="2" fill="#1a1035" stroke="#0a1628" strokeWidth="1.4" />
    <rect x="-4" y="-7" width="8" height="5" rx="1" fill="#1a1035" stroke="#0a1628" strokeWidth="1.4" />
    {/* cross on top */}
    <rect x="-1" y="-13" width="2" height="6" fill="#fbbf24" stroke="#0a1628" strokeWidth="1" />
    <rect x="-3" y="-11" width="6" height="2" fill="#fbbf24" stroke="#0a1628" strokeWidth="1" />
  </g>
);

// ─────────────────────────────────────────────
// ACCESSORIES — head decorations
// ─────────────────────────────────────────────

const AccGraduation = (
  <g transform="translate(50 24)">
    <path d="M-18 -2 L0 -10 L18 -2 L0 4 Z" fill="#1a1035" stroke="#0a1628" strokeWidth="1.4" strokeLinejoin="round" />
    <rect x="-8" y="-2" width="16" height="3" fill="#1a1035" stroke="#0a1628" strokeWidth="1.2" />
    <line x1="14" y1="-2" x2="20" y2="6" stroke="#fbbf24" strokeWidth="1.4" />
    <circle cx="20" cy="6" r="2.4" fill="#fbbf24" stroke="#0a1628" strokeWidth="1.2" />
  </g>
);

const AccCrown = (
  <g transform="translate(50 22)">
    <path d="M-14 0 L-9 -8 L-4 -2 L0 -10 L4 -2 L9 -8 L14 0 L12 6 L-12 6 Z"
      fill="#fbbf24" stroke="#0a1628" strokeWidth="1.4" strokeLinejoin="round" />
    <circle cx="-9" cy="-8" r="2" fill="#dc2626" stroke="#0a1628" strokeWidth="1" />
    <circle cx="0" cy="-10" r="2.2" fill="#22d3ee" stroke="#0a1628" strokeWidth="1" />
    <circle cx="9" cy="-8" r="2" fill="#16a34a" stroke="#0a1628" strokeWidth="1" />
    <rect x="-12" y="2" width="24" height="2" fill="#d4a017" />
  </g>
);

const AccGlasses = (
  <g transform="translate(50 48)">
    <circle cx="-10" cy="0" r="6" fill="rgba(255,255,255,0.2)" stroke="#0a1628" strokeWidth="1.6" />
    <circle cx="10" cy="0" r="6" fill="rgba(255,255,255,0.2)" stroke="#0a1628" strokeWidth="1.6" />
    <line x1="-4" y1="0" x2="4" y2="0" stroke="#0a1628" strokeWidth="1.4" />
    <line x1="-16" y1="0" x2="-19" y2="-1" stroke="#0a1628" strokeWidth="1.4" />
    <line x1="16" y1="0" x2="19" y2="-1" stroke="#0a1628" strokeWidth="1.4" />
    {/* glare */}
    <path d="M-12 -3 L-8 -3 L-12 3 Z" fill="#fff" opacity="0.6" />
    <path d="M8 -3 L12 -3 L8 3 Z" fill="#fff" opacity="0.6" />
  </g>
);

const AccHardHat = (
  <g transform="translate(50 26)">
    <path d="M-16 4 Q-16 -10 0 -10 Q16 -10 16 4 Z"
      fill="#fbbf24" stroke="#0a1628" strokeWidth="1.5" strokeLinejoin="round" />
    <rect x="-18" y="3" width="36" height="3" rx="1" fill="#d4a017" stroke="#0a1628" strokeWidth="1.4" />
    <path d="M0 -10 L0 -1" stroke="#dc2626" strokeWidth="2" />
  </g>
);

const AccBeret = (
  <g transform="translate(50 24)">
    <ellipse cx="0" cy="0" rx="16" ry="6" fill="#7c3aed" stroke="#0a1628" strokeWidth="1.5" />
    <ellipse cx="-2" cy="-3" rx="14" ry="4" fill="#a78bfa" stroke="#0a1628" strokeWidth="1.2" />
    <circle cx="-10" cy="-5" r="2.5" fill="#1a1035" stroke="#0a1628" strokeWidth="1.2" />
  </g>
);

const AccVisor = (
  <g transform="translate(50 30)">
    <path d="M-18 0 Q-18 -8 0 -8 Q18 -8 18 0 L18 2 L-18 2 Z"
      fill="#0d2847" stroke="#0a1628" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M-15 -1 Q-15 -6 0 -6 Q15 -6 15 -1" fill="#22d3ee" opacity="0.4" />
  </g>
);

// ─────────────────────────────────────────────
// AVATAR VARIANTS — exported, ready to use
// ─────────────────────────────────────────────

const AvatarSaver = (props) => (
  <AvatarBase
    {...props}
    bodyColor="#22d3ee" bodyDark="#0e7490" bellyColor="#cffafe"
    expression="happy" prop={PropCoin}
  />
);

const AvatarLearner = (props) => (
  <AvatarBase
    {...props}
    bodyColor="#3b82f6" bodyDark="#1e3a8a" bellyColor="#dbeafe"
    expression="focused" prop={PropBook} accessory={AccGraduation}
  />
);

const AvatarStrongSaver = (props) => (
  <AvatarBase
    {...props}
    bodyColor="#3b82f6" bodyDark="#1e3a8a" bellyColor="#dbeafe"
    expression="smug" prop={PropPiggy} accessory={AccHardHat}
  />
);

const AvatarAnalyst = (props) => (
  <AvatarBase
    {...props}
    bodyColor="#a78bfa" bodyDark="#5b21b6" bellyColor="#ede9fe"
    expression="focused" prop={PropTablet} accessory={AccGlasses}
  />
);

const AvatarDefender = (props) => (
  <AvatarBase
    {...props}
    bodyColor="#3b82f6" bodyDark="#1e3a8a" bellyColor="#dbeafe"
    expression="smug" prop={PropShield} accessory={AccCrown}
  />
);

const AvatarInvestor = (props) => (
  <AvatarBase
    {...props}
    bodyColor="#22d3ee" bodyDark="#0e7490" bellyColor="#cffafe"
    expression="wink" prop={PropRocket} accessory={AccVisor}
  />
);

const AvatarGrower = (props) => (
  <AvatarBase
    {...props}
    bodyColor="#16a34a" bodyDark="#14532d" bellyColor="#dcfce7"
    expression="happy" prop={PropPlant}
  />
);

const AvatarStrategist = (props) => (
  <AvatarBase
    {...props}
    bodyColor="#1e3a8a" bodyDark="#0a1628" bellyColor="#dbeafe"
    expression="smug" prop={PropChess} accessory={AccBeret}
  />
);

const AvatarTrader = (props) => (
  <AvatarBase
    {...props}
    bodyColor="#dc2626" bodyDark="#7f1d1d" bellyColor="#fee2e2"
    expression="focused" prop={PropChart} accessory={AccVisor}
  />
);

const AvatarExplorer = (props) => (
  <AvatarBase
    {...props}
    bodyColor="#22d3ee" bodyDark="#0e7490" bellyColor="#cffafe"
    expression="happy" prop={PropGlobe}
  />
);

// ─────────────────────────────────────────────
// AVATAR SHOP CARD — recreates the layout from the reference,
// but with our app-language avatars + tokens.
// ─────────────────────────────────────────────

const AvatarShopCard = ({
  Avatar, name, desc,
  price = 100, currency = 'gem',
  equipped = false, locked = false, requiresLevel = null,
}) => {
  const Icon = currency === 'gem' ? Gem : Coin;
  return (
    <div style={{
      background: 'linear-gradient(180deg, #1a3a5c 0%, #0d2847 100%)',
      borderRadius: 18,
      border: '1.5px solid rgba(212,160,23,0.25)',
      overflow: 'hidden', position: 'relative',
      boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
    }}>
      {/* avatar */}
      <div style={{
        padding: '14px 14px 8px', display: 'grid', placeItems: 'center',
        position: 'relative',
      }}>
        <Avatar size={108} bgPattern="rays" border={true} glow={equipped} />
        {locked && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(10,22,40,0.7)', backdropFilter: 'blur(2px)',
            display: 'grid', placeItems: 'center',
          }}>
            <div style={{ textAlign: 'center', color: '#94a8c2' }}>
              <Lock size={22} />
              {requiresLevel && (
                <div style={{ fontSize: 9, fontWeight: 900, marginTop: 4, letterSpacing: 0.5 }}>שלב {requiresLevel}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* text */}
      <div style={{ padding: '0 14px 12px', textAlign: 'right' }}>
        <h3 style={{
          margin: 0, fontSize: 15, fontWeight: 900, color: '#fef3c7',
          marginBottom: 3, textShadow: '0 1px 3px rgba(0,0,0,0.5)',
        }}>{name}</h3>
        <p style={{
          margin: 0, fontSize: 11, lineHeight: 1.45, color: '#94a8c2',
          minHeight: 32, marginBottom: 10,
        }}>{desc}</p>

        {/* CTA */}
        {equipped ? (
          <button disabled className="duo-btn" style={{
            width: '100%', padding: '8px 12px', fontSize: 12,
            background: 'transparent',
            color: '#4ade80', border: '1.5px solid #16a34a', cursor: 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            '--press-shadow': 'transparent',
          }}>
            <span>✓</span><span>מצויד</span>
          </button>
        ) : locked ? (
          <button disabled className="duo-btn" style={{
            width: '100%', padding: '8px 12px', fontSize: 12,
            background: 'rgba(255,255,255,0.05)',
            color: '#94a8c2', cursor: 'not-allowed',
            border: '1px solid rgba(255,255,255,0.08)',
            '--press-shadow': 'transparent',
          }}>נעול</button>
        ) : (
          <button className="duo-btn" style={{
            width: '100%', padding: '9px 12px', fontSize: 13,
            background: 'linear-gradient(180deg, #16a34a, #15803d)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            '--press-shadow': '#14532d',
          }}>
            <Icon size={14} />
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{price}</span>
          </button>
        )}
      </div>
    </div>
  );
};

Object.assign(window, {
  AvatarBase,
  AvatarSaver, AvatarLearner, AvatarStrongSaver, AvatarAnalyst,
  AvatarDefender, AvatarInvestor, AvatarGrower, AvatarStrategist,
  AvatarTrader, AvatarExplorer,
  AvatarShopCard,
});
