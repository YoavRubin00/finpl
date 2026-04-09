import { type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Polygon } from "react-native-svg";

interface BannerRibbonProps {
  title: string;
  icon?: ReactNode;
}

const NOTCH_WIDTH = 12;
const BANNER_HEIGHT = 44;
const GOLD = "#d4a017";

export function BannerRibbon({ title, icon }: BannerRibbonProps) {
  return (
    <View style={styles.wrapper}>
      {/* Left notch */}
      <View style={styles.notch}>
        <Svg
          width={NOTCH_WIDTH}
          height={BANNER_HEIGHT}
          viewBox={`0 0 ${NOTCH_WIDTH} ${BANNER_HEIGHT}`}
        >
          <Polygon
            points={`${NOTCH_WIDTH},0 ${NOTCH_WIDTH},${BANNER_HEIGHT} 0,${BANNER_HEIGHT * 0.15} 0,${BANNER_HEIGHT * 0.85}`}
            fill="#1e40af"
          />
          <Polygon
            points={`${NOTCH_WIDTH},0 ${NOTCH_WIDTH},2 0,${BANNER_HEIGHT * 0.15}`}
            fill={GOLD}
          />
          <Polygon
            points={`${NOTCH_WIDTH},${BANNER_HEIGHT - 2} ${NOTCH_WIDTH},${BANNER_HEIGHT} 0,${BANNER_HEIGHT * 0.85}`}
            fill={GOLD}
          />
        </Svg>
      </View>

      {/* Main banner body */}
      <View style={styles.bannerBody}>
        {/* Gold top border */}
        <View style={styles.borderTop} />

        <LinearGradient
          colors={["#1e40af", "#2563eb"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          <Text style={styles.title}>{title}</Text>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
        </LinearGradient>

        {/* Gold bottom border */}
        <View style={styles.borderBottom} />
      </View>

      {/* Right notch */}
      <View style={styles.notch}>
        <Svg
          width={NOTCH_WIDTH}
          height={BANNER_HEIGHT}
          viewBox={`0 0 ${NOTCH_WIDTH} ${BANNER_HEIGHT}`}
        >
          <Polygon
            points={`0,0 0,${BANNER_HEIGHT} ${NOTCH_WIDTH},${BANNER_HEIGHT * 0.85} ${NOTCH_WIDTH},${BANNER_HEIGHT * 0.15}`}
            fill="#2563eb"
          />
          <Polygon
            points={`0,0 0,2 ${NOTCH_WIDTH},${BANNER_HEIGHT * 0.15}`}
            fill={GOLD}
          />
          <Polygon
            points={`0,${BANNER_HEIGHT - 2} 0,${BANNER_HEIGHT} ${NOTCH_WIDTH},${BANNER_HEIGHT * 0.85}`}
            fill={GOLD}
          />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 8,
    height: BANNER_HEIGHT,
  },
  notch: {
    width: NOTCH_WIDTH,
    height: BANNER_HEIGHT,
  },
  bannerBody: {
    flex: 1,
    height: BANNER_HEIGHT,
  },
  borderTop: {
    height: 2,
    backgroundColor: GOLD,
  },
  borderBottom: {
    height: 2,
    backgroundColor: GOLD,
  },
  gradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  title: {
    fontWeight: "900",
    color: "#ffffff",
    fontSize: 17,
    textAlign: "center",
    letterSpacing: 1,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  iconContainer: {
    marginLeft: 8,
  },
});
