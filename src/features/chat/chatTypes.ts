import type { CompanionId } from "../auth/types";

export type CompanionAnimationState = "idle" | "talking" | "thinking";

export interface CompanionAnimationConfig {
  lottieSource: string;
  idleFrames: [number, number];
  talkingFrames: [number, number];
  thinkingFrames: [number, number];
}

export interface CompanionPersonality {
  id: CompanionId;
  name: string;
  emoji: string;
  tone: string;
  greeting: string;
  placeholder: string;
  animation: CompanionAnimationConfig;
  /** Header avatar, Lottie source or WebP ImageSource */
  headerLottie?: number;
  /** WebP image source for header avatar (used instead of headerLottie) */
  headerImage?: import("expo-image").ImageSource;
}

export interface ChatSuggestion {
  text: string;
  moduleId: string | null;
}

/** Message delivery status for read receipts */
export type MessageStatus = "sent" | "delivered" | "read";

/** WhatsApp-style chat message with timestamp and delivery status */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  status: MessageStatus;
  /** Special bubble type, renders inline CTA (e.g. upgrade to Pro) */
  kind?: "upgrade_prompt";
}
