/**
 * Per-module FAQ presets surfaced when the user taps the `chat` chip.
 * Up to 4 short Hebrew prompts that pre-fill the main ChatScreen's
 * suggestion strip (Yoav R6 2026-06-10: "שאלות מוכנות לכל נושא").
 *
 * The chat answer uses the same companion stack as the global chat —
 * the curriculum knowledge in `buildSystemPrompt` already covers every
 * module's concept, so we just need the questions; the answer's
 * authority comes from the module's place in the curriculum.
 *
 * Mapping policy: only modules with an entry surface the preset
 * questions. Modules without an entry still get a `chat` chip (every
 * module does), the chat just opens with the chapter's contextual
 * suggestions instead.
 */
const MODULE_CHAT_FAQS: Record<string, string[]> = {
  'mod-1-1': [
    'מה זה ריבית דריבית במילים פשוטות?',
    'תוך כמה זמן 10,000 ₪ הופכים ל-20,000 ₪?',
    'איך מתחילים להשקיע עם 200 ₪ לחודש?',
    'איך לחשב את ההשפעה של דמי הניהול?',
  ],
};

export function getModuleChatFAQs(moduleId: string): string[] | null {
  const faqs = MODULE_CHAT_FAQS[moduleId];
  if (!faqs || faqs.length === 0) return null;
  return faqs;
}
