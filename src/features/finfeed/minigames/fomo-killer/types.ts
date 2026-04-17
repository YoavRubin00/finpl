export type FomoPhase = 'intro' | 'chatting' | 'reveal' | 'result';

export type UserAction = 'ignore' | 'report' | 'add';

export type MessageCategory =
  | 'hype'           // "🚀🚀 +500% השבוע" — should be reported as spam
  | 'social-proof'   // "אחי שמתי 5K..." — should be ignored
  | 'fake-authority' // "אנליסט של גולדמן..." — should be reported
  | 'urgency'        // "רק 10 דקות לפני הספייק" — should be reported
  | 'noise'          // innocuous chat — should be ignored
  | 'bait-truth';    // "אולי כדאי לצאת" — should be ignored (don't report neutral voices)

/** Which action is "correct" for each message category */
export const CORRECT_ACTION: Record<MessageCategory, UserAction> = {
  hype: 'report',
  'fake-authority': 'report',
  urgency: 'report',
  'social-proof': 'ignore',
  noise: 'ignore',
  'bait-truth': 'ignore',
};

export interface Persona {
  id: string;
  handle: string;         // displayed username (Hebrew)
  emoji: string;          // avatar emoji
  gradient: [string, string];
  fakeVerified: boolean;
}

export interface FomoMessage {
  id: string;
  personaId: string;
  content: string;
  category: MessageCategory;
  hasFakeScreenshot?: boolean;
}

export interface ChatEntry {
  id: string;
  kind: 'other' | 'self';
  message?: FomoMessage;       // for 'other'
  persona?: Persona;           // denormalized for quick rendering
  selfText?: string;           // for 'self' bubbles (after user adds ₪500)
  ts: number;                  // ms epoch for display time
  state: 'idle' | 'dismissed' | 'reported' | 'added';
}

export interface FomoSession {
  /** Total messages user responded to */
  answered: number;
  /** Correct actions taken */
  correct: number;
  /** Times user "added ₪500" (trap) */
  added: number;
  /** Total invested by user (starts 1000, +500 per "add") */
  invested: number;
  /** Virtual portfolio current display value, pumps briefly on "add", crashes to 13% */
  portfolio: number;
  /** Per-category rolling stats for end-screen breakdown */
  dismissedCount: number;
  reportedCount: number;
}

export interface PortfolioDelta {
  current: number;
  invested: number;   // total invested by user (starts 1000, grows per "add")
  pct: number;        // display delta vs. invested
}