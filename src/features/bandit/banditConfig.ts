import type { ConversionGoal, ExperimentId, ExperimentPayloads } from './banditTypes';

type VariantConfig<E extends ExperimentId> = {
  id: string;
  label: string;
  payload: ExperimentPayloads[E];
};

type ExperimentConfig<E extends ExperimentId> = {
  goal: ConversionGoal;
  variants: VariantConfig<E>[];
};

type AllExperimentConfigs = {
  [E in ExperimentId]: ExperimentConfig<E>;
};

export const EXPERIMENT_CONFIGS: AllExperimentConfigs = {
  streak_repair_offer: {
    goal: 'retention',
    variants: [
      {
        id: 'streak_repair_offer_v0',
        label: 'baseline',
        payload: {
          title: 'הרצף שלכם ({streak} ימים) נשבר 💔',
          subtitle: 'נחזיר אותו? קפטן שארק מאמין בכם!',
          primaryCTA: 'החזירו ב-200 מטבעות 🪙',
          adCTA: 'החזירו דרך צפייה בפרסומת 🎬',
          declineCTA: 'לא, נתחיל מחדש',
        },
      },
      {
        id: 'streak_repair_offer_v1',
        label: 'loss_aversion',
        payload: {
          title: 'איבדתם רצף של {streak} ימים 😮',
          subtitle: 'פשוט יום אחד יותר מדי — זה קרה לכולם',
          primaryCTA: 'שחזרו עכשיו ב-200 מטבעות 🪙',
          adCTA: 'שחזרו דרך פרסומת 🎬',
          declineCTA: 'נתחיל מחדש',
        },
      },
      {
        id: 'streak_repair_offer_v2',
        label: 'growth_framing',
        payload: {
          title: '{streak} ימים של עקביות — חבל להפסיד 🔥',
          subtitle: 'הישגים אמיתיים לא נעלמים בלילה אחד',
          primaryCTA: 'שמרו על הרצף ב-200 מטבעות 🪙',
          adCTA: 'שמרו דרך פרסומת 🎬',
          declineCTA: 'נתחיל מחדש מ-0',
        },
      },
      {
        id: 'streak_repair_offer_v3',
        label: 'shark_voice',
        payload: {
          title: '{streak} ימים. ספרתי כל אחד.',
          subtitle: 'אני לא כועס. אני רק... מאוכזב.',
          primaryCTA: 'נציל את הרצף — 200 מטבעות 🪙',
          adCTA: 'פרסומת קצרה ואנחנו חוזרים למסע 🎬',
          declineCTA: 'לא, נתחיל מחדש',
        },
      },
    ],
  },

  hearts_depleted_nudge: {
    goal: 'retention',
    variants: [
      {
        id: 'hearts_depleted_v0',
        label: 'loss_aversion',
        payload: {
          title: 'נגמרו הלבבות 💔',
          subtitle: 'יש לכם כמה אפשרויות להמשיך',
          primaryCTA: 'מלאו לב ב-1,500 מטבעות',
          framingType: 'loss_aversion',
        },
      },
      {
        id: 'hearts_depleted_v1',
        label: 'opportunity',
        payload: {
          title: 'הפסקה קצרה! 🌟',
          subtitle: 'הלבבות חוזרים תוך שעות — או תרוויחו אחד עכשיו',
          primaryCTA: 'הרוויחו לב בתרגול',
          framingType: 'opportunity',
        },
      },
      {
        id: 'hearts_depleted_v2',
        label: 'community',
        payload: {
          title: 'החברים שלכם ממשיכים ללמוד עכשיו 👥',
          subtitle: 'אל תישארו מאחור — לב אחד יחזיר אתכם למשחק',
          primaryCTA: 'המשיכו עם החברים',
          framingType: 'community',
        },
      },
      {
        id: 'hearts_depleted_v3',
        label: 'shark_voice',
        payload: {
          title: 'ספרתי. אפס לבבות 💔',
          subtitle: 'אני יושב פה. מחכה. בלי לחץ — אבל אני זוכר.',
          primaryCTA: 'תחזירו לי לב, אחזיר לכם משחק',
          framingType: 'loss_aversion',
        },
      },
    ],
  },

  referral_cta: {
    goal: 'referral',
    variants: [
      {
        id: 'referral_cta_v0',
        label: 'reciprocity',
        payload: {
          title: 'הזמינו חברים',
          body: 'גם להם ידע פיננסי, וגם אתם תהנו מהמטבעות שלהם',
          cta: '3 חברים = 150 מטבעות',
        },
      },
      {
        id: 'referral_cta_v1',
        label: 'dividend',
        payload: {
          title: 'דיבידנד אמיתי מחברים',
          body: 'כל חבר שמצטרף = זרם הכנסה פסיבית של מטבעות אליכם',
          cta: 'התחילו להרוויח',
        },
      },
      {
        id: 'referral_cta_v2',
        label: 'social',
        payload: {
          title: 'המשחק כיפי יותר בצוות',
          body: 'חברים שלומדים יחד מגיעים רחוק יותר',
          cta: 'הזמינו 3 = 150 מטבעות',
        },
      },
      {
        id: 'referral_cta_v3',
        label: 'shark_voice',
        payload: {
          title: 'אני צריך עוד אנשים על הסיפון',
          body: 'הביאו 3 חברים — אכניס לכם 150 מטבעות. עסקה הוגנת.',
          cta: 'אני בפנים — מזמינים חברים',
        },
      },
    ],
  },

  referral_nudge_trigger: {
    goal: 'referral',
    variants: [
      {
        id: 'referral_trigger_v0',
        label: 'after_win',
        payload: { trigger: 'after_win' },
      },
      {
        id: 'referral_trigger_v1',
        label: 'after_streak_milestone',
        payload: { trigger: 'after_streak_milestone' },
      },
      {
        id: 'referral_trigger_v2',
        label: 'after_level_up',
        payload: { trigger: 'after_level_up' },
      },
    ],
  },

  bridge_momentum_cta: {
    goal: 'bridge',
    variants: [
      {
        id: 'bridge_cta_v0',
        label: 'action',
        payload: {
          title: 'למדנו יפה',
          body: 'עכשיו הזמן לעבור לעולם האמיתי',
          cta: 'בואו נממש',
        },
      },
      {
        id: 'bridge_cta_v1',
        label: 'loss_aversion',
        payload: {
          title: 'אל תניחו לידע להישאר תאורטי',
          body: 'ההטבות האמיתיות מחכות בגשר',
          cta: 'להטבות שלכם',
        },
      },
      {
        id: 'bridge_cta_v2',
        label: 'growth',
        payload: {
          title: 'בניתם הרגל, תהנו ממנו',
          body: 'תהפכו את הידע עכשיו לתוצאות',
          cta: 'לעמוד הגשר',
        },
      },
      {
        id: 'bridge_cta_v3',
        label: 'shark_voice',
        payload: {
          title: 'ראיתי אתכם לומדים',
          body: 'עכשיו תראו אותי איך זה עובד באמת — בגשר',
          cta: 'קדימה, אני מחכה',
        },
      },
    ],
  },

  bridge_social_proof: {
    goal: 'bridge',
    variants: [
      {
        id: 'bridge_proof_v0',
        label: 'social_proof',
        payload: {
          framingType: 'social_proof',
          badgeText: '500+ ממירים השבוע',
          bodyText: 'אתם בחברה טובה',
        },
      },
      {
        id: 'bridge_proof_v1',
        label: 'achievement',
        payload: {
          framingType: 'achievement',
          badgeText: '{count} מודולים ברצף',
          bodyText: '',
        },
      },
      {
        id: 'bridge_proof_v2',
        label: 'reward',
        payload: {
          framingType: 'reward',
          badgeText: 'ערך חיסכון: ₪2,000+',
          bodyText: '',
        },
      },
    ],
  },

  upgrade_paywall_headline: {
    goal: 'pro',
    variants: [
      {
        id: 'paywall_v0',
        label: 'stats',
        payload: {
          proofText: 'משתמשי פרו בעלי פי 3.1X סיכויים לסיים את הלמידה!',
          ctaText: 'שדרגו עכשיו',
          subText: 'מתחדש אוטומטית. ביטול בכל עת.',
        },
      },
      {
        id: 'paywall_v1',
        label: 'features',
        payload: {
          proofText: 'לבבות אינסופיים, בוסט XP פי 2, אפס מגבלות',
          ctaText: 'התחילו PRO היום',
          subText: 'הצטרפו ל-10,000+ לומדים פרו',
        },
      },
      {
        id: 'paywall_v2',
        label: 'loss_aversion',
        payload: {
          proofText: 'אל תעצרו בדיוק עכשיו — הרצף שלכם שווה כסף',
          ctaText: 'המשיכו ללא עצירות',
          subText: 'ביטול בכל עת. ללא התחייבות.',
        },
      },
      {
        id: 'paywall_v3',
        label: 'shark_voice',
        payload: {
          proofText: 'אני יכול לפתוח לכם הכל. רק תגידו מילה.',
          ctaText: 'אני בפנים — PRO',
          subText: 'ביטול בכל עת. אני לא כובל אף אחד.',
        },
      },
    ],
  },

  upgrade_trigger_timing: {
    goal: 'pro',
    variants: [
      {
        id: 'trigger_timing_v0',
        label: 'immediate',
        payload: { trigger: 'immediate' },
      },
      {
        id: 'trigger_timing_v1',
        label: 'after_3_hearts_lost',
        payload: { trigger: 'after_3_hearts_lost' },
      },
      {
        id: 'trigger_timing_v2',
        label: 'after_feature_blocked_twice',
        payload: { trigger: 'after_feature_blocked_twice' },
      },
    ],
  },
};

export function getVariantPayload<E extends ExperimentId>(
  experimentId: E,
  variantId: string
): ExperimentPayloads[E] {
  const config = EXPERIMENT_CONFIGS[experimentId];
  const found = config.variants.find((v) => v.id === variantId);
  return ((found ?? config.variants[0]).payload) as ExperimentPayloads[E];
}