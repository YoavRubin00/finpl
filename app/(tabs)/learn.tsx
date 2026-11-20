import { useCallback } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from "expo-router";
import { learnMapHref } from "../../src/lib/navigation/learnMap";

/**
 * `/(tabs)/learn` is a redirect to the one learn map at `/(tabs)/index`.
 *
 * It used to mount a second full DuoLearnScreen, and every link here (push
 * notifications, lesson exits, games, the Bridge) left that second map running
 * next to the first for the rest of the session: double the SVG, the timers
 * and the animations (heat audit 13.11, perf pass 20.11).
 *
 * The route stays registered so old links, already-scheduled notifications and
 * server pushes keep resolving. On every focus it forwards to the index tab with
 * the same query params (completedPhase / completedModuleId / expandedModule /
 * openPearl ...), which DuoLearnScreen reads from its own params. `replace` inside
 * the tab navigator is a jump to the index tab, so nothing is added to history.
 * The map never links back here, so this cannot loop.
 */
export default function LearnRedirect() {
  const router = useRouter();
  const params = useLocalSearchParams();
  // Router-internal params (`__…`) are not part of the link. A string, so the
  // effect below re-runs only when the link really changes.
  const href = learnMapHref(
    Object.fromEntries(Object.entries(params).filter(([key]) => !key.startsWith("__"))),
  );
  useFocusEffect(
    useCallback(() => {
      router.replace(href as Href);
    }, [router, href]),
  );
  return null;
}
