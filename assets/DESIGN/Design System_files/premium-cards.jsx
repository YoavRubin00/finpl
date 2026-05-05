/* FinPlay PREMIUM CARDS — same DNA as LootCard:
   gradient outer border, dark interior, rarity ribbons, glowing visuals,
   sparkles, shimmer, gem/coin economy buttons. */

const _shimmer = (left = '-100px') => (
  <div className="shimmer" style={{ left }} />
);

const _Sparkle = ({ size = 10, top, left, right, bottom, delay = '0s' }) => (
  <div style={{ position: 'absolute', top, left, right, bottom, animation: `pop 1.6s ease-in-out ${delay} infinite` }}>
    <Sparkles size={size} />
  </div>
);

const _rarityGrad = {
  gold:   ['#d4a017', '#f5c842'],
  purple: ['#7c3aed', '#a78bfa'],
  cyan:   ['#0891b2', '#22d3ee'],
  red:    ['#dc2626', '#f87171'],
  green:  ['#15803d', '#4ade80'],
};

// ─────────────────────────────────────────────
// PREMIUM 1 · Treasure Chest Card
// Daily / weekly chest. Three states: locked, ready, opened.
// ─────────────────────────────────────────────
const TreasureChestCard = ({ state = 'ready', tier = 'gold', timeLeft = '04:32:18' }) => {
  const [g1, g2] = _rarityGrad[tier];
  const tierLabel = { gold: 'מלכותי', purple: 'אפי', cyan: 'נדיר', red: 'אגדי', green: 'נפוץ' }[tier];
  const isLocked = state === 'locked';
  const isOpened = state === 'opened';

  return (
    <div style={{
      background: isLocked ? 'linear-gradient(135deg, #4a5568, #718096)' : `linear-gradient(135deg, ${g1}, ${g2})`,
      borderRadius: 22, padding: 2.5,
      boxShadow: isLocked
        ? '0 6px 16px rgba(0,0,0,0.25)'
        : `0 8px 24px ${g1}66, 0 0 0 1px rgba(255,255,255,0.1) inset`,
    }}
    className={isLocked ? '' : 'glow-pulse'}>
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'rgba(10,22,40,0.94)', borderRadius: 19.5,
        padding: '14px 14px 12px', textAlign: 'center',
      }}>
        {/* tier ribbon */}
        <div style={{
          position: 'absolute', top: 8, left: 8,
          background: isLocked ? '#4a5568' : g1, borderRadius: 6,
          padding: '2px 8px', fontSize: 9, fontWeight: 900,
          color: isLocked ? '#fff' : (tier === 'gold' ? '#1a1035' : '#fff'),
          letterSpacing: 0.8, textTransform: 'uppercase',
        }}>{tierLabel}</div>

        {/* timer pill (only when locked) */}
        {isLocked && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            background: 'rgba(255,255,255,0.08)', borderRadius: 6,
            padding: '2px 8px', fontSize: 10, fontWeight: 800,
            color: '#94a8c2', fontVariantNumeric: 'tabular-nums',
          }}>{timeLeft}</div>
        )}
        {isOpened && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            background: 'rgba(34,197,94,0.18)', borderRadius: 6,
            padding: '2px 8px', fontSize: 9, fontWeight: 900,
            color: '#4ade80', letterSpacing: 0.5, textTransform: 'uppercase',
          }}>נאסף ✓</div>
        )}

        {/* Chest illustration */}
        <div style={{
          width: 110, height: 96, margin: '14px auto 8px',
          position: 'relative',
          background: isLocked ? 'transparent' : `radial-gradient(circle at 50% 60%, ${g1}55 0%, transparent 65%)`,
          display: 'grid', placeItems: 'center',
          opacity: isLocked ? 0.45 : 1,
          filter: isLocked ? 'grayscale(80%)' : 'none',
        }}>
          {!isLocked && !isOpened && (
            <>
              <_Sparkle size={14} top={4} right={6} delay="0s" />
              <_Sparkle size={10} top={18} left={8} delay="0.4s" />
              <_Sparkle size={8} bottom={20} right={14} delay="0.8s" />
            </>
          )}
          <svg width="86" height="76" viewBox="0 0 86 76">
            <defs>
              <linearGradient id={`chestG-${tier}-${state}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={isLocked ? '#9ca3af' : g2} />
                <stop offset="1" stopColor={isLocked ? '#4b5563' : g1} />
              </linearGradient>
              <linearGradient id={`chestWood-${tier}-${state}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#7c2d12" />
                <stop offset="1" stopColor="#431407" />
              </linearGradient>
            </defs>
            {/* base box */}
            <rect x="8" y="34" width="70" height="38" rx="3" fill={`url(#chestWood-${tier}-${state})`} stroke="#1c0701" strokeWidth="1.5" />
            {/* lid */}
            {isOpened ? (
              <path d="M8 34 Q8 12 43 12 Q78 12 78 34 L8 34 Z" transform="translate(0,-12) rotate(-25 8 34)"
                fill={`url(#chestG-${tier}-${state})`} stroke="#1c0701" strokeWidth="1.5" />
            ) : (
              <path d="M8 34 Q8 16 43 16 Q78 16 78 34 Z" fill={`url(#chestG-${tier}-${state})`} stroke="#1c0701" strokeWidth="1.5" />
            )}
            {/* metal bands */}
            <rect x="6" y="32" width="74" height="4" fill={isLocked ? '#6b7280' : g1} stroke="#1c0701" strokeWidth="1" />
            <rect x="6" y="58" width="74" height="4" fill={isLocked ? '#6b7280' : g1} stroke="#1c0701" strokeWidth="1" />
            {/* lock plate */}
            {!isOpened && (
              <>
                <rect x="38" y="30" width="10" height="12" rx="1.5" fill={isLocked ? '#6b7280' : g1} stroke="#1c0701" strokeWidth="1" />
                <circle cx="43" cy="36" r="2" fill="#1c0701" />
              </>
            )}
            {/* coins spilling out (opened only) */}
            {isOpened && (
              <>
                <circle cx="30" cy="38" r="6" fill="#facc15" stroke="#854d0e" strokeWidth="1" />
                <circle cx="44" cy="34" r="7" fill="#fde68a" stroke="#854d0e" strokeWidth="1" />
                <circle cx="58" cy="38" r="5" fill="#facc15" stroke="#854d0e" strokeWidth="1" />
                <text x="44" y="38" fontSize="8" fontWeight="900" textAnchor="middle" fill="#854d0e">$</text>
              </>
            )}
          </svg>
        </div>

        <h3 style={{
          margin: 0, fontSize: 14, fontWeight: 900, color: '#fef3c7',
          marginBottom: 2, textShadow: '0 2px 4px rgba(0,0,0,0.6)',
        }}>תיבת אוצר {tierLabel}</h3>
        <p style={{
          margin: 0, fontSize: 10, lineHeight: 1.4, color: '#94a8c2',
          marginBottom: 10,
        }}>{isLocked ? 'תפתח עוד 4 שעות' : isOpened ? 'חזור מחר לתיבה הבאה' : '5 פריטים אקראיים'}</p>

        {/* CTA */}
        {isLocked ? (
          <button disabled className="duo-btn" style={{
            width: '100%', padding: '9px 12px', fontSize: 12,
            background: 'rgba(255,255,255,0.05)', color: '#94a8c2',
            border: '1px solid rgba(255,255,255,0.08)', cursor: 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            '--press-shadow': 'transparent',
          }}>
            <Lock size={12} />
            <span>נעול</span>
          </button>
        ) : isOpened ? (
          <button disabled className="duo-btn" style={{
            width: '100%', padding: '9px 12px', fontSize: 12,
            background: 'rgba(34,197,94,0.12)', color: '#4ade80',
            border: '1px solid rgba(34,197,94,0.25)', cursor: 'default',
            '--press-shadow': 'transparent',
          }}>חזור מחר</button>
        ) : (
          <button className="duo-btn" style={{
            width: '100%', padding: '10px 12px', fontSize: 13,
            background: `linear-gradient(180deg, ${g2}, ${g1})`,
            color: tier === 'gold' ? '#1a1035' : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            '--press-shadow': g1,
          }}>פתח עכשיו ✨</button>
        )}

        {!isLocked && !isOpened && _shimmer()}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// PREMIUM 2 · Currency Pack Card
// IAP-style gem/coin bundle. Bonus % badge, "BEST VALUE" ribbon, price.
// ─────────────────────────────────────────────
const CurrencyPackCard = ({ tier = 'gold', amount = 1200, bonus = 20, price = '₪29.90', best = false, popular = false }) => {
  const [g1, g2] = _rarityGrad[tier];

  return (
    <div style={{
      background: `linear-gradient(135deg, ${g1}, ${g2})`,
      borderRadius: 22, padding: 2.5,
      boxShadow: `0 6px 20px ${g1}55, 0 0 0 1px rgba(255,255,255,0.1) inset`,
      position: 'relative',
    }}>
      {best && (
        <div style={{
          position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(180deg, #fbbf24, #d97706)',
          color: '#1a1035', fontSize: 9, fontWeight: 900,
          padding: '3px 14px', borderRadius: 999,
          letterSpacing: 0.8, textTransform: 'uppercase',
          boxShadow: '0 3px 8px rgba(217,119,6,0.5)',
          border: '1.5px solid #fef3c7',
          zIndex: 2, whiteSpace: 'nowrap',
        }}>★ הכי משתלם ★</div>
      )}
      {popular && !best && (
        <div style={{
          position: 'absolute', top: -8, right: 12,
          background: '#dc2626', color: '#fff',
          fontSize: 9, fontWeight: 900,
          padding: '3px 10px', borderRadius: 999,
          letterSpacing: 0.5, textTransform: 'uppercase',
          boxShadow: '0 3px 8px rgba(220,38,38,0.5)',
          zIndex: 2,
        }}>פופולרי</div>
      )}

      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'rgba(10,22,40,0.92)', borderRadius: 19.5,
        padding: '16px 14px 12px', textAlign: 'center',
      }}>
        {/* bonus chip */}
        {bonus > 0 && (
          <div style={{
            position: 'absolute', top: 10, right: 10,
            background: 'linear-gradient(180deg, #16a34a, #15803d)',
            color: '#fff', borderRadius: 999,
            padding: '3px 9px', fontSize: 10, fontWeight: 900,
            border: '1.5px solid #4ade80',
            transform: 'rotate(8deg)',
          }}>+{bonus}%</div>
        )}

        {/* gem stack */}
        <div style={{
          width: 100, height: 88, margin: '8px auto 6px',
          background: `radial-gradient(circle at 50% 50%, ${g1}55 0%, transparent 65%)`,
          display: 'grid', placeItems: 'center',
          position: 'relative',
        }}>
          <_Sparkle size={12} top={2} left={10} delay="0s" />
          <_Sparkle size={9} top={20} right={8} delay="0.5s" />
          <_Sparkle size={8} bottom={6} left={18} delay="1s" />
          {/* a cluster of 3 gems */}
          <svg width="82" height="78" viewBox="0 0 82 78">
            <defs>
              <linearGradient id={`gemBig-${tier}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={g2} />
                <stop offset="1" stopColor={g1} />
              </linearGradient>
            </defs>
            {/* back gem */}
            <path d="M22 28 L34 18 L46 28 L34 56 Z" fill={`url(#gemBig-${tier})`} stroke="#1a1035" strokeWidth="1.5" strokeLinejoin="round" opacity="0.85" />
            <path d="M22 28 L34 18 L34 28 Z" fill="#fff" opacity="0.4" />
            {/* right back gem */}
            <path d="M48 30 L58 22 L68 30 L58 50 Z" fill={`url(#gemBig-${tier})`} stroke="#1a1035" strokeWidth="1.5" strokeLinejoin="round" opacity="0.9" />
            <path d="M48 30 L58 22 L58 30 Z" fill="#fff" opacity="0.4" />
            {/* big front gem */}
            <path d="M26 38 L41 24 L56 38 L41 72 Z" fill={`url(#gemBig-${tier})`} stroke="#1a1035" strokeWidth="2" strokeLinejoin="round" />
            <path d="M26 38 L41 24 L41 38 Z" fill="#fff" opacity="0.55" />
            <path d="M26 38 L41 38 L41 72 Z" fill="#000" opacity="0.18" />
          </svg>
        </div>

        {/* amount */}
        <div style={{
          fontSize: 22, fontWeight: 900, color: '#fef3c7',
          textShadow: '0 2px 6px rgba(0,0,0,0.7)',
          fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5,
          lineHeight: 1, marginBottom: 2,
        }}>{amount.toLocaleString('he-IL')}</div>
        <div style={{
          fontSize: 10, fontWeight: 800, color: '#94a8c2',
          marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5,
        }}>יהלומים</div>

        {/* price button */}
        <button className="duo-btn" style={{
          width: '100%', padding: '10px 12px', fontSize: 14,
          background: 'linear-gradient(180deg, #16a34a, #15803d)', color: '#fff',
          fontVariantNumeric: 'tabular-nums',
          '--press-shadow': '#14532d',
        }}>{price}</button>

        {_shimmer()}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// PREMIUM 3 · Battle Pass Tier
// Wide horizontal card showing FREE + PREMIUM rewards split for one tier.
// ─────────────────────────────────────────────
const BattlePassTier = ({ tier = 12, current = false, hasPremium = false, freeReward = { type: 'coin', amount: 100 }, premiumReward = { type: 'gem', amount: 25 } }) => {
  const renderReward = (r, premium) => {
    const Icon = r.type === 'coin' ? Coin : r.type === 'gem' ? Gem : XPLightning;
    return (
      <div style={{
        flex: 1, position: 'relative',
        background: premium
          ? 'linear-gradient(135deg, rgba(212,160,23,0.18), rgba(245,200,66,0.08))'
          : 'rgba(255,255,255,0.04)',
        borderRadius: 14,
        border: premium ? '1.5px solid #d4a017' : '1px solid rgba(255,255,255,0.08)',
        padding: '10px 8px', textAlign: 'center',
      }}>
        <div style={{
          fontSize: 8, fontWeight: 900, letterSpacing: 0.8, textTransform: 'uppercase',
          color: premium ? '#fbbf24' : '#94a8c2', marginBottom: 4,
        }}>{premium ? '★ פרימיום' : 'חינמי'}</div>
        <div style={{
          width: 36, height: 36, margin: '0 auto 4px',
          borderRadius: '50%',
          background: premium
            ? 'radial-gradient(circle, rgba(212,160,23,0.35), transparent 70%)'
            : 'radial-gradient(circle, rgba(255,255,255,0.08), transparent 70%)',
          display: 'grid', placeItems: 'center',
        }}>
          <Icon size={26} />
        </div>
        <div style={{
          fontSize: 12, fontWeight: 900, color: '#fef3c7',
          fontVariantNumeric: 'tabular-nums',
        }}>+{r.amount}</div>
        {premium && !hasPremium && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 14,
            background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center',
            color: '#fbbf24',
          }}><Lock size={18} /></div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      background: current
        ? 'linear-gradient(135deg, #d4a017, #f5c842)'
        : 'linear-gradient(135deg, #2a3a52, #3d5476)',
      borderRadius: 18, padding: 2,
      boxShadow: current
        ? '0 6px 20px rgba(212,160,23,0.4), 0 0 0 1px rgba(255,255,255,0.1) inset'
        : '0 4px 12px rgba(0,0,0,0.3)',
    }}
    className={current ? 'glow-pulse' : ''}>
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'rgba(10,22,40,0.94)', borderRadius: 16,
        padding: 12, display: 'flex', alignItems: 'center', gap: 10,
        flexDirection: 'row-reverse',
      }}>
        {/* tier number medallion */}
        <div style={{
          width: 52, height: 52, flexShrink: 0,
          borderRadius: '50%',
          background: current
            ? 'linear-gradient(135deg, #fef3c7, #d4a017)'
            : 'linear-gradient(135deg, #475569, #1e293b)',
          border: `2px solid ${current ? '#fff' : '#64748b'}`,
          display: 'grid', placeItems: 'center',
          boxShadow: current ? '0 0 12px rgba(245,200,66,0.6)' : 'none',
        }}>
          <div style={{ textAlign: 'center', lineHeight: 1 }}>
            <div style={{ fontSize: 7, fontWeight: 900, color: current ? '#735c00' : '#94a8c2', letterSpacing: 0.5 }}>שלב</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: current ? '#1a1035' : '#fef3c7', fontVariantNumeric: 'tabular-nums' }}>{tier}</div>
          </div>
        </div>

        {/* rewards split */}
        <div style={{ flex: 1, display: 'flex', gap: 6 }}>
          {renderReward(freeReward, false)}
          {renderReward(premiumReward, true)}
        </div>

        {current && _shimmer()}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// PREMIUM 4 · Mystery Box Card
// Animated "?" box with rotating glow ring. Square card.
// ─────────────────────────────────────────────
const MysteryBoxCard = ({ cost = 50, possibleRewards = ['XP', '💎', '🪙', '❤️', '⚡', '🔥'] }) => (
  <div style={{
    background: 'linear-gradient(135deg, #7c3aed, #ec4899, #f59e0b)',
    borderRadius: 22, padding: 2.5,
    boxShadow: '0 8px 28px rgba(124,58,237,0.5), 0 0 0 1px rgba(255,255,255,0.15) inset',
    position: 'relative',
  }}>
    <div style={{
      position: 'relative', overflow: 'hidden',
      background: 'rgba(10,22,40,0.94)', borderRadius: 19.5,
      padding: '14px 14px 12px', textAlign: 'center',
    }}>
      <div style={{
        position: 'absolute', top: 8, left: 8,
        background: 'linear-gradient(90deg, #ec4899, #f59e0b)',
        borderRadius: 6, padding: '2px 8px',
        fontSize: 9, fontWeight: 900, color: '#fff',
        letterSpacing: 0.8, textTransform: 'uppercase',
      }}>מסתורי</div>

      {/* Box visual with rotating glow */}
      <div style={{
        width: 120, height: 110, margin: '8px auto 6px',
        position: 'relative', display: 'grid', placeItems: 'center',
      }}>
        {/* rotating conic glow */}
        <div className="ring-rotate" style={{
          position: 'absolute', inset: 0,
          background: 'conic-gradient(from 0deg, transparent 0%, #ec489966 25%, transparent 50%, #f59e0b66 75%, transparent 100%)',
          borderRadius: '50%',
          filter: 'blur(8px)',
        }} />
        <_Sparkle size={14} top={2} right={14} delay="0s" />
        <_Sparkle size={10} top={28} left={8} delay="0.4s" />
        <_Sparkle size={12} bottom={8} right={6} delay="0.8s" />

        {/* box */}
        <svg width="80" height="80" viewBox="0 0 80 80" style={{ position: 'relative', zIndex: 2 }}>
          <defs>
            <linearGradient id="mboxG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#a78bfa" />
              <stop offset="0.5" stopColor="#ec4899" />
              <stop offset="1" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          <rect x="14" y="22" width="52" height="52" rx="6" fill="url(#mboxG)" stroke="#1a1035" strokeWidth="2" />
          <rect x="10" y="18" width="60" height="14" rx="4" fill="url(#mboxG)" stroke="#1a1035" strokeWidth="2" />
          {/* ribbon */}
          <rect x="36" y="18" width="8" height="56" fill="#fbbf24" stroke="#1a1035" strokeWidth="1.5" />
          <rect x="10" y="22" width="60" height="6" fill="#fbbf24" stroke="#1a1035" strokeWidth="1.5" />
          {/* big ? */}
          <text x="40" y="58" fontSize="28" fontWeight="900" textAnchor="middle" fill="#fff" fontFamily="Heebo" stroke="#1a1035" strokeWidth="1">?</text>
        </svg>
      </div>

      <h3 style={{
        margin: 0, fontSize: 14, fontWeight: 900, color: '#fef3c7',
        marginBottom: 4, textShadow: '0 2px 4px rgba(0,0,0,0.6)',
      }}>תיבת הפתעה</h3>

      {/* Possible rewards row */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 10,
        flexDirection: 'row-reverse',
      }}>
        {possibleRewards.slice(0, 5).map((r, i) => (
          <div key={i} style={{
            width: 22, height: 22, borderRadius: 6,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            display: 'grid', placeItems: 'center',
            fontSize: 11,
          }}>{r}</div>
        ))}
        <div style={{
          width: 22, height: 22, borderRadius: 6,
          background: 'rgba(255,255,255,0.04)',
          border: '1px dashed rgba(255,255,255,0.18)',
          display: 'grid', placeItems: 'center',
          fontSize: 9, fontWeight: 800, color: '#94a8c2',
        }}>+12</div>
      </div>

      {/* CTA */}
      <button className="duo-btn" style={{
        width: '100%', padding: '10px 12px', fontSize: 13,
        background: 'linear-gradient(180deg, #ec4899, #be185d)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        '--press-shadow': '#831843',
      }}>
        <Gem size={14} />
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{cost}</span>
        <span style={{ opacity: 0.8 }}>· פתח</span>
      </button>

      {_shimmer()}
    </div>
  </div>
);

// ─────────────────────────────────────────────
// PREMIUM 5 · Flash Offer Banner
// Wide horizontal "limited time" banner with countdown and bundle preview.
// ─────────────────────────────────────────────
const FlashOfferBanner = ({ discount = 50, originalPrice = '₪59.90', salePrice = '₪29.90', timeLeft = '02:14:08' }) => (
  <div style={{
    background: 'linear-gradient(135deg, #dc2626, #f59e0b)',
    borderRadius: 22, padding: 2.5,
    boxShadow: '0 10px 30px rgba(220,38,38,0.5), 0 0 0 1px rgba(255,255,255,0.15) inset',
    position: 'relative',
  }}
  className="glow-pulse">
    <div style={{
      position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(120deg, #1a1035, #7c2d12)', borderRadius: 19.5,
      padding: '14px', display: 'flex', alignItems: 'center', gap: 14,
      flexDirection: 'row-reverse',
    }}>
      {/* burst discount badge */}
      <div style={{
        flexShrink: 0, position: 'relative',
        width: 90, height: 90, display: 'grid', placeItems: 'center',
      }}>
        <svg width="90" height="90" viewBox="0 0 90 90" style={{ position: 'absolute' }}
          className="ring-rotate">
          <path d="M45 4 L52 14 L64 8 L65 22 L78 22 L72 34 L84 40 L74 50 L82 62 L68 64 L66 78 L54 70 L46 82 L38 70 L26 78 L24 64 L10 62 L18 50 L8 40 L20 34 L14 22 L27 22 L28 8 L40 14 Z"
            fill="#fbbf24" stroke="#7c2d12" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        <div style={{
          position: 'relative', zIndex: 2, textAlign: 'center', lineHeight: 1,
        }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#7c2d12', fontVariantNumeric: 'tabular-nums' }}>{discount}%</div>
          <div style={{ fontSize: 9, fontWeight: 900, color: '#7c2d12', letterSpacing: 0.5 }}>הנחה</div>
        </div>
      </div>

      {/* content */}
      <div style={{ flex: 1, textAlign: 'right', minWidth: 0 }}>
        <div style={{
          display: 'inline-block',
          background: 'rgba(0,0,0,0.4)', borderRadius: 6,
          padding: '2px 8px', marginBottom: 6,
          fontSize: 9, fontWeight: 900, color: '#fbbf24',
          letterSpacing: 0.8, textTransform: 'uppercase',
        }}>⚡ זמן מוגבל</div>
        <h3 style={{
          margin: 0, fontSize: 16, fontWeight: 900, color: '#fef3c7',
          textShadow: '0 2px 6px rgba(0,0,0,0.7)',
          marginBottom: 4, lineHeight: 1.2,
        }}>חבילת מתחילים</h3>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'flex-end', marginBottom: 8 }}>
          <span style={{
            fontSize: 11, color: '#94a8c2', textDecoration: 'line-through',
            fontVariantNumeric: 'tabular-nums',
          }}>{originalPrice}</span>
          <span style={{
            fontSize: 18, fontWeight: 900, color: '#fbbf24',
            fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5,
          }}>{salePrice}</span>
        </div>
        {/* countdown */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(0,0,0,0.4)', borderRadius: 8,
          padding: '4px 8px',
        }}>
          <span style={{ fontSize: 10 }}>⏱️</span>
          <span style={{
            fontSize: 12, fontWeight: 900, color: '#fef3c7',
            fontVariantNumeric: 'tabular-nums', letterSpacing: 0.5,
          }}>{timeLeft}</span>
        </div>
      </div>

      {_shimmer()}
    </div>
  </div>
);

// ─────────────────────────────────────────────
// PREMIUM 6 · Champion Card
// Hero/avatar showcase card — Hearthstone-style. Shows level, title, stats.
// ─────────────────────────────────────────────
const ChampionCard = ({ name = 'מאיה כהן', title = 'מלכת התקציבים', level = 7, rank = 12, xp = 8420, streak = 47, initial = 'מ' }) => (
  <div style={{
    background: 'linear-gradient(135deg, #d4a017 0%, #f5c842 50%, #fbbf24 100%)',
    borderRadius: 22, padding: 3,
    boxShadow: '0 10px 30px rgba(212,160,23,0.5), 0 0 0 1px rgba(255,255,255,0.2) inset',
    position: 'relative',
  }}>
    <div style={{
      position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(180deg, #1a1035 0%, #0d2847 100%)',
      borderRadius: 19,
      padding: '12px 14px 14px', textAlign: 'center',
    }}>
      {/* rank crown badge */}
      <div style={{
        position: 'absolute', top: 10, right: 10,
        background: 'linear-gradient(180deg, #fbbf24, #d4a017)',
        borderRadius: 999, padding: '3px 9px 3px 7px',
        display: 'flex', alignItems: 'center', gap: 4,
        boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
        border: '1.5px solid #fef3c7',
      }}>
        <Crown size={12} color="#1a1035" />
        <span style={{ fontSize: 10, fontWeight: 900, color: '#1a1035', fontVariantNumeric: 'tabular-nums' }}>#{rank}</span>
      </div>
      <div style={{
        position: 'absolute', top: 10, left: 10,
        background: 'rgba(212,160,23,0.18)',
        border: '1px solid #d4a017',
        borderRadius: 6, padding: '2px 8px',
        fontSize: 9, fontWeight: 900, color: '#fbbf24',
        letterSpacing: 0.5, textTransform: 'uppercase',
      }}>שלב {level}</div>

      {/* Avatar with halo */}
      <div style={{
        width: 92, height: 92, margin: '20px auto 10px',
        position: 'relative', display: 'grid', placeItems: 'center',
      }}>
        <div className="ring-rotate" style={{
          position: 'absolute', inset: -4,
          background: 'conic-gradient(from 0deg, #d4a017, transparent 30%, #fbbf24, transparent 60%, #f5c842, transparent 90%)',
          borderRadius: '50%',
          filter: 'blur(2px)',
        }} />
        <_Sparkle size={12} top={-2} right={6} delay="0s" />
        <_Sparkle size={9} bottom={4} left={2} delay="0.6s" />
        <div style={{
          position: 'relative', zIndex: 2,
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
          display: 'grid', placeItems: 'center',
          color: '#fff', fontSize: 36, fontWeight: 900,
          border: '3px solid #fef3c7',
          boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
        }}>{initial}</div>
      </div>

      <h3 style={{
        margin: 0, fontSize: 15, fontWeight: 900, color: '#fef3c7',
        textShadow: '0 2px 6px rgba(0,0,0,0.7)',
        marginBottom: 2,
      }}>{name}</h3>
      <div style={{
        fontSize: 10, fontWeight: 800, color: '#fbbf24',
        marginBottom: 12, letterSpacing: 0.5,
      }}>« {title} »</div>

      {/* stats row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6,
        background: 'rgba(0,0,0,0.3)', borderRadius: 12,
        padding: '8px 4px',
        border: '1px solid rgba(212,160,23,0.25)',
      }}>
        {[
          { icon: <XPLightning size={14} />, value: xp.toLocaleString('he-IL'), label: 'XP' },
          { icon: <span style={{ fontSize: 12 }}>🔥</span>, value: streak, label: 'רצף' },
          { icon: <Crown size={12} color="#fbbf24" />, value: rank, label: 'דירוג' },
        ].map((s, i) => (
          <div key={i} style={{
            textAlign: 'center', position: 'relative',
            borderLeft: i < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 2 }}>{s.icon}</div>
            <div style={{
              fontSize: 13, fontWeight: 900, color: '#fef3c7',
              fontVariantNumeric: 'tabular-nums', lineHeight: 1,
            }}>{s.value}</div>
            <div style={{ fontSize: 8, color: '#94a8c2', marginTop: 2, letterSpacing: 0.3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {_shimmer()}
    </div>
  </div>
);

Object.assign(window, {
  TreasureChestCard, CurrencyPackCard, BattlePassTier,
  MysteryBoxCard, FlashOfferBanner, ChampionCard,
});
