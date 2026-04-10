import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { RTL } from "../chapter-4-content/simulations/simTheme";
import { BackButton } from "../../components/ui/BackButton";

// ---------------------------------------------------------------------------
// Section Component
// ---------------------------------------------------------------------------

function Section({ title, body, delay }: { title: string; body: string; delay: number }) {
  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(400)}>
      <View style={styles.cardInner}>
        <Text style={[styles.sectionTitle, RTL]} accessibilityRole="header">{title}</Text>
        <Text style={[styles.sectionBody, RTL]}>{body}</Text>
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export function AccessibilityStatementScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#f0f9ff' }}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={[RTL, styles.headerTitle]} accessibilityRole="header">הצהרת נגישות</Text>
          <BackButton />
        </Animated.View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Section
            delay={100}
            title="מחויבות לנגישות"
            body={`FinPlay מחויבת להנגשת האפליקציה לכלל המשתמשים, לרבות אנשים עם מוגבלויות, בהתאם לחוק שוויון זכויות לאנשים עם מוגבלות, התשנ"ח-1998, ותקנות הנגישות מכוחו, לרבות תקן ישראלי 5568 (המבוסס על הנחיות WCAG 2.1 ברמה AA).

אנו פועלים באופן מתמיד לשפר את חוויית השימוש עבור כל המשתמשים ולהבטיח שהאפליקציה תהיה נגישה ושמישה ככל הניתן.`}
          />

          <Section
            delay={200}
            title="התאמות הנגישות באפליקציה"
            body={`האפליקציה כוללת את התאמות הנגישות הבאות:

• תמיכה בקוראי מסך — כל האלמנטים האינטראקטיביים (כפתורים, שדות טקסט, מחוונים) מסומנים עם תיאורים בעברית עבור VoiceOver (iOS) ו-TalkBack (Android).

• חלופות למחוות — בכל מקום שנדרשת מחוות החלקה (swipe), קיימים גם כפתורים נגישים לביצוע אותה פעולה.

• ניגודיות צבעים — הטקסטים באפליקציה עומדים ביחס ניגודיות של לפחות 4.5:1 לטקסט רגיל ו-3:1 לטקסט גדול, בהתאם לדרישות WCAG AA.

• מידע שאינו תלוי צבע בלבד — בכל מקום שמידע מועבר באמצעות צבע, מוצגים גם אייקונים או טקסט נלווה.

• תמיכה בהפחתת תנועה — האפליקציה מכבדת את הגדרת "הפחת תנועה" (Reduce Motion) של מערכת ההפעלה ומשביתה אנימציות בהתאם.

• אפשרות השהיית זמן — באינטראקציות מוגבלות בזמן, קיים כפתור השהייה (Pause) לשליטה בקצב.

• Modals נגישים — כל חלונות המודל מסומנים כראוי לקוראי מסך ומאפשרים סגירה נוחה.

• תמיכה ב-RTL — האפליקציה תוכננה מהיסוד לעברית עם כיוון ימין-לשמאל.`}
          />

          <Section
            delay={300}
            title="תקן הנגישות"
            body={`האפליקציה נבדקה ומותאמת לתקן ישראלי 5568 (SI 5568) ברמת AA, המבוסס על הנחיות WCAG 2.1 (Web Content Accessibility Guidelines) של ארגון W3C.

תאריך בדיקת הנגישות האחרונה: אפריל 2026.`}
          />

          <Section
            delay={400}
            title="מגבלות ידועות"
            body={`למרות מאמצינו, ייתכנו רכיבים שטרם הונגשו באופן מלא:

• גרפים ותרשימים בסימולציות מסוימות עשויים שלא להיות נגישים לחלוטין לקוראי מסך.
• תוכן שנוצר על ידי משתמשים (כגון הודעות צ'אט) אינו בשליטתנו מבחינת נגישות.

אנו עובדים על שיפור מתמיד של רכיבים אלו.`}
          />

          <Section
            delay={500}
            title="יצירת קשר בנושא נגישות"
            body={`נתקלת בבעיית נגישות? נשמח לסייע ולשפר.

דוא"ל: yoav.finplay@gmail.com
נושא: "פניית נגישות — FinPlay"

אנו מתחייבים לטפל בכל פנייה בנושא נגישות תוך 14 ימי עסקים.`}
          />

          <View style={styles.footer}>
            <Text style={[styles.footerText, RTL]}>עדכון אחרון: אפריל 2026</Text>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    zIndex: 10,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "900",
    color: "#0c4a6e",
  },
  headerSpacer: {
    width: 44,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 8,
  },
  cardInner: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0f2fe',
    shadowColor: '#0891b2',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0369a1",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0f2fe',
    paddingBottom: 8,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 24,
    color: "#334155",
    fontWeight: "500",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  bottomSpacer: {
    height: 40,
  },
});
