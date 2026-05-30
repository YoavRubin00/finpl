import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Scale } from 'lucide-react-native';
import { STITCH } from '../../../../constants/theme';

export type LegalScope = 'tax' | 'pension' | 'mortgage' | 'general';

interface LegalDisclaimerProps {
  scope: LegalScope;
  /** Extra trailing line — e.g. "נכון לשנת המס 2026". */
  extra?: string;
}

const PREAMBLE =
  'כלי זה מספק הערכה מקדמית בלבד ואינו מהווה ייעוץ פיננסי, מיסויי, ביטוחי או משפטי.';

const PER_SCOPE: Record<LegalScope, string> = {
  tax:
    'חישוב המס מבוסס על מדרגות שנת המס ועלול שלא לכלול מקרי קצה ' +
    '(פטור עולה חדש, נכה, הכנסות הוניות, פטור 9א וכו׳). ' +
    'יש להתייעץ עם רואה חשבון או יועץ מס מורשה לפני הגשת דוח או קבלת החלטות.',
  pension:
    'תשואות העבר אינן מעידות על העתיד. דמי הניהול בפועל, התשואות, עלויות פוליסת הביטוח ' +
    'והכיסויים תלויים במסלול ובמבטח. יש להתייעץ עם משווק פנסיוני מורשה או יועץ פנסיוני ' +
    'בלתי תלוי לפני שינוי קרן, ניוד או מימוש הטבות מס.',
  mortgage:
    'הריביות, מסלולי ההצמדה, התנאים ואישור ההלוואה ייקבעו על ידי הבנק על סמך דירוג אשראי, ' +
    'הכנסות, תקנות בנק ישראל מעודכנות ושיקול דעת חיתום. הנתונים כאן הם הערכה גנרית ויש ' +
    'להתייעץ עם יועץ משכנתאות מורשה לפני חתימה.',
  general:
    'המידע מבוסס על נתונים זמינים בציבור נכון למועד הפיתוח ועלול להשתנות עם רגולציה ' +
    'או תנאי שוק חדשים.',
};

const LIABILITY =
  'FinPlay ומפעיליה אינם אחראים לכל החלטה, פעולה או הפסד שייגרמו על סמך השימוש בכלי. ' +
  'השימוש בכלי באחריותך הבלעדית.';

/**
 * Standardized legal disclaimer block for every financial tool screen.
 * Replaces the previous one-line `הערכה בלבד...` strings with defensible
 * scope-specific language + liability shield. Visually muted so it
 * reads as fine-print, not content.
 */
export function LegalDisclaimer({
  scope,
  extra,
}: LegalDisclaimerProps): React.ReactElement {
  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Scale size={14} color={STITCH.onSurfaceVariant} strokeWidth={2.4} />
        <Text style={styles.title}>הבהרה משפטית</Text>
      </View>
      <Text style={styles.body}>{PREAMBLE}</Text>
      <Text style={styles.body}>{PER_SCOPE[scope]}</Text>
      <Text style={styles.body}>{LIABILITY}</Text>
      {extra ? <Text style={[styles.body, styles.bodyFaded]}>{extra}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: STITCH.surfaceLow,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    gap: 6,
    marginTop: 4,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  title: {
    fontSize: 11,
    fontWeight: '900',
    color: STITCH.onSurfaceVariant,
    letterSpacing: 0.4,
    writingDirection: 'rtl',
  },
  body: {
    fontSize: 10.5,
    lineHeight: 15,
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
    textAlign: 'right',
    fontWeight: '500',
  },
  bodyFaded: {
    opacity: 0.7,
    fontStyle: 'italic',
  },
});
