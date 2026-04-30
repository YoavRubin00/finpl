// Types for the Anonymous Financial Advice feature ("ייעוץ אנונימי")

export type ModerationStatus = 'pending' | 'approved' | 'rejected';

export interface AnonAlias {
  emoji: string;     // from avatar pool
  noun: string;      // הלוחם, החכם, הזריזה...
  number: number;    // 1..9999
}

export interface AnonAdvicePost {
  id: string;
  alias: AnonAlias;
  isSelf: boolean;             // true if authored by current user
  situation: string;           // 30-500 chars — "תיאור"
  question: string;            // 10-200 chars — "דילמה"
  options: string[];           // 1-2 items, each 1-100 chars — "אופציות לבחירה"
  tags: string[];              // ['משכנתא','חיסכון']
  imageUri?: string;           // optional attached image (e.g. payslip), local URI / data URL
  createdAt: string;           // ISO
  replyCount: number;
  optionVotes: number[];       // [count_for_opt0, count_for_opt1]
  status: ModerationStatus;
  rejectionReason?: string;
}

export interface AnonAdviceReply {
  id: string;
  postId: string;
  alias: AnonAlias;
  isSelf: boolean;
  body: string;                // 1-300 chars
  agreedWith?: 0 | 1;          // optional vote on parent's options
  createdAt: string;
}

export interface ModerationResult {
  ok: boolean;
  reason?: string;             // user-facing rejection reason if !ok
  tags?: string[];
}

export interface RephraseResult {
  ok: boolean;
  situation?: string;
  question?: string;
  options?: string[];
  error?: string;
}

export type AnonAdviceTag = 'משכנתא' | 'השקעות' | 'חיסכון' | 'קרן השתלמות' | 'דירה ראשונה' | 'רכב' | 'תקציב' | 'פנסיה' | 'מס' | 'חוב';
