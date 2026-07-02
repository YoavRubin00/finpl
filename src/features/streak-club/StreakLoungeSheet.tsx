import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal, useWindowDimensions } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  cancelAnimation,
  useReducedMotion,
  Easing,
} from "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ChevronRight } from "lucide-react-native";

import { SheetCloseButton } from "../../components/ui/SheetCloseButton";
import { ConfettiExplosion } from "../../components/ui/ConfettiExplosion";
import { LottieIcon } from "../../components/ui/LottieIcon";
import { GoldCoinIcon } from "../../components/ui/GoldCoinIcon";
import { toProxiedImageUri } from "../../lib/imageProxy";
import { captureEvent } from "../../lib/posthog";
import { tapHaptic, successHaptic } from "../../utils/haptics";
import { useSoundEffect } from "../../hooks/useSoundEffect";
import { todayIsraelDate } from "../economy/useStreak";
import { FINN_HELLO, FINN_DANCING } from "../retention-loops/finnMascotConfig";

import { LOUNGE_TABLES, SCENE_URI, SCENE_BLUR_URI, SCENE_AR, HOTSPOT_TOUCH, type LoungeTable, type TableId } from "./loungeConfig";
import { getDropForDate, getTomorrowTease } from "./clubContent";
import { useStreakClubStore, dateKeyDaysAgo } from "./useStreakClubStore";
import { useLoungeCamera } from "./useLoungeCamera";
import { TableDeck } from "./TableDeck";

/**
 * מועדון הרצף — הטרקלין.
 *
 * חדר-חברים תת-ימי: סצנת Higgsfield (עם fallback גרדיאנט פרימיום עד
 * שהנכס חי — התמונה נשענת על שכבת-הרקע, כך שכשל-טעינה לעולם לא נראה
 * שבור), שארק מארח, ו-3 שולחנות-hotspot. לחיצה על שולחן = זום קולנועי
 * (useLoungeCamera) והדרופ היומי נפתח כפאנל מעל הסצנה. הטרקלין המלא
 * נפתח כבר מיום-1 (streak>=1, יואב 2.7 — ערך מוקדם = משיכה חזקה יותר
 * לחזור). מצב-נעול נשמר דורמנטי ל-streak=0 בלבד (לא מגיע — ההורה מסנן).
 */
type LoungeView = "lounge" | TableId;

// דייזי — הקו-מארחת של המועדון (הדואו של הפודקאסט, וובפים שקופים)
/* eslint-disable @typescript-eslint/no-require-imports */
const DAISY_STANDARD = require("../../../assets/webp/daisy/daisy-standard.webp") as number;
const DAISY_CELEBRATE = require("../../../assets/webp/daisy/daisy-happy-celebrate.webp") as number;
// אש-הרצף — הלוטי הקנוני של האפליקציה (אותו קובץ כמו ה-header/חגיגות)
const FIRE_LOTTIE = require("../../../assets/lottie/wired-flat-2804-fire-flame-hover-pinch.json") as number;
// שארק+דייזי עם האוצר — נכס שנוצר בדיוק לרגע-הפינאלה
const FINN_DAISY_TREASURE = require("../../../assets/webp/fin-daisy-treasure.webp") as number;
/* eslint-enable @typescript-eslint/no-require-imports */

const GREETINGS: Array<[number, string]> = [
  [5, "בוקר טוב, חבר מועדון"],
  [12, "צהריים טובים, חבר מועדון"],
  [17, "ערב טוב, חבר מועדון"],
  [22, "לילה טוב, עוד דרופ לפני שינה?"],
];

function greetingByHour(h: number): string {
  if (h < 5) return "לילה טוב, עוד דרופ לפני שינה?";
  let out = GREETINGS[0][1];
  for (const [from, text] of GREETINGS) if (h >= from) out = text;
  return out;
}

/** זמן שנותר עד חצות-ישראל (הדרופים הבאים) — "H:MM" */
function timeToNextDrops(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  const [h, m] = parts.split(":").map((n) => parseInt(n, 10));
  const remainMin = 24 * 60 - (h * 60 + m);
  const rh = Math.floor(remainMin / 60);
  const rm = remainMin % 60;
  return `${rh}:${String(rm).padStart(2, "0")}`;
}

/** קרני-אור תת-ימיות — שתי אלומות מוטות בפולס-שקיפות איטי (UI-thread) */
function GodRay({ leftPct, angleDeg, delay }: { leftPct: number; angleDeg: number; delay: number }) {
  const reducedMotion = useReducedMotion();
  const glow = useSharedValue(0.07);
  useEffect(() => {
    if (reducedMotion) return;
    glow.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.16, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.06, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(glow);
  }, [glow, delay, reducedMotion]);
  const style = useAnimatedStyle(() => ({ opacity: glow.value }));
  if (reducedMotion) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: -40,
          left: `${leftPct}%`,
          width: 120,
          height: "62%",
          transform: [{ rotate: `${angleDeg}deg` }],
        },
        style,
      ]}
    >
      <LinearGradient
        colors={["rgba(255,241,196,0.9)", "rgba(255,241,196,0.25)", "transparent"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

/** בועות אמביינט — 6 בועות קלות עולות בלופ (UI-thread בלבד) */
function AmbientBubble({ leftPct, size, delay, travel }: { leftPct: number; size: number; delay: number; travel: number }) {
  const y = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (reducedMotion) return;
    y.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 6500 + travel, easing: Easing.linear }), -1, false),
    );
    return () => cancelAnimation(y);
  }, [y, delay, travel, reducedMotion]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -y.value * (280 + travel * 0.05) }],
    opacity: y.value < 0.08 ? y.value * 6 : 0.5 * (1 - y.value),
  }));
  if (reducedMotion) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: "absolute", bottom: 40, left: `${leftPct}%`, width: size, height: size, borderRadius: size / 2, backgroundColor: "rgba(148,210,255,0.28)", borderWidth: 1, borderColor: "rgba(190,230,255,0.35)" },
        style,
      ]}
    />
  );
}

export function StreakLoungeSheet({
  visible,
  streak,
  onClose,
}: {
  visible: boolean;
  streak: number;
  onClose: () => void;
}): React.ReactElement | null {
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const { playSound } = useSoundEffect();

  const locked = streak < 1; // יום-1 (streak>=1) = חבר מלא (יואב 2.7); streak=0 (אורח) לא מגיע לכאן — ההורה מסנן
  const dateKey = todayIsraelDate();

  const recordVisit = useStreakClubStore((s) => s.recordVisit);
  const markTableSeen = useStreakClubStore((s) => s.markTableSeen);
  const totalVisits = useStreakClubStore((s) => s.totalVisits);
  const seenMap = useStreakClubStore((s) => s.seenByDate[dateKey]);
  const seenByDateAll = useStreakClubStore((s) => s.seenByDate);

  const [view, setView] = useState<LoungeView>("lounge");
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [showFinale, setShowFinale] = useState(false);
  const [entryBeat, setEntryBeat] = useState(false);
  const [sharkDancing, setSharkDancing] = useState(false);
  const [isFirstEverVisit, setIsFirstEverVisit] = useState(false);
  const [nextDropsIn, setNextDropsIn] = useState<string>("");
  const dancingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const seenCount = LOUNGE_TABLES.reduce((n, t) => n + (seenMap?.[t.id] ? 1 : 0), 0);
  const allDoneToday = seenCount === LOUNGE_TABLES.length;

  // חותמות-ביקור שבועיות: 7 הימים האחרונים (הישן→שמאל, היום→ימין ב-RTL);
  // חותמת מלאה = נסגרו כל 3 השולחנות באותו יום. "אל תשבור את השרשרת" של המועדון.
  const weekStamps = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const key = dateKeyDaysAgo(dateKey, 6 - i);
      const day = seenByDateAll[key];
      const count = LOUNGE_TABLES.reduce((n, t) => n + (day?.[t.id] ? 1 : 0), 0);
      return { key, full: count === LOUNGE_TABLES.length, partial: count > 0, isToday: i === 6 };
    });
  }, [seenByDateAll, dateKey]);

  // שעון-הדרופים: מתקתק רק כשהטרקלין פתוח והיום סגור — אנטיציפציה, לא רעש
  useEffect(() => {
    if (!visible || !allDoneToday) return;
    setNextDropsIn(timeToNextDrops());
    const t = setInterval(() => setNextDropsIn(timeToNextDrops()), 30_000);
    return () => clearInterval(t);
  }, [visible, allDoneToday]);

  const camera = useLoungeCamera();

  // scene-frame: גאומטריית-cover מחושבת ידנית — התמונה (וה-hotspots שבתוכה)
  // ממוסגרות ביחס SCENE_AR וממורכזות, כך שאחוזי-תמונה מדויקים בכל מסך
  const frame = useMemo(() => {
    const w = stage.w || screenW;
    const h = stage.h || screenH;
    const wide = w / h > SCENE_AR;
    const frameW = wide ? w : h * SCENE_AR;
    const frameH = wide ? w / SCENE_AR : h;
    return { w: frameW, h: frameH, x: (w - frameW) / 2, y: (h - frameH) / 2 };
  }, [stage.w, stage.h, screenW, screenH]);

  const drops = useMemo(
    () => ({
      stocks: getDropForDate("stocks", dateKey),
      realestate: getDropForDate("realestate", dateKey),
      savings: getDropForDate("savings", dateKey),
    }),
    [dateKey],
  );

  // נשימת-סצנה איטית (Ken-Burns אידל) — מכובה ב-reduced-motion
  const breath = useSharedValue(1);
  useEffect(() => {
    if (!visible || reducedMotion) return;
    breath.value = withRepeat(
      withSequence(
        withTiming(1.025, { duration: 4200, easing: Easing.inOut(Easing.quad) }),
        withTiming(1.0, { duration: 4200, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(breath);
  }, [visible, reducedMotion, breath]);
  const breathStyle = useAnimatedStyle(() => ({ transform: [{ scale: breath.value }] }));

  // ריחוף עדין של הדואו-המארח (שארק+דייזי) — נוכחות חיה, לא סטיקר
  const hostFloat = useSharedValue(0);
  useEffect(() => {
    if (!visible || reducedMotion) return;
    hostFloat.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
        withTiming(5, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(hostFloat);
  }, [visible, reducedMotion, hostFloat]);
  const hostFloatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: hostFloat.value }] }));

  // פתיחה: ביט-כניסה קולנועי בפעם הראשונה של היום, מיידי אחרת
  useEffect(() => {
    if (!visible) return;
    setView("lounge");
    setShowFinale(false);
    camera.reset();
    const st = useStreakClubStore.getState();
    const firstVisitToday = st.lastVisitDate !== dateKey;
    setIsFirstEverVisit(!locked && st.totalVisits === 0);
    if (!locked) recordVisit();
    playSound("modal_open_2");
    try {
      captureEvent("streak_club_opened", {
        streak,
        date_key: dateKey,
        locked,
        visit_no: useStreakClubStore.getState().totalVisits,
        first_visit_today: firstVisitToday,
      });
    } catch { /* non-fatal */ }
    if (firstVisitToday && !reducedMotion) {
      setEntryBeat(true);
      const t = setTimeout(() => setEntryBeat(false), 620);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => () => {
    if (dancingTimer.current) clearTimeout(dancingTimer.current);
  }, []);

  const openTable = useCallback(
    (table: LoungeTable) => {
      if (locked) return;
      tapHaptic();
      playSound("bubble_transition");
      // אחוזי-תמונה → נקודת-קונטיינר דרך ה-frame, ואז זום אליה
      const px = frame.x + (table.hotspot.cxPct / 100) * frame.w;
      const py = frame.y + (table.hotspot.cyPct / 100) * frame.h;
      camera.focusPoint(px, py, table.zoomScale, stage.w || screenW, stage.h || screenH);
      // haptic-נחיתה כשהספרינג מתיישב על השולחן — הזום מקבל "משקל"
      setTimeout(() => tapHaptic(), 380);
      setView(table.id);
      try {
        captureEvent("streak_table_opened", { table: table.id, date_key: dateKey, streak });
      } catch { /* non-fatal */ }
    },
    [locked, camera, frame, stage.w, stage.h, screenW, screenH, dateKey, streak, playSound],
  );

  const backToLounge = useCallback(() => {
    camera.reset();
    setView("lounge");
  }, [camera]);

  const completeTable = useCallback(
    (table: LoungeTable) => {
      successHaptic();
      playSound("btn_click_heavy");
      markTableSeen(table.id);
      try {
        captureEvent("streak_drop_completed", {
          table: table.id,
          date_key: dateKey,
          streak,
          cards: drops[table.id].cards.length,
        });
      } catch { /* non-fatal */ }
      camera.reset();
      setView("lounge");
      // השארק חוגג רגע — ואם זה סגר את כל ה-3, פינאלה
      setSharkDancing(true);
      if (dancingTimer.current) clearTimeout(dancingTimer.current);
      dancingTimer.current = setTimeout(() => setSharkDancing(false), 1800);
      const allDone = useStreakClubStore.getState().allSeenToday();
      if (allDone) {
        setShowFinale(true);
        try {
          captureEvent("streak_club_all_completed", { date_key: dateKey, streak });
        } catch { /* non-fatal */ }
      }
    },
    [markTableSeen, camera, dateKey, streak, drops, playSound],
  );

  if (!visible) return null;

  // המארח חי: הבועה משתנה לפי מצב-היום — הכוונה, לא קישוט
  const greeting = locked
    ? "עוד יום אחד ונכנסים"
    : isFirstEverVisit
      ? "ברוך הבא למועדון! כל יום — 3 דרופים חדשים"
      : allDoneToday
        ? `סגרת הכל! דרופים חדשים בעוד ${nextDropsIn || timeToNextDrops()}`
        : seenCount > 0
          ? `נשאר${LOUNGE_TABLES.length - seenCount === 1 ? " שולחן אחד" : `ו ${LOUNGE_TABLES.length - seenCount} שולחנות`} להיום`
          : greetingByHour(new Date().getHours());
  const activeTable = view === "lounge" ? null : LOUNGE_TABLES.find((t) => t.id === view) ?? null;
  const tomorrowTease = getTomorrowTease("stocks", dateKey);

  return (
    <Modal visible={visible} transparent={false} animationType="slide" statusBarTranslucent onRequestClose={view === "lounge" ? onClose : backToLounge}>
      <GestureHandlerRootView style={styles.root}>
        {/* ── שכבת הסצנה (רקע גרדיאנט תמיד; תמונת-Higgsfield מעליו) ── */}
        <View style={StyleSheet.absoluteFill} onLayout={(e) => setStage({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          <Animated.View style={[StyleSheet.absoluteFill, breathStyle]}>
            <Animated.View style={[StyleSheet.absoluteFill, camera.cameraStyle]}>
              <LinearGradient
                colors={["#04121f", "#07253d", "#0a3a56", "#0b2b40"]}
                locations={[0, 0.35, 0.75, 1]}
                style={StyleSheet.absoluteFill}
              />
              {/* scene-frame — התמונה וה-hotspots חיים באותה גאומטריה בדיוק */}
              <View
                style={{
                  position: "absolute",
                  left: frame.x,
                  top: frame.y,
                  width: frame.w,
                  height: frame.h,
                }}
              >
                {SCENE_URI ? (
                  <ExpoImage
                    source={{ uri: toProxiedImageUri(SCENE_URI) }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    transition={400}
                    cachePolicy="memory-disk"
                    accessible={false}
                  />
                ) : null}

                {/* קרני-אור תת-ימיות — מזדחפות עם הסצנה */}
                <GodRay leftPct={30} angleDeg={16} delay={0} />
                <GodRay leftPct={58} angleDeg={-11} delay={1400} />

                {/* ── hotspots — בתוך ה-frame (מזדחפים עם הזום), נמוגים בכניסה ── */}
                <Animated.View style={[StyleSheet.absoluteFill, camera.hotspotFadeStyle]} pointerEvents={view === "lounge" && !locked ? "auto" : "none"}>
                  {LOUNGE_TABLES.map((t, i) => {
                    const seen = Boolean(seenMap?.[t.id]);
                    return (
                      <TableHotspot
                        key={t.id}
                        table={t}
                        index={i}
                        seen={seen}
                        locked={locked}
                        tomorrowTeaseHe={seen ? getTomorrowTease(t.id, dateKey) : undefined}
                        onPress={() => openTable(t)}
                      />
                    );
                  })}
                </Animated.View>
              </View>
              {/* וינייטת-זהב עדינה למעלה — תאורת-מועדון */}
              <LinearGradient
                colors={["rgba(251,191,36,0.10)", "transparent"]}
                style={{ position: "absolute", top: 0, left: 0, right: 0, height: 180 }}
                pointerEvents="none"
              />
            </Animated.View>
          </Animated.View>

          {/* DOF כשהדק פתוח: וריאנט-blur מוכן אם קיים, אחרת עמעום עדין */}
          {view !== "lounge" && (
            <Animated.View entering={FadeIn.duration(240)} exiting={FadeOut.duration(200)} style={StyleSheet.absoluteFill} pointerEvents="none">
              {SCENE_BLUR_URI ? (
                <ExpoImage source={{ uri: toProxiedImageUri(SCENE_BLUR_URI) }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(3,12,22,0.45)" }]} />
              )}
            </Animated.View>
          )}

          {/* בועות אמביינט */}
          <AmbientBubble leftPct={12} size={10} delay={0} travel={2400} />
          <AmbientBubble leftPct={28} size={6} delay={1800} travel={900} />
          <AmbientBubble leftPct={55} size={8} delay={900} travel={1600} />
          <AmbientBubble leftPct={71} size={5} delay={2600} travel={400} />
          <AmbientBubble leftPct={86} size={9} delay={1300} travel={2100} />
        </View>

        {/* ── כותרת ── */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
          <View style={styles.topRow}>
            <Text style={styles.title} allowFontScaling={false}>מועדון הרצף</Text>
            <View style={styles.closeBtn} pointerEvents="box-none">
              <SheetCloseButton
                onPress={view === "lounge" ? onClose : backToLounge}
                accessibilityLabel={view === "lounge" ? "סגירת המועדון" : "חזרה לטרקלין"}
                icon={<ChevronRight size={22} color="#e2e8f0" strokeWidth={2.6} />}
              />
            </View>
          </View>
          <View style={styles.memberRow}>
            <Text style={styles.memberLine} allowFontScaling={false}>{`רצף ${streak}`}</Text>
            <LottieIcon source={FIRE_LOTTIE} size={18} autoPlay loop active={visible && !reducedMotion} />
            {!locked && (
              <Text style={styles.memberLine} allowFontScaling={false}>{`· ביקור מס' ${Math.max(totalVisits, 1)}`}</Text>
            )}
          </View>
          {/* חותמות-השבוע: יום שסגרת בו את המועדון = חותמת זהב. אל תשבור את השרשרת. */}
          {!locked && (
            <View style={styles.stampsRow} accessible accessibilityLabel={`חותמות השבוע: ${weekStamps.filter((s) => s.full).length} מתוך 7 ימים הושלמו`}>
              {weekStamps.map((s) => (
                <View
                  key={s.key}
                  style={[
                    styles.stamp,
                    s.full && styles.stampFull,
                    !s.full && s.partial && styles.stampPartial,
                    s.isToday && styles.stampToday,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── הדואו המארח: קפטן שארק + דייזי (וובפים חיים, בטרקלין בלבד) ── */}
        {view === "lounge" && (
          <Animated.View entering={FadeInDown.delay(120).duration(350)} style={[styles.hostWrap, { top: insets.top + 74 }]} pointerEvents="none">
            <Animated.View style={hostFloatStyle}>
              <View style={styles.hostRow}>
                <ExpoImage
                  source={sharkDancing ? FINN_DANCING : FINN_HELLO}
                  style={styles.hostImg}
                  contentFit="contain"
                  transition={250}
                  accessible={false}
                />
                <ExpoImage
                  source={sharkDancing ? DAISY_CELEBRATE : DAISY_STANDARD}
                  style={styles.daisyImg}
                  contentFit="contain"
                  transition={250}
                  accessible={false}
                />
              </View>
            </Animated.View>
            <View style={styles.hostBubble}>
              <Text style={styles.hostBubbleText} allowFontScaling={false}>{greeting}</Text>
            </View>
          </Animated.View>
        )}

        {/* ── מצב-נעול (teaser, streak=1): מציצים אבל לא נוגעים ── */}
        {locked && (
          <View style={styles.lockWrap} pointerEvents="box-none">
            <Animated.View entering={FadeInUp.delay(200).duration(320)} style={styles.lockCard}>
              <Text style={styles.lockEmoji} allowFontScaling={false}>🗝️</Text>
              <Text style={styles.lockTitle} allowFontScaling={false}>עוד יום אחד ונכנסים</Text>
              <Text style={styles.lockBody}>
                שמור על הרצף גם מחר — והטרקלין נפתח: 3 שולחנות, דרופ בלעדי חדש כל יום.
              </Text>
              <Pressable
                onPress={() => {
                  tapHaptic();
                  onClose();
                }}
                style={styles.lockCta}
                accessibilityRole="button"
                accessibilityLabel="סגירה"
              >
                <Text style={styles.lockCtaText} allowFontScaling={false}>נתראה מחר 🔥</Text>
              </Pressable>
            </Animated.View>
          </View>
        )}

        {/* ── דק-השולחן (מעל הסצנה המזוממת) ── */}
        {activeTable && (
          <TableDeck
            table={activeTable}
            drop={drops[activeTable.id]}
            onComplete={() => completeTable(activeTable)}
            onBack={backToLounge}
          />
        )}

        {/* ── פינאלה: סגרת את כל ה-3 ── */}
        {showFinale && (
          <View style={styles.finaleWrap} pointerEvents="box-none">
            <ConfettiExplosion />
            <Animated.View entering={FadeInUp.delay(150).duration(320)} style={styles.finaleCard}>
              <ExpoImage
                source={FINN_DAISY_TREASURE}
                style={styles.finaleImg}
                contentFit="contain"
                accessible={false}
              />
              <Text style={styles.finaleTitle} allowFontScaling={false}>סגרת את הטרקלין להיום 🔥</Text>
              <Text style={styles.finaleBody}>מחר על השולחן: {tomorrowTease}</Text>
              <Text style={styles.finaleCountdown} allowFontScaling={false}>
                נפתח בעוד {nextDropsIn || timeToNextDrops()} ⏳
              </Text>
              <Pressable
                onPress={() => {
                  tapHaptic();
                  setShowFinale(false);
                }}
                style={styles.finaleCta}
                accessibilityRole="button"
                accessibilityLabel="סגירת הפינאלה"
              >
                <Text style={styles.finaleCtaText} allowFontScaling={false}>נתראה מחר</Text>
              </Pressable>
            </Animated.View>
          </View>
        )}

        {/* ── ביט-כניסה קולנועי (ראשון-של-היום): חושך שנמוג ── */}
        {entryBeat && (
          <Animated.View
            entering={FadeIn.duration(1)}
            exiting={FadeOut.duration(520)}
            style={[StyleSheet.absoluteFill, { backgroundColor: "#020a12" }]}
            pointerEvents="none"
          />
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

/** צ'יפ-שולחן על הסצנה: halo-pulse כשטרי, טיזר-מחר כשנצפה, כניסה מדורגת */
function TableHotspot({
  table,
  index,
  seen,
  locked,
  tomorrowTeaseHe,
  onPress,
}: {
  table: LoungeTable;
  index: number;
  seen: boolean;
  locked: boolean;
  tomorrowTeaseHe?: string;
  onPress: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const halo = useSharedValue(0.25);
  useEffect(() => {
    if (seen || locked || reducedMotion) {
      cancelAnimation(halo);
      halo.value = 0;
      return;
    }
    halo.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.15, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(halo);
  }, [seen, locked, halo, reducedMotion]);
  const haloStyle = useAnimatedStyle(() => ({ opacity: halo.value }));

  return (
    <View
      style={{
        position: "absolute",
        left: `${table.hotspot.cxPct}%`,
        top: `${table.hotspot.cyPct}%`,
        marginLeft: -HOTSPOT_TOUCH / 2,
        marginTop: -HOTSPOT_TOUCH / 2,
        width: HOTSPOT_TOUCH,
        height: HOTSPOT_TOUCH,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            width: HOTSPOT_TOUCH,
            height: HOTSPOT_TOUCH,
            borderRadius: HOTSPOT_TOUCH / 2,
            backgroundColor: table.accent,
          },
          haloStyle,
        ]}
      />
      {/* התווית יושבת מתחת לרכיב-הויזואלי של השולחן (יואב 2.7) — ההילה
          נשארת ממורכזת על האייקון בסצנה, הצ'יפ צונח מתחתיו */}
      <Animated.View entering={FadeInDown.delay(180 + index * 110).duration(320)} style={hotspotStyles.chipDrop}>
        <Pressable
          onPress={onPress}
          disabled={locked}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`שולחן ${table.titleHe}${seen ? ", הדרופ של היום נצפה, מחר דרופ חדש" : ", דרופ חדש מחכה"}`}
          style={[hotspotStyles.chip, { borderColor: table.accent, opacity: seen ? 0.62 : 1 }]}
        >
          {seen ? (
            <Text style={hotspotStyles.emoji} allowFontScaling={false}>✓</Text>
          ) : table.id === "savings" ? (
            // זהב-האפליקציה (GoldCoinIcon) במקום אמוג'י 🪙 (יואב 2.7)
            <View style={hotspotStyles.iconWrap}><GoldCoinIcon size={26} /></View>
          ) : (
            <Text style={hotspotStyles.emoji} allowFontScaling={false}>{table.emoji}</Text>
          )}
          <Text style={hotspotStyles.label} allowFontScaling={false}>{table.titleHe}</Text>
          {seen && tomorrowTeaseHe ? (
            // קליפהנגר פר-שולחן: מה מחכה כאן מחר — 3 סיבות קטנות לחזור
            <Text style={hotspotStyles.tease} allowFontScaling={false} numberOfLines={1}>
              מחר: {tomorrowTeaseHe}
            </Text>
          ) : null}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const hotspotStyles = StyleSheet.create({
  // הצ'יפ צונח ~46px מתחת למרכז-ה-hotspot כדי לשבת מתחת לויזואל בסצנה
  chipDrop: { marginTop: 46 },
  chip: {
    alignItems: "center",
    backgroundColor: "rgba(4,18,31,0.82)",
    borderWidth: 1.5,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 84,
  },
  emoji: { fontSize: 26, marginBottom: 2 },
  iconWrap: { marginBottom: 4, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 13, fontWeight: "900", color: "#f1f5f9", writingDirection: "rtl" },
  tease: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fbbf24",
    writingDirection: "rtl",
    marginTop: 3,
    maxWidth: 118,
  },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#04121f" },
  topBar: { paddingHorizontal: 14, zIndex: 20 },
  topRow: { height: 44, justifyContent: "center" },
  title: {
    fontSize: 21,
    fontWeight: "900",
    color: "#fbbf24",
    textAlign: "center",
    writingDirection: "rtl",
    letterSpacing: 0.3,
  },
  closeBtn: { position: "absolute", right: 0, top: 0, bottom: 0, justifyContent: "center" },
  memberRow: {
    flexDirection: "row-reverse",
    alignSelf: "center",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  memberLine: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "rgba(226,232,240,0.85)",
    textAlign: "center",
    writingDirection: "rtl",
  },
  stampsRow: {
    flexDirection: "row-reverse",
    alignSelf: "center",
    gap: 6,
    marginTop: 7,
  },
  stamp: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  stampPartial: {
    backgroundColor: "rgba(251,191,36,0.35)",
  },
  stampFull: {
    backgroundColor: "#fbbf24",
    shadowColor: "#fbbf24",
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  stampToday: {
    borderWidth: 1.5,
    borderColor: "rgba(251,191,36,0.9)",
  },
  hostWrap: { position: "absolute", alignSelf: "center", alignItems: "center", zIndex: 15 },
  hostRow: { flexDirection: "row-reverse", alignItems: "flex-end", gap: -6 },
  hostImg: { width: 96, height: 96 },
  daisyImg: { width: 72, height: 72, marginBottom: 2 },
  finaleImg: { width: 132, height: 104, marginBottom: 8 },
  hostBubble: {
    marginTop: 4,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.7)",
  },
  hostBubbleText: { fontSize: 13, fontWeight: "800", color: "#0f172a", writingDirection: "rtl" },
  lockWrap: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "flex-end", paddingBottom: 60, zIndex: 25 },
  lockCard: {
    marginHorizontal: 28,
    backgroundColor: "rgba(4,18,31,0.94)",
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "rgba(251,191,36,0.75)",
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: "center",
  },
  lockEmoji: { fontSize: 34, marginBottom: 6 },
  lockTitle: { fontSize: 19, fontWeight: "900", color: "#fbbf24", writingDirection: "rtl", marginBottom: 6 },
  lockBody: {
    fontSize: 14.5,
    lineHeight: 22,
    fontWeight: "600",
    color: "#e2e8f0",
    textAlign: "center",
    writingDirection: "rtl",
  },
  lockCta: {
    marginTop: 14,
    backgroundColor: "#fbbf24",
    borderRadius: 14,
    paddingHorizontal: 26,
    paddingVertical: 11,
  },
  lockCtaText: { fontSize: 15, fontWeight: "900", color: "#0b1220", writingDirection: "rtl" },
  finaleWrap: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", zIndex: 30 },
  finaleCard: {
    marginHorizontal: 26,
    backgroundColor: "rgba(4,18,31,0.96)",
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "rgba(251,191,36,0.8)",
    paddingHorizontal: 26,
    paddingVertical: 22,
    alignItems: "center",
  },
  finaleTitle: { fontSize: 20, fontWeight: "900", color: "#fbbf24", writingDirection: "rtl", marginBottom: 8, textAlign: "center" },
  finaleBody: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "700",
    color: "#e2e8f0",
    textAlign: "center",
    writingDirection: "rtl",
  },
  finaleCountdown: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "rgba(251,191,36,0.9)",
    writingDirection: "rtl",
    marginTop: 8,
  },
  finaleCta: {
    marginTop: 16,
    backgroundColor: "#fbbf24",
    borderRadius: 14,
    paddingHorizontal: 30,
    paddingVertical: 12,
  },
  finaleCtaText: { fontSize: 15.5, fontWeight: "900", color: "#0b1220", writingDirection: "rtl" },
});
