/* FinPlay upgraded BUTTONS — 3 variants */

// VARIANT 1 · Duolingo 3D primary button with reward preview
// Used as the "Continue" button — surfaces what you'll earn before pressing
const RewardCTA = ({ label = "המשך השיעור", xp = 20, coins = 50, color = '#005bb1', shadow = '#003a76' }) => (
  <button className="duo-btn" style={{
    width: '100%', padding: '14px 18px',
    background: color, color: '#fff',
    fontSize: 16, fontWeight: 900,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexDirection: 'row-reverse',
    '--press-shadow': shadow,
  }}>
    <span>{label}</span>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'rgba(0,0,0,0.18)', borderRadius: 999,
      padding: '4px 10px', fontSize: 12, fontWeight: 800,
    }}>
      <XPLightning size={12} />
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>+{xp}</span>
      <span style={{ opacity: 0.5 }}>·</span>
      <Coin size={11} />
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>+{coins}</span>
    </div>
  </button>
);

// VARIANT 2 · "Streak Save" emergency button
// When user is about to lose streak — high-urgency with countdown + 1-tap action
const StreakSaveButton = () => (
  <div style={{
    background: 'linear-gradient(180deg, #fef3c7, #fde68a)',
    borderRadius: 18, padding: 12,
    border: '2px solid #d4a017',
    boxShadow: '0 4px 14px rgba(212,160,23,0.35)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexDirection: 'row-reverse', marginBottom: 10 }}>
      <div className="fire-flicker" style={{
        width: 40, height: 40, borderRadius: 12,
        background: '#fff', display: 'grid', placeItems: 'center',
        border: '2px solid #f97316',
      }}>
        <span style={{ fontSize: 22 }}>🔥</span>
      </div>
      <div style={{ flex: 1, textAlign: 'right' }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: '#854d0e', lineHeight: 1.2 }}>הסטריק שלך בסכנה!</div>
        <div style={{ fontSize: 11, color: '#92400e', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>נשארו 2:14:32 לסיים שיעור</div>
      </div>
    </div>
    <button className="duo-btn" style={{
      width: '100%', padding: '11px 14px',
      background: 'linear-gradient(180deg, #f97316, #ea580c)', color: '#fff',
      fontSize: 14, fontWeight: 900,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      flexDirection: 'row-reverse',
      '--press-shadow': '#9a3412',
    }}>
      <span>הצל את הסטריק עכשיו</span>
      <span>⚡</span>
    </button>
  </div>
);

// VARIANT 3 · Quiz answer button with state morphing
// Currently FinPlay has flat answer buttons. This adds visual feedback states:
// idle → selected → correct (green burst) / wrong (red shake)
const QuizAnswerButton = ({ state = 'idle', label = 'הוצאות פיקס' }) => {
  const styles = {
    idle: { bg: '#fff', border: '#e0e3e5', text: '#191c1e', borderBottom: '#c0c7d4' },
    selected: { bg: '#d6e3ff', border: '#005bb1', text: '#005bb1', borderBottom: '#003a76' },
    correct: { bg: '#dcfce7', border: '#16a34a', text: '#15803d', borderBottom: '#14532d' },
    wrong: { bg: '#fee2e2', border: '#dc2626', text: '#991b1b', borderBottom: '#7f1d1d' },
  }[state];

  return (
    <div style={{
      width: '100%', padding: '14px 16px',
      background: styles.bg,
      border: `2px solid ${styles.border}`,
      borderBottom: `4px solid ${styles.borderBottom}`,
      borderRadius: 14,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexDirection: 'row-reverse',
      transition: 'all 0.18s',
    }}>
      <span style={{ fontSize: 14, fontWeight: 800, color: styles.text }}>{label}</span>
      {state === 'correct' && (
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#16a34a', display: 'grid', placeItems: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
      {state === 'wrong' && (
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#dc2626', display: 'grid', placeItems: 'center' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </div>
      )}
      {state === 'selected' && (
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #005bb1', display: 'grid', placeItems: 'center' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#005bb1' }} />
        </div>
      )}
      {state === 'idle' && (
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #c0c7d4' }} />
      )}
    </div>
  );
};

Object.assign(window, { RewardCTA, StreakSaveButton, QuizAnswerButton });
