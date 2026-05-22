import { View, StyleSheet } from "react-native";

/** Hydration placeholder — solid background matching AppIntroSplash so the
 *  user goes straight from native splash → blank dark frame → intro video
 *  with no flash of a static Finn image in between. The dark color
 *  (#0c1426) is also the AppIntroSplash background, so the transition is
 *  invisible to the user. */
export function LoadingWisdom() {
  return (
    <View style={styles.root} accessible accessibilityLabel="FinPlay טוען, אנא המתן" />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0c1426",
  },
});
