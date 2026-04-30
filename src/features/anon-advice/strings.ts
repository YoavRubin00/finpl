// Hebrew UI copy for the Anonymous Financial Advice feature

export const A = {
  // Headers / titles
  title: 'ייעוץ אנונימי',
  subtitle: 'שאלו את הקהילה — אנונימי לחלוטין',
  hubCardTitle: 'ייעוץ אנונימי',
  hubCardSubtitle: (n: number) => `${n} שאלות פתוחות מהקהילה`,
  hubCardCta: 'היכנסו לפיד',

  // Composer
  composeTitle: 'שתפו את הדילמה הכספית שלכם',
  composeSituationLabel: 'תיאור המצב',
  composeSituationPlaceholder:
    'ספרו על המצב הכספי שלכם — גיל, הכנסה, מצב משפחתי, חובות, חסכונות. ככל שתרחיבו יותר, תקבלו תשובות טובות יותר.',
  composeQuestionLabel: 'הדילמה',
  composeQuestionPlaceholder: 'מה השאלה? מה אתם מתלבטים עליו?',
  composeOptionsLabel: 'אופציות לבחירה (עד 2)',
  composeOption1Placeholder: 'אופציה א׳',
  composeOption2Placeholder: 'אופציה ב׳ (אופציונלי)',
  composeImageLabel: 'הוספת תמונה (אופציונלי)',
  composeImageHelp: 'תלוש שכר, צילום מסך מהבנק וכו׳. דאגו להסתיר פרטים מזהים (שם, ת״ז).',
  composeAddImage: 'בחרו תמונה 📷',
  composeRemoveImage: 'הסר תמונה',
  composeRephraseWithShark: 'ניסוח מחדש עם שארק',
  composeRephrasing: 'שארק עובד על זה...',
  composeRephraseRevert: 'החזרת נוסח מקורי',
  composeSubmit: 'פרסום אנונימי',
  composeCancel: 'ביטול',

  // Validation
  validationSituationTooShort: (min: number) => `התיאור קצר מדי. הוסיפו לפחות ${min} תווים.`,
  validationSituationTooLong: (max: number) => `התיאור ארוך מדי. עד ${max} תווים.`,
  validationQuestionTooShort: (min: number) => `הדילמה קצרה מדי. לפחות ${min} תווים.`,
  validationQuestionTooLong: (max: number) => `הדילמה ארוכה מדי. עד ${max} תווים.`,
  validationOptionsRequired: 'הוסיפו לפחות אופציה אחת.',
  validationContainsPII: 'מצאנו פרטים מזהים (ת״ז / טלפון). הסירו אותם לפני השליחה.',

  // Moderation states
  moderationChecking: 'בודקים את הפוסט שלכם...',
  moderationCheckingSub: 'שארק עובר על התוכן ומוודא שהכל בסדר 🦈',
  moderationApproved: 'פורסם!',
  moderationApprovedSub: 'הפוסט שלכם זמין כעת לקהילה',
  moderationRejected: 'הפוסט לא אושר',
  moderationRejectedDefault: 'נראה שהתוכן לא מתאים לפיצ׳ר ייעוץ אנונימי.',
  moderationEdit: 'ערכו ונסו שוב',

  // Feed
  feedFilterAll: 'הכל',
  feedFilterMortgage: 'משכנתא',
  feedFilterInvestments: 'השקעות',
  feedFilterSavings: 'חיסכון',
  feedFilterRealEstate: 'דירה',
  feedEmpty: 'אין עדיין שאלות פתוחות. היו הראשונים לשתף!',
  feedComposeCta: 'שאלו את הקהילה',

  // Post detail
  postSituation: 'המצב',
  postQuestion: 'הדילמה',
  postOptions: 'האופציות',
  postReplies: (n: number) => `תגובות (${n})`,
  postNoReplies: 'אין עדיין תגובות. היו הראשונים לעזור.',
  postOptionVotePercent: (pct: number) => `${pct}%`,
  postSelfBadge: 'הפוסט שלי',

  // Reply composer
  replyPlaceholder: 'כתבו תגובה אנונימית...',
  replyAgreeWithLabel: 'מסכימים עם:',
  replyAgreeOption: (n: number) => `אופציה ${n === 0 ? 'א׳' : 'ב׳'}`,
  replyAgreeNeutral: 'ניטרלי',
  replySend: 'שלח',
  replyEmptyError: 'הוסיפו טקסט לתגובה',

  // Rewards
  rewardPostEarned: (coins: number, xp: number) => `+${coins} 🪙   +${xp} XP`,
  rewardReplyEarned: (coins: number) => `+${coins} 🪙`,
  rewardFirstPostBonus: 'בונוס פוסט ראשון!',
  rewardDailyCapPost: 'הגעתם לתקרה היומית של פוסטים. חזרו מחר 🌙',
  rewardDailyCapReply: 'הגעתם לתקרה היומית של תגובות. חזרו מחר 🌙',

  // Misc
  anonymous: 'אנונימי',
  byAlias: (alias: string) => `על ידי ${alias}`,
  reportPost: 'דווח על פוסט',
  reportSubmitted: 'תודה! נבדוק את הדיווח.',
  timeAgo: {
    justNow: 'כרגע',
    minutes: (n: number) => `לפני ${n} ד׳`,
    hours: (n: number) => `לפני ${n} ש׳`,
    days: (n: number) => `לפני ${n} ימ׳`,
  },
} as const;