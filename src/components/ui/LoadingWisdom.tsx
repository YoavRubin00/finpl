import { View, StyleSheet, Image } from "react-native";

/** Splash screen, shows Finn profile image fullscreen */
export function LoadingWisdom() {
  return (
    <View style={styles.root} accessible accessibilityLabel="FinPlay טוען, אנא המתן">
      <Image
        source={{ uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/images/finn/finn-profile.png' }}
        style={styles.image}
        resizeMode="cover"
        accessible={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f0f9ff",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
