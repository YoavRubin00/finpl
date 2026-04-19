import { View, Text, Modal, Pressable, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { MessageCircle, X } from "lucide-react-native";

interface LifelineModalProps {
  visible: boolean;
  conceptTag: string;
  onAccept: () => void;
  onDismiss: () => void;
}

/** Concept tag → Hebrew display name (exported for reuse in AI prompts) */
export const CONCEPT_LABELS: Record<string, string> = {
  budgeting_50_30_20: "חוק 50/30/20",
  overdraft_trap: "מלכודת המינוס",
  credit_minimum_payment: "תשלום מינימום באשראי",
  compound_interest: "ריבית דריבית",
  payslip_reading: "קריאת תלוש שכר",
  consumer_loans: "הלוואות צרכניות",
  bank_fees_negotiation: "עמלות בנק ומיקוח",
  marketing_traps: "מלכודות שיווקיות",
  emergency_fund: "קרן חירום",
  credit_score: "דירוג אשראי",
  tax_credits: "נקודות זיכוי מס",
  pension_basics: "פנסיה",
  hishtalmut_fund: "קרן השתלמות",
  insurance: "ביטוחים",
  inflation: "אינפלציה",
  money_psychology: "פסיכולוגיה של הכסף",
  gemel_fund: "קופת גמל",
  robo_advisor: "רובו-אדוויזור",
  stocks_vs_bonds: "מניות לעומת אג״ח",
  index_funds: "קרנות מדד",
  etf: "תעודות סל",
  trading_orders: "פקודות מסחר",
  dividends: "דיבידנדים",
  diversification: "פיזור סיכונים",
  fire_movement: "תנועת FIRE",
  mortgage_real_estate: "משכנתא ונדל״ן",
  reit: "קרנות REIT",
  retirement_planning: "תכנון פרישה",
  estate_planning: "צוואות והעברה בין-דורית",
  crypto_advanced: "קריפטו מתקדם",
  tax_planning: "תכנון מס",
  advanced_investing: "השקעות מתקדמות",
};

export function getConceptLabel(tag: string): string {
  return CONCEPT_LABELS[tag] ?? tag.replace(/_/g, " ");
}

export function LifelineModal({ visible, conceptTag, onAccept, onDismiss }: LifelineModalProps) {
  const label = getConceptLabel(conceptTag);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.card}>
          {/* Close button */}
          <Pressable onPress={onDismiss} style={styles.closeBtn} hitSlop={12}>
            <X size={20} color="#64748b" />
          </Pressable>

          {/* Icon */}
          <Animated.View entering={FadeIn.delay(200).duration(300)} style={styles.iconWrap}>
            <MessageCircle size={34} color="#0ea5e9" />
          </Animated.View>

          {/* Title */}
          <Animated.Text entering={FadeInUp.delay(250).duration(300)} style={styles.title}>
            רגע, אני כאן בשבילך! 💙
          </Animated.Text>

          {/* Body */}
          <Animated.Text entering={FadeInUp.delay(350).duration(300)} style={styles.body}>
            הנושא{" "}
            <Text style={styles.conceptHighlight}>{label}</Text>
            {" "}יכול להיות מבלבל בהתחלה.{"\n"}
            בוא נפתח צ׳אט קצר עם המנטור, הוא יסביר בקלות!
          </Animated.Text>

          {/* CTA */}
          <Pressable onPress={onAccept} style={styles.acceptBtn}>
            <MessageCircle size={20} color="#fff" />
            <Text style={styles.acceptText}>בוא נדבר על זה</Text>
          </Pressable>

          {/* Dismiss */}
          <Pressable onPress={onDismiss} style={styles.dismissBtn}>
            <Text style={styles.dismissText}>הכל טוב, אני ממשיך 💪</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(12,25,41,0.85)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(14,165,233,0.3)",
    padding: 28,
    alignItems: "center",
    gap: 12,
    shadowColor: "#0ea5e9",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  closeBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(14,165,233,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1f2937",
    textAlign: "center",
    writingDirection: "rtl",
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    color: "#4b5563",
    textAlign: "center",
    writingDirection: "rtl",
    paddingHorizontal: 4,
  },
  conceptHighlight: {
    color: "#0ea5e9",
    fontWeight: "700",
  },
  acceptBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0ea5e9",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: "100%",
    marginTop: 8,
    shadowColor: "#0ea5e9",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  acceptText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    writingDirection: "rtl",
  },
  dismissBtn: {
    paddingVertical: 10,
  },
  dismissText: {
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "600",
    writingDirection: "rtl",
  },
});
