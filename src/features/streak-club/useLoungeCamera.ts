import { useCallback } from "react";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useReducedMotion,
  Easing,
} from "react-native-reanimated";

/**
 * מצלמת הטרקלין — זום קולנועי אל נקודה.
 *
 * אותה מתמטיקת-טרנספורם כמו zoomStyle של FlashcardInfographic (המנגנון
 * הבוגר של קלפי ה-dive), מיושמת כ-hook עצמאי. הסקייל מוחל סביב מרכז
 * הקונטיינר, ולכן כדי שנקודה P (בקואורדינטות-קונטיינר, px) תנחת במרכז:
 *   translateX = (W/2 - P.x) * S,  translateY = (H/2 - P.y) * S.
 * הנקודה מגיעה מה-Sheet כבר מתורגמת מגאומטריית ה-scene-frame (cover) —
 * כך הזום מדויק בכל יחס-מסך. spring עם overshoot קל; reduced-motion
 * מקבל cut מיידי. הכל UI-thread — אפס עבודה ב-JS בזמן האנימציה.
 */
export function useLoungeCamera() {
  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  const focusPoint = useCallback(
    (px: number, py: number, s: number, containerW: number, containerH: number) => {
      const targetX = (containerW / 2 - px) * s;
      const targetY = (containerH / 2 - py) * s;
      if (reducedMotion) {
        scale.value = withTiming(s, { duration: 0 });
        tx.value = withTiming(targetX, { duration: 0 });
        ty.value = withTiming(targetY, { duration: 0 });
        return;
      }
      // damping נמוך-יחסית → overshoot עדין של המצלמה בנחיתה
      const spring = { damping: 16, stiffness: 140, mass: 0.9 } as const;
      scale.value = withSpring(s, spring);
      tx.value = withSpring(targetX, spring);
      ty.value = withSpring(targetY, spring);
    },
    [reducedMotion, scale, tx, ty],
  );

  const reset = useCallback(() => {
    if (reducedMotion) {
      scale.value = withTiming(1, { duration: 0 });
      tx.value = withTiming(0, { duration: 0 });
      ty.value = withTiming(0, { duration: 0 });
      return;
    }
    const cfg = { duration: 320, easing: Easing.out(Easing.cubic) } as const;
    scale.value = withTiming(1, cfg);
    tx.value = withTiming(0, cfg);
    ty.value = withTiming(0, cfg);
  }, [reducedMotion, scale, tx, ty]);

  const cameraStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  // ה-hotspots נמוגים כשהמצלמה נכנסת (שלא יצופו מעל הדק המזומם)
  const hotspotFadeStyle = useAnimatedStyle(() => ({
    opacity: scale.value > 1.05 ? withTiming(0, { duration: 140 }) : withTiming(1, { duration: 220 }),
  }));

  return { focusPoint, reset, cameraStyle, hotspotFadeStyle };
}
