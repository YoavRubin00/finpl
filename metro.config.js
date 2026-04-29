const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Enable modern resolution so import.meta works on web (needed by reanimated v4)
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = [
  "browser",
  "require",
  "react-native",
];

// ---------------------------------------------------------------------------
// Redirect lottie-react-native → SafeLottieView on web
// lottie-react-native renders canvas/SVG that overflows containers on web.
// Our SafeLottieView.web.tsx stub renders an empty View instead.
// ---------------------------------------------------------------------------
const SAFE_LOTTIE_WEB = path.resolve(
  __dirname,
  "src/components/ui/SafeLottieView.web.tsx"
);
const ADS_WEB_STUB = path.resolve(
  __dirname,
  "src/lib/googleMobileAds.web.ts"
);
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === "lottie-react-native" &&
    platform === "web" &&
    // Allow SafeLottieView.tsx (native) to import the real package
    !context.originModulePath?.includes("SafeLottieView")
  ) {
    return { filePath: SAFE_LOTTIE_WEB, type: "sourceFile" };
  }
  if (moduleName === "react-native-google-mobile-ads" && platform === "web") {
    return { filePath: ADS_WEB_STUB, type: "sourceFile" };
  }
  // Fall through to default resolver
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
