/* FinPlay upgraded PROGRESS INDICATORS — 3 variants */

// VARIANT 1 · "Layered XP Bar" — current level + next level preview + reward chips
// Currently FinPlay shows just an XP number. This visualizes the journey.
const LayeredXPBar = ({ current = 740, max = 1000, level = 2, nextLevel = 3 }) => {
  const pct = (current / max) * 100;
  return (
    <div style={{ background: '#fff', borderRadius: 18, padding: 14, border: '1px solid #e0e3e5' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row-reverse', marginBottom: 10 }}>
        {/* Current level pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, flexDirection: 'row-reverse',
          background: 'linear-gradient(135deg, #c3c0ff, #8783d4)',
          padding: '4px 10px 4px 6px', borderRadius: 999,
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: '#3e3c8f', display: 'grid', placeItems: 'center',
            color: '#fff', fontSize: 11, fontWeight: 900,
          }}>{level}</div>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#3e3c8f' }}>שלב {level}</span>
        </div>
        {/* XP count */}
        <div style={{ fontSize: 12, fontWeight: 700, color: '#404752', fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ fontWeight: 900, color: '#191c1e' }}>{current.toLocaleString()}</span>
          <span style={{ opacity: 0.5 }}> / {max.toLocaleString()} XP</span>
        </div>
      </div>

      {/* Bar */}
      <div style={{ position: 'relative', height: 10, background: '#e0e3e5', borderRadius: 999, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: 'linear-gradient(90deg, #c3c0ff, #a78bfa)',
          borderRadius: 999, position: 'relative',
        }}>
          <div className="shimmer" style={{ width: 30, opacity: 0.6 }} />
        </div>
        {/* milestone notches */}
        {[25, 50, 75].map(p => (
          <div key={p} style={{
            position: 'absolute', top: 2, [`right`]: `${p}%`,
            width: 2, height: 6, background: '#fff', opacity: 0.5,
          }} />
        ))}
      </div>

      {/* Next reward preview */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexDirection: 'row-reverse', fontSize: 11,
      }}>
        <span style={{ color: '#707783' }}>הבא: שלב {nextLevel}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexDirection: 'row-reverse' }}>
          <span style={{ color: '#735c00', fontWeight: 800 }}>תרחישי השקעה ייפתחו</span>
          <Lock size={11} />
        </div>
      </div>
    </div>
  );
};

// VARIANT 2 · Level Ring with chapter progress
// A circular gauge showing chapter completion + level number
const LevelRing = ({ percent = 65, level = 3, label = "ביטחון" }) => {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: 100, height: 100 }}>
      <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="ringG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#9ccee6" />
            <stop offset="1" stopColor="#005bb1" />
          </linearGradient>
        </defs>
        {/* track */}
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e0e3e5" strokeWidth="6" />
        {/* progress */}
        <circle cx="50" cy="50" r={radius} fill="none" stroke="url(#ringG)" strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
        {/* tick marks */}
        {[0, 25, 50, 75].map(p => {
          const angle = (p / 100) * 2 * Math.PI;
          const x1 = 50 + (radius - 4) * Math.cos(angle);
          const y1 = 50 + (radius - 4) * Math.sin(angle);
          const x2 = 50 + (radius + 4) * Math.cos(angle);
          const y2 = 50 + (radius + 4) * Math.sin(angle);
          return <line key={p} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff" strokeWidth="1.5" />;
        })}
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
        textAlign: 'center',
      }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#707783', letterSpacing: 0.4, textTransform: 'uppercase' }}>שלב</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#005bb1', lineHeight: 1, fontFamily: 'Heebo' }}>{level}</div>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#191c1e', marginTop: 2 }}>{label}</div>
        </div>
      </div>
    </div>
  );
};

// VARIANT 3 · "Streak Tracker" — calendar-style 7-day strip
// Currently FinPlay shows just a fire+number. This shows the journey.
const StreakTracker = ({ days = 5 }) => {
  const labels = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
  return (
    <div style={{
      background: 'linear-gradient(135deg, #fff7ed, #fed7aa)',
      borderRadius: 18, padding: 14, border: '1px solid #fdba74',
    }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexDirection: 'row-reverse', marginBottom: 12 }}>
        <div className="fire-flicker" style={{ fontSize: 28 }}>🔥</div>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#9a3412', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {days} ימים ברצף
          </div>
          <div style={{ fontSize: 11, color: '#c2410c', marginTop: 2 }}>עוד יומיים — בונוס 50 XP!</div>
        </div>
      </div>

      {/* day strip */}
      <div style={{ display: 'flex', gap: 4, flexDirection: 'row-reverse' }}>
        {labels.map((day, i) => {
          const isPast = i < days;
          const isToday = i === days - 1;
          const is7th = i === 6;
          return (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#9a3412', marginBottom: 4 }}>{day}</div>
              <div style={{
                width: '100%', aspectRatio: '1', borderRadius: 8,
                display: 'grid', placeItems: 'center',
                background: isPast
                  ? (is7th ? 'linear-gradient(135deg, #facc15, #d4a017)' : '#f97316')
                  : '#fff',
                border: isToday ? '2px solid #9a3412' : '1px solid #fdba74',
                boxShadow: isToday ? '0 0 0 2px rgba(154,52,18,0.2)' : 'none',
                position: 'relative',
              }}>
                {isPast && !is7th && <span style={{ fontSize: 13, color: '#fff' }}>🔥</span>}
                {isPast && is7th && <span style={{ fontSize: 13 }}>🏆</span>}
                {!isPast && is7th && <span style={{ fontSize: 12, opacity: 0.4 }}>🏆</span>}
                {!isPast && !is7th && <span style={{ fontSize: 11, color: '#c0c7d4', fontWeight: 800 }}>{i + 1}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

Object.assign(window, { LayeredXPBar, LevelRing, StreakTracker });
