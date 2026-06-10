// Raw SVG markup for each topic chip, sourced from the Design System
// pack Yoav shipped 2026-06-10 (`assets/Design System.zip`). Rendered
// inside TopicChip via react-native-svg's <SvgXml/>.
//
// Each SVG ships at viewBox 0 0 48 48 with a gradient fill + drop-shadow
// filter. The drop-shadow renders on web/iOS; Android react-native-svg
// silently skips it. The base look (gradient + shape) still reads.
//
// All strings are pure markup — no runtime substitution — so a Metro
// rebuild is the only redeploy needed when the asset pack updates.

export const SVG_INTRO = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 48 48">
  <defs>
    <linearGradient id="g_intro" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe08a"></stop><stop offset="0.5" stop-color="#ffba33"></stop><stop offset="1" stop-color="#f59410"></stop>
    </linearGradient>
    <filter id="s_intro" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#9a5b08" flood-opacity="0.34"></feDropShadow>
    </filter>
  </defs>
  <g filter="url(#s_intro)"><g><rect x="13.5" y="7" width="3.6" height="34" rx="1.8" fill="#f59410"></rect><path d="M17 8 L39 13 L17 21 Z" fill="url(#g_intro)"></path><path d="M24.5 11.6 l1.2 2.6 l2.9 .3 l-2.2 1.9 l.7 2.8 l-2.5-1.5 l-2.5 1.5 l.7-2.8 l-2.2-1.9 l2.9-.3 Z" fill="rgba(255,255,255,0.95)"></path></g></g>
  <ellipse cx="20" cy="14" rx="11" ry="6" fill="#fff" opacity="0.18"></ellipse>
</svg>`;

export const SVG_CARDS = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 48 48">
  <defs>
    <linearGradient id="g_flashcards" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#a3e2f5"></stop><stop offset="0.5" stop-color="#36c2e6"></stop><stop offset="1" stop-color="#16a3c9"></stop>
    </linearGradient>
    <filter id="s_flashcards" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#0c6883" flood-opacity="0.34"></feDropShadow>
    </filter>
  </defs>
  <g filter="url(#s_flashcards)"><g><rect x="16" y="11" width="22" height="16" rx="4" fill="#16a3c9" transform="rotate(-12 27 19)"></rect><rect x="11" y="18" width="24" height="20" rx="4.5" fill="url(#g_flashcards)"></rect><g stroke="rgba(255,255,255,0.95)" stroke-width="2.4" stroke-linecap="round"><line x1="16" y1="26" x2="30" y2="26"></line><line x1="16" y1="32" x2="25" y2="32"></line></g></g></g>
  <ellipse cx="20" cy="14" rx="11" ry="6" fill="#fff" opacity="0.18"></ellipse>
</svg>`;

export const SVG_VIDEO = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 48 48">
  <defs>
    <linearGradient id="g_video" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffb0a4"></stop><stop offset="0.5" stop-color="#ff6b5e"></stop><stop offset="1" stop-color="#ef4438"></stop>
    </linearGradient>
    <filter id="s_video" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#9e231b" flood-opacity="0.34"></feDropShadow>
    </filter>
  </defs>
  <g filter="url(#s_video)"><g><rect x="8" y="12" width="32" height="24" rx="7" fill="url(#g_video)"></rect><path d="M20 18.5 L31 24 L20 29.5 Z" fill="rgba(255,255,255,0.95)"></path><g fill="#9e231b" opacity="0.5"><rect x="11" y="9.5" width="5" height="4" rx="1" transform="rotate(-18 13 11)"></rect><rect x="19" y="9" width="5" height="4" rx="1" transform="rotate(-18 21 11)"></rect></g></g></g>
  <ellipse cx="20" cy="14" rx="11" ry="6" fill="#fff" opacity="0.18"></ellipse>
</svg>`;

export const SVG_BRAIN = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 48 48">
  <defs>
    <linearGradient id="g_brain" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffb2d8"></stop><stop offset="0.5" stop-color="#ff6fb0"></stop><stop offset="1" stop-color="#ef4690"></stop>
    </linearGradient>
    <filter id="s_brain" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#9e1f5e" flood-opacity="0.34"></feDropShadow>
    </filter>
  </defs>
  <g filter="url(#s_brain)"><g><path d="M24 9 c7 0 13 4 13 12 c0 9-6 14-13 14 c-7 0-13-5-13-14 c0-8 6-12 13-12 Z" fill="url(#g_brain)"></path><path d="M24 11 v24" stroke="#9e1f5e" stroke-width="1.8" opacity="0.4"></path><g fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="1.8" stroke-linecap="round" opacity="0.85"><path d="M19 17 c-3 1-3 5 0 5"></path><path d="M19 24 c-3 1-2 5 1 5"></path><path d="M29 17 c3 1 3 5 0 5"></path><path d="M29 24 c3 1 2 5-1 5"></path></g></g></g>
  <ellipse cx="20" cy="14" rx="11" ry="6" fill="#fff" opacity="0.18"></ellipse>
</svg>`;

export const SVG_PODCAST = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 48 48">
  <defs>
    <linearGradient id="g_podcast" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d9b8ff"></stop><stop offset="0.5" stop-color="#a368f0"></stop><stop offset="1" stop-color="#8b46e0"></stop>
    </linearGradient>
    <filter id="s_podcast" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#56209e" flood-opacity="0.34"></feDropShadow>
    </filter>
  </defs>
  <g filter="url(#s_podcast)"><g fill="url(#g_podcast)"><rect x="18" y="6" width="12" height="22" rx="6"></rect><path d="M13 22 a11 11 0 0 0 22 0" fill="none" stroke="#8b46e0" stroke-width="3.2" stroke-linecap="round"></path><rect x="22.4" y="33" width="3.2" height="6" rx="1.6" fill="#8b46e0"></rect><rect x="17" y="38.5" width="14" height="3.4" rx="1.7" fill="#8b46e0"></rect><g stroke="rgba(255,255,255,0.95)" stroke-width="1.6" stroke-linecap="round"><line x1="21" y1="12" x2="27" y2="12"></line><line x1="21" y1="16" x2="27" y2="16"></line><line x1="21" y1="20" x2="27" y2="20"></line></g></g></g>
  <ellipse cx="20" cy="14" rx="11" ry="6" fill="#fff" opacity="0.18"></ellipse>
</svg>`;

export const SVG_SCENARIO = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 48 48">
  <defs>
    <linearGradient id="g_scenario" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffc98a"></stop><stop offset="0.5" stop-color="#ff9330"></stop><stop offset="1" stop-color="#ef7410"></stop>
    </linearGradient>
    <filter id="s_scenario" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#9e4708" flood-opacity="0.34"></feDropShadow>
    </filter>
  </defs>
  <g filter="url(#s_scenario)"><g><rect x="22" y="24" width="4" height="16" rx="2" fill="#ef7410"></rect><g fill="url(#g_scenario)"><path d="M24 26 L13 26 L9 21 L13 16 L24 16 Z"></path><path d="M24 22 L35 22 L39 17 L35 12 L24 12 Z"></path></g><g fill="rgba(255,255,255,0.95)"><circle cx="13.5" cy="21" r="1.6"></circle><circle cx="33.5" cy="17" r="1.6"></circle></g></g></g>
  <ellipse cx="20" cy="14" rx="11" ry="6" fill="#fff" opacity="0.18"></ellipse>
</svg>`;

export const SVG_QUIZ = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 48 48">
  <defs>
    <linearGradient id="g_quiz" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8fe7d6"></stop><stop offset="0.5" stop-color="#23bfa3"></stop><stop offset="1" stop-color="#12a085"></stop>
    </linearGradient>
    <filter id="s_quiz" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#0a6655" flood-opacity="0.34"></feDropShadow>
    </filter>
  </defs>
  <g filter="url(#s_quiz)"><g><rect x="12" y="9" width="24" height="32" rx="5" fill="url(#g_quiz)"></rect><rect x="19" y="5.5" width="10" height="6" rx="3" fill="#12a085"></rect><path d="M17 25 l4 4 l9-10" fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"></path><line x1="17" y1="34" x2="31" y2="34" stroke="rgba(255,255,255,0.95)" stroke-width="2.4" stroke-linecap="round" opacity="0.7"></line></g></g>
  <ellipse cx="20" cy="14" rx="11" ry="6" fill="#fff" opacity="0.18"></ellipse>
</svg>`;

export const SVG_SIMULATOR = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 48 48">
  <defs>
    <linearGradient id="g_simulator" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#a8eea0"></stop><stop offset="0.5" stop-color="#5ccb4f"></stop><stop offset="1" stop-color="#39a82f"></stop>
    </linearGradient>
    <filter id="s_simulator" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#1e6e18" flood-opacity="0.34"></feDropShadow>
    </filter>
  </defs>
  <g filter="url(#s_simulator)"><g><path d="M16 16 h16 a10 10 0 0 1 10 10 a6 6 0 0 1-11 3 h-14 a6 6 0 0 1-11-3 a10 10 0 0 1 10-10 Z" fill="url(#g_simulator)"></path><g stroke="rgba(255,255,255,0.95)" stroke-width="2.6" stroke-linecap="round"><line x1="13" y1="26" x2="19" y2="26"></line><line x1="16" y1="23" x2="16" y2="29"></line></g><g fill="rgba(255,255,255,0.95)"><circle cx="31" cy="24" r="2.2"></circle><circle cx="35" cy="28" r="2.2"></circle></g></g></g>
  <ellipse cx="20" cy="14" rx="11" ry="6" fill="#fff" opacity="0.18"></ellipse>
</svg>`;

export const SVG_TIP = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 48 48">
  <defs>
    <linearGradient id="g_tip" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe98a"></stop><stop offset="0.5" stop-color="#ffce33"></stop><stop offset="1" stop-color="#f0ad10"></stop>
    </linearGradient>
    <filter id="s_tip" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#9a6f08" flood-opacity="0.34"></feDropShadow>
    </filter>
  </defs>
  <g filter="url(#s_tip)"><g><circle cx="24" cy="19" r="11" fill="url(#g_tip)"></circle><rect x="19" y="28" width="10" height="6" rx="2" fill="#f0ad10"></rect><g stroke="#f0ad10" stroke-width="1.8" stroke-linecap="round"><line x1="20" y1="35.5" x2="28" y2="35.5"></line><line x1="21.5" y1="38.5" x2="26.5" y2="38.5"></line></g><path d="M24 13 v7 M24 20 l-3-3 M24 20 l3-3" stroke="rgba(255,255,255,0.95)" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.9"></path></g></g>
  <ellipse cx="20" cy="14" rx="11" ry="6" fill="#fff" opacity="0.18"></ellipse>
</svg>`;

export const SVG_GAME = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 48 48">
  <defs>
    <linearGradient id="g_game" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#b6baff"></stop><stop offset="0.5" stop-color="#7178f0"></stop><stop offset="1" stop-color="#4a52e0"></stop>
    </linearGradient>
    <filter id="s_game" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#2a2f9e" flood-opacity="0.34"></feDropShadow>
    </filter>
  </defs>
  <g filter="url(#s_game)"><g><path d="M16 16 h16 a10 10 0 0 1 10 10 a6 6 0 0 1-11 3 h-14 a6 6 0 0 1-11-3 a10 10 0 0 1 10-10 Z" fill="url(#g_game)"></path><g stroke="rgba(255,255,255,0.95)" stroke-width="2.6" stroke-linecap="round"><line x1="13" y1="26" x2="19" y2="26"></line><line x1="16" y1="23" x2="16" y2="29"></line></g><g fill="rgba(255,255,255,0.95)"><circle cx="31" cy="24" r="2.2"></circle><circle cx="35" cy="28" r="2.2"></circle></g></g></g>
  <ellipse cx="20" cy="14" rx="11" ry="6" fill="#fff" opacity="0.18"></ellipse>
</svg>`;

// Custom — not part of the Design System pack. Designed inline R6
// 2026-06-10 to give the shark-dilemma chip its "weigh the choice"
// metaphor (Yoav: "אולי כמו מאזניים כאלה בשפה העיצובית הזאת"). The
// orange palette echoes scenario.svg so the two dilemma-class chips
// read as a family without being identical.
export const SVG_SCALES = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 48 48">
  <defs>
    <linearGradient id="g_scales" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffc98a"></stop><stop offset="0.5" stop-color="#ff9330"></stop><stop offset="1" stop-color="#ef7410"></stop>
    </linearGradient>
    <filter id="s_scales" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#9e4708" flood-opacity="0.34"></feDropShadow>
    </filter>
  </defs>
  <g filter="url(#s_scales)">
    <rect x="22.5" y="11" width="3" height="28" rx="1.5" fill="#ef7410"></rect>
    <circle cx="24" cy="10" r="2.6" fill="#ef7410"></circle>
    <rect x="10" y="13" width="28" height="2.6" rx="1.3" fill="#ef7410"></rect>
    <line x1="14" y1="15" x2="14" y2="21" stroke="#ef7410" stroke-width="1.6" stroke-linecap="round"></line>
    <line x1="34" y1="15" x2="34" y2="21" stroke="#ef7410" stroke-width="1.6" stroke-linecap="round"></line>
    <path d="M9 21 L19 21 L17 27 a3 3 0 0 1-3 1.6 a3 3 0 0 1-3-1.6 Z" fill="url(#g_scales)"></path>
    <path d="M29 21 L39 21 L37 27 a3 3 0 0 1-3 1.6 a3 3 0 0 1-3-1.6 Z" fill="url(#g_scales)"></path>
    <ellipse cx="14" cy="21" rx="5" ry="1.4" fill="rgba(255,255,255,0.4)"></ellipse>
    <ellipse cx="34" cy="21" rx="5" ry="1.4" fill="rgba(255,255,255,0.4)"></ellipse>
    <rect x="16" y="38" width="16" height="3" rx="1.4" fill="#ef7410"></rect>
  </g>
  <ellipse cx="20" cy="14" rx="11" ry="6" fill="#fff" opacity="0.18"></ellipse>
</svg>`;

// Speech-bubble chat icon — paired with TopicKind 'chat' so every
// module surfaces an "ask the teacher" chip. Teal-cyan palette so it
// stands apart from cards (blue) and brain (pink) which already live
// in the column. Yoav R6 2026-06-10: "צאט עם האייקון של הצאט".
export const SVG_CHAT = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 48 48">
  <defs>
    <linearGradient id="g_chat" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#a2f0e3"></stop><stop offset="0.5" stop-color="#34d4be"></stop><stop offset="1" stop-color="#0fb19a"></stop>
    </linearGradient>
    <filter id="s_chat" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#085f54" flood-opacity="0.34"></feDropShadow>
    </filter>
  </defs>
  <g filter="url(#s_chat)">
    <path d="M9 14 a4 4 0 0 1 4-4 h22 a4 4 0 0 1 4 4 v15 a4 4 0 0 1-4 4 H21 l-7 6 v-6 H13 a4 4 0 0 1-4-4 Z" fill="url(#g_chat)"></path>
    <g fill="rgba(255,255,255,0.95)">
      <circle cx="17" cy="21" r="2.2"></circle>
      <circle cx="24" cy="21" r="2.2"></circle>
      <circle cx="31" cy="21" r="2.2"></circle>
    </g>
  </g>
  <ellipse cx="20" cy="14" rx="11" ry="6" fill="#fff" opacity="0.18"></ellipse>
</svg>`;

// Custom — not part of the Design System pack. Designed inline R5.14
// 2026-06-10 to distinguish the sandbox/sim chip from the scored
// short-game chip (both used to share the gamepad glyph). Green palette
// matches simulator.svg so the "open-ended exploration" tone carries
// over; a sand-fill + shovel sells "ארגז חול".
export const SVG_SANDBOX = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 48 48">
  <defs>
    <linearGradient id="g_sandbox" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#a8eea0"></stop><stop offset="0.5" stop-color="#5ccb4f"></stop><stop offset="1" stop-color="#39a82f"></stop>
    </linearGradient>
    <filter id="s_sandbox" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#1e6e18" flood-opacity="0.34"></feDropShadow>
    </filter>
  </defs>
  <g filter="url(#s_sandbox)">
    <rect x="8" y="18" width="32" height="22" rx="3" fill="url(#g_sandbox)"></rect>
    <rect x="6" y="15" width="36" height="5" rx="2" fill="#1e6e18" opacity="0.45"></rect>
    <rect x="11" y="22" width="26" height="15" rx="2" fill="#ffd966"></rect>
    <path d="M11 26 Q18 22 24 27 Q31 22 37 26 L37 30 Q31 25 24 30 Q18 25 11 30 Z" fill="#f0b94a" opacity="0.85"></path>
    <rect x="30" y="6" width="2.4" height="13" rx="1.2" fill="#a85e08" transform="rotate(28 31.2 12.5)"></rect>
    <path d="M32 17 L38 20 L36 24 L30 21 Z" fill="#cfcfcf"></path>
  </g>
  <ellipse cx="20" cy="14" rx="11" ry="6" fill="#fff" opacity="0.18"></ellipse>
</svg>`;

export const SVG_LESSON = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 48 48">
  <defs>
    <linearGradient id="g_lesson" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#a5d2ff"></stop><stop offset="0.5" stop-color="#4d9bf0"></stop><stop offset="1" stop-color="#2f7de1"></stop>
    </linearGradient>
    <filter id="s_lesson" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#1a4f93" flood-opacity="0.34"></feDropShadow>
    </filter>
  </defs>
  <g filter="url(#s_lesson)"><g><path d="M13 9 a3 3 0 0 1 3-3 h13 l7 7 v23 a3 3 0 0 1-3 3 H16 a3 3 0 0 1-3-3 Z" fill="url(#g_lesson)"></path><path d="M29 6 l7 7 h-7 Z" fill="#1a4f93" opacity="0.55"></path><g stroke="rgba(255,255,255,0.95)" stroke-width="2.6" stroke-linecap="round"><line x1="18" y1="20" x2="31" y2="20"></line><line x1="18" y1="26" x2="31" y2="26"></line><line x1="18" y1="32" x2="26" y2="32"></line></g></g></g>
  <ellipse cx="20" cy="14" rx="11" ry="6" fill="#fff" opacity="0.18"></ellipse>
</svg>`;
