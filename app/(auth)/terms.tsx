import { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

/* ------------------------------------------------------------------ */
/*  Content, Hebrew + English                                         */
/* ------------------------------------------------------------------ */

const CONTENT = {
  he: {
    headerTitle: "תנאי שימוש ומדיניות פרטיות",
    termsTitle: "תנאי שימוש",
    termsIntro: 'ברוכים הבאים ל-FinPlay ("האפליקציה"). השימוש באפליקציה מותנה בהסכמתך המלאה לתנאים הבאים.',
    termsSections: [
      { title: "1. מהות השירות והיעדר ייעוץ פיננסי", body: "FinPlay היא פלטפורמה טכנולוגית-חינוכית ללימוד אוריינות פיננסית באמצעות משחוק (Gamification) וסימולציות. כלל התכנים, הנתונים, המדדים והסימולטורים באפליקציה נועדו למטרות תרגול והעשרה בלבד.\n\nהחברה ו/או מי מטעמה אינם בעלי רישיון לפי חוק הסדרת העיסוק בייעוץ השקעות, בשיווק השקעות ובניהול תיקי השקעות, התשנ\"ה-1995. שום מידע באפליקציה אינו מהווה ייעוץ פיננסי, פנסיוני, מיסויי, או המלצה לביצוע פעולה כלשהי בשוק ההון, ואינו מהווה תחליף לייעוץ מקצועי המותאם לנתוניך האישיים. כל החלטה פיננסית שתקבל/י בעולם האמיתי היא על אחריותך הבלעדית." },
      { title: "2. סימולטור השקעות ונתוני שוק", body: "\"ארגז החול\" (הסימולטור) פועל בסביבה וירטואלית וללא סיכון כספי. נתוני השוק המוצגים בו עשויים להיות מושהים, היסטוריים או מומחשים, ואינם משקפים בהכרח נתוני זמן אמת מבורסות פעילות. הצלחה בסימולטור אינה מהווה ערובה או אינדיקציה להצלחה בהשקעות או במסחר בעולם האמיתי." },
      { title: "3. כלכלת משחק והיעדר אלמנט הימורים", body: "התקדמות באפליקציה, צבירת נקודות (XP), מטבעות וירטואליים (FinCoins) ופריטים וירטואליים מבוססת אך ורק על מיומנות, ידע, למידה והתמדה (Skill-Based), ואינה כוללת יסוד של מזל או גורל. לפיכך, פעילות זו אינה מהווה \"משחק אסור\" או הימור כהגדרתם בחוק העונשין.\n\nלמטבעות הווירטואליים אין כל ערך כספי או מסחרי מחוץ לאפליקציה, והם אינם ניתנים להמרה למזומן מול החברה. אנו שומרים את הזכות הבלעדית לשנות את \"מחירי\" ההטבות בחנות, להתנות או להגביל את מימושן, או לבטל את תוכנית התגמולים בכל עת, ללא הודעה מוקדמת וללא כל חובת פיצוי." },
      { title: "4. הגבלת גיל וכשירות משפטית", body: "השימוש באפליקציה מותר למשתמשים מגיל 16 ומעלה למטרות חינוכיות (בכפוף לאישור הורה/אפוטרופוס לקטינים). חשיפה להצעות מסחריות ומימוש הטבות מול גופים פיננסיים מוגבלים למשתמשים בני 18 ומעלה בלבד." },
      { title: "5. שירותי צד שלישי ושיווק שותפים", body: "האפליקציה מציגה קישורים, הצעות והטבות מטעם גופים פיננסיים ומסחריים. FinPlay עשויה לקבל עמלת הפניה (CPA/Affiliate) בגין פעולות שתבצע/י אצל שותפים אלו. FinPlay אינה צד להתקשרות בינך לבינם, אינה נושאת באחריות לטיב שירותיהם, וכל התקשרות מולם היא על אחריותך בלבד." },
      { title: "6. הגבלת אחריות ושיפוי", body: "השירות ניתן כמות שהוא (AS IS). FinPlay, מנהליה ועובדיה לא יישאו באחריות לכל נזק, ישיר או עקיף, הפסד פיננסי, אובדן רווחים, תקלות טכניות או עוגמת נפש שייגרמו משימוש באפליקציה או מהסתמכות על תכניה. סמכות השיפוט הבלעדית תהא נתונה לבתי המשפט בתל אביב-יפו." },
    ],
    privacyTitle: "מדיניות פרטיות",
    privacyIntro: 'FinPlay מחויבת להגנה על פרטיותך ופועלת בהתאם לחוק הגנת הפרטיות, התשמ"א-1981 ותקנותיו.',
    privacySections: [
      { title: "1. המידע שאנו אוספים", body: "• פרטי חשבון ויצירת קשר: שם מלא, כתובת דוא\"ל, מספר טלפון, תאריך לידה, ואווטאר.\n• נתוני למידה והתנהגות: התקדמות במודולים, תוצאות חידונים, בחירות ופעולות בסימולטור ההשקעות, משך שימוש, ורצפי פעילות (Streaks).\n• מידע טכני ודיגיטלי: סוג מכשיר, גרסת מערכת הפעלה, כתובת IP, מזהי פרסום/מכשיר ונתוני אנליטיקה." },
      { title: "2. מטרות השימוש במידע", body: "• תפעול שוטף: אספקת שירותי האפליקציה, ניהול חשבון, חישוב ניקוד והפעלת טבלאות מובילים (Leaderboards).\n• פרסונליזציה: שימוש בטכנולוגיות ואלגוריתמים (לרבות AI) לצורך התאמה אישית של מסלולי הלמידה, רמת הקושי והצעת תכנים והטבות פיננסיות הרלוונטיים לפרופיל שלך.\n• אבטחה ושיפור: ניתוח סטטיסטי אנונימי לפיתוח השירות, אבטחת מידע, ומניעת הונאות." },
      { title: "3. שיתוף מידע עם צדדים שלישיים", body: "החברה לעולם לא תמכור את המידע האישי המזהה שלך. שיתוף מידע יתבצע במקרים הבאים:\n• העברת לידים למימוש הטבות: בעת לחיצה על \"מימוש הטבה\" דרך חנות ההטבות, הנך נותן/ת הסכמה מפורשת להעברת פרטי הקשר שלך לאותו גוף ספציפי.\n• ספקי שירות טכנולוגיים: שירותי ענן, אחסון וניתוח נתונים הפועלים מטעמנו ותחת הסכמי סודיות קפדניים, כולל RevenueCat (ניהול מנויים), Vercel Blob (אחסון תמונות), Google ו-Apple Sign-In (אימות).\n• רשויות החוק: מסירת מידע ככל שנידרש לכך על פי חוק או צו שיפוטי." },
      { title: "4. דיוור ישיר והודעות שיווקיות", body: "בעצם הרשמתך, הנך מסכים/ה לקבלת הודעות מערכת, תזכורות למידה, התראות פוש, מסרונים ודברי פרסומת מ-FinPlay ומשותפיה, בהתאם לסעיף 30א לחוק התקשורת. תמיד שמורה לך הזכות לחזור בך מהסכמתך ולהסיר את עצמך מרשימות התפוצה." },
      { title: "5. זכויותיך (עיון, תיקון ומחיקה)", body: "על פי חוק הגנת הפרטיות, הינך זכאי/ת לעיין במידע האישי שלך. לעיון, תיקון או מחיקת חשבון, ניתן לפנות אלינו: yoav.finplay@gmail.com" },
      { title: "6. אבטחת מידע", body: "אנו נוקטים באמצעי אבטחה טכנולוגיים וארגוניים מחמירים כדי להגן על המידע שלך (לרבות הצפנה). עם זאת, מובהר כי אין מערכת המאובטחת באופן הרמטי לחלוטין מפני חדירות סייבר." },
      { title: "7. ילדים", body: "השימוש באפליקציה מותר מגיל 16 ומעלה. איננו אוספים מידע ביודעין מילדים מתחת לגיל 16. אם נודע לנו שילד מתחת לגיל זה מסר מידע, נמחק אותו מיידית." },
      { title: "8. שינויים במדיניות", body: "אנו עשויים לעדכן את מדיניות הפרטיות מעת לעת. שינויים מהותיים יפורסמו באפליקציה ויעודכנו בתאריך \"עדכון אחרון\" בראש מסך זה. המשך השימוש באפליקציה לאחר עדכון מהווה הסכמה למדיניות המעודכנת." },
    ],
    lastUpdated: "עדכון אחרון: אפריל 2026",
    acceptBtn: "קראתי ואני מאשר/ת",
    langSwitch: "English",
  },
  en: {
    headerTitle: "Terms of Use & Privacy Policy",
    termsTitle: "Terms of Use",
    termsIntro: 'Welcome to FinPlay ("the App"). Use of the App is subject to your full agreement to the following terms.',
    termsSections: [
      { title: "1. Nature of Service & No Financial Advice", body: "FinPlay is an educational technology platform for learning financial literacy through gamification and simulations. All content, data, indices, and simulators are for practice and enrichment purposes only.\n\nThe company does not hold a license under the Investment Advice Regulation Law, 5755-1995. No information in the App constitutes financial, pension, tax, or investment advice. Any financial decision you make in the real world is your sole responsibility." },
      { title: "2. Investment Simulator & Market Data", body: "The \"sandbox\" simulator operates in a virtual environment with no financial risk. Market data may be delayed, historical, or illustrative. Success in the simulator does not guarantee or indicate success in real-world investing or trading." },
      { title: "3. Game Economy & No Gambling", body: "Progress is based solely on skill, knowledge, learning, and persistence (Skill-Based), with no element of chance or luck. Virtual coins have no monetary or commercial value outside the App and cannot be converted to cash.\n\nWe reserve the exclusive right to change benefit prices, limit redemptions, or cancel the rewards program at any time without prior notice." },
      { title: "4. Age Restriction", body: "Use is permitted from age 16 for educational purposes (subject to parental/guardian consent for minors). Exposure to financial commercial offers and benefit redemption is restricted to users 18 and above." },
      { title: "5. Third Parties & Affiliates", body: "The App displays links, offers, and benefits from financial and commercial entities. FinPlay may receive referral commissions (CPA/Affiliate) for actions you perform with these partners. FinPlay is not a party to your engagement with them and bears no responsibility for their services." },
      { title: "6. Limitation of Liability", body: "The service is provided AS IS. FinPlay, its directors and employees shall not be liable for any direct or indirect damage, financial loss, lost profits, technical failures, or distress arising from use of the App. Exclusive jurisdiction: Tel Aviv-Jaffa courts." },
    ],
    privacyTitle: "Privacy Policy",
    privacyIntro: "FinPlay is committed to protecting your privacy and operates in accordance with the Israeli Privacy Protection Law, 5741-1981.",
    privacySections: [
      { title: "1. Information We Collect", body: "• Account & contact details: full name, email, phone number, date of birth, avatar.\n• Learning & behavioral data: module progress, quiz results, simulator choices and actions, usage duration, activity streaks.\n• Technical & digital info: device type, OS version, IP address, advertising/device identifiers, analytics data." },
      { title: "2. Purpose of Use", body: "• Operations: providing App services, account management, scoring, leaderboards.\n• Personalization: using technologies and algorithms (including AI) for personalized learning paths, difficulty levels, and relevant financial content and benefits.\n• Security: anonymous statistical analysis for service improvement, data security, and fraud prevention." },
      { title: "3. Information Sharing", body: "We will never sell your personally identifiable information. Sharing occurs in the following cases:\n• Benefit redemption: when you actively click \"Redeem Benefit\" through the rewards store, you give explicit consent to share your contact details with that specific entity.\n• Technology providers: cloud, storage, and analytics services operating on our behalf under strict confidentiality agreements, including RevenueCat (subscription management), Vercel Blob (image storage), Google and Apple Sign-In (authentication).\n• Law enforcement: as required by law or court order." },
      { title: "4. Direct Marketing & Communications", body: "By registering, you agree to receive system messages, learning reminders, push notifications, SMS, and promotional messages from FinPlay and its partners, per Section 30A of the Communications Law. You may unsubscribe at any time via App settings, device settings, or the unsubscribe link in any message." },
      { title: "5. Your Rights", body: "Under the Privacy Protection Law, you are entitled to review your personal information. For review, correction, or account deletion, contact us at: yoav.finplay@gmail.com" },
      { title: "6. Data Security", body: "We employ strict technological and organizational security measures to protect your data (including encryption). However, no system is completely immune to cyber intrusions." },
      { title: "7. Children", body: "Use is permitted from age 16. We do not knowingly collect information from children under 16. If we learn that a child under 16 has provided information, we will delete it immediately." },
      { title: "8. Changes to This Policy", body: "We may update this Privacy Policy from time to time. Material changes will be announced in the app and the \"Last updated\" date at the top of this screen will reflect the change. Continued use of the app after an update constitutes acceptance of the revised policy." },
    ],
    lastUpdated: "Last updated: April 2026",
    acceptBtn: "I have read and agree",
    langSwitch: "עברית",
  },
};

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */

import { setTermsAcceptedFlag } from "../../src/features/auth/termsAcceptedFlag";

export default function TermsScreen() {
  const router = useRouter();
  const [lang, setLang] = useState<"he" | "en">("he");
  const c = CONTENT[lang];
  const isHe = lang === "he";
  const rtl = isHe ? { writingDirection: "rtl" as const, textAlign: "right" as const } : {};

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={[styles.header, isHe && { flexDirection: "row-reverse" }]} accessibilityRole="toolbar">
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel={isHe ? "חזרה" : "Go back"}>
          {isHe ? <ChevronRight size={20} color="#0891b2" /> : <ChevronLeft size={20} color="#0891b2" />}
        </Pressable>
        <Text style={[styles.headerTitle, rtl]} accessibilityRole="header">{c.headerTitle}</Text>
        <Pressable onPress={() => setLang(isHe ? "en" : "he")} style={styles.langBtn} accessibilityRole="button" accessibilityLabel={isHe ? `החלף שפה ל${c.langSwitch}` : `Switch language to ${c.langSwitch}`}>
          <Text style={styles.langBtnText}>{c.langSwitch}</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} accessibilityRole="scrollbar">
        {/* Terms */}
        <Animated.View entering={FadeInUp.duration(300)} accessible={false}>
          <Text style={[styles.sectionHeading, rtl]} accessibilityRole="header">{c.termsTitle}</Text>
          <Text style={[styles.intro, rtl]}>{c.termsIntro}</Text>
          {c.termsSections.map((s, i) => (
            <View key={`t${i}`} style={styles.card} accessible accessibilityLabel={`${s.title}. ${s.body.replace(/•/g, '').replace(/\n/g, ' ')}`}>
              <Text style={[styles.cardTitle, rtl]}>{s.title}</Text>
              <Text style={[styles.cardBody, rtl]}>{s.body}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Divider */}
        <View style={styles.divider} accessible={false} />

        {/* Privacy */}
        <Animated.View entering={FadeInUp.delay(100).duration(300)} accessible={false}>
          <Text style={[styles.sectionHeading, rtl]} accessibilityRole="header">{c.privacyTitle}</Text>
          <Text style={[styles.intro, rtl]}>{c.privacyIntro}</Text>
          {c.privacySections.map((s, i) => (
            <View key={`p${i}`} style={styles.card} accessible accessibilityLabel={`${s.title}. ${s.body.replace(/•/g, '').replace(/\n/g, ' ')}`}>
              <Text style={[styles.cardTitle, rtl]}>{s.title}</Text>
              <Text style={[styles.cardBody, rtl]}>{s.body}</Text>
            </View>
          ))}
        </Animated.View>

        <Text style={[styles.updated, rtl]} accessibilityRole="text">{c.lastUpdated}</Text>
      </ScrollView>

      {/* Accept button */}
      <View style={styles.footer}>
        <Pressable onPress={() => { setTermsAcceptedFlag(); router.back(); }} style={styles.acceptBtn} accessibilityRole="button" accessibilityLabel={c.acceptBtn} accessibilityHint={isHe ? "לוחץ כאן מסמן שקראת ואישרת את התנאים" : "Pressing here confirms you read and accepted the terms"}>
          <Text style={styles.acceptBtnText}>{c.acceptBtn}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "800", color: "#0f172a" },
  langBtn: {
    backgroundColor: "#f0f9ff",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  langBtnText: { fontSize: 12, fontWeight: "700", color: "#0891b2" },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 16 },
  sectionHeading: { fontSize: 20, fontWeight: "900", color: "#0369a1", marginBottom: 8 },
  intro: { fontSize: 14, fontWeight: "500", color: "#475569", lineHeight: 22, marginBottom: 16 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e0f2fe",
    shadowColor: "#0891b2",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#0c4a6e", marginBottom: 6 },
  cardBody: { fontSize: 13, fontWeight: "500", color: "#334155", lineHeight: 22 },
  divider: { height: 1, backgroundColor: "#e2e8f0", marginVertical: 24 },
  updated: { fontSize: 12, color: "#94a3b8", fontWeight: "600", textAlign: "center", marginTop: 8 },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  acceptBtn: {
    backgroundColor: "#0891b2",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#0891b2",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  acceptBtnText: { fontSize: 16, fontWeight: "800", color: "#ffffff" },
});
