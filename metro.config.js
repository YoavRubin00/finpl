const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Enable modern package-exports resolution.
config.resolver.unstable_enablePackageExports = true;
// "browser" MUST be web-only. When it was in the GLOBAL condition list it was
// active on native too, so any package with a "browser" exports condition
// (@elevenlabs/react-native, livekit-client, @livekit/components-react, …)
// resolved to its WEB build on Android. Those throw at eval on Hermes →
// require() returns undefined → the shark voice call crashed (PostHog:
// "Cannot read property 'ConversationProvider' of undefined", Android only;
// web was fine). Keep "browser" for web (reanimated v4 import.meta) via
// unstable_conditionsByPlatform; native now gets only require/react-native.
config.resolver.unstable_conditionNames = ["require", "react-native"];
config.resolver.unstable_conditionsByPlatform = { web: ["browser"] };

// ---------------------------------------------------------------------------
// Redirect lottie-react-native → SafeLottieView on web
// lottie-react-native renders canvas/SVG that overflows containers on web.
// Our SafeLottieView.web.tsx stub renders an empty View instead.
// ---------------------------------------------------------------------------
const SAFE_LOTTIE_WEB = path.resolve(
  __dirname,
  "src/components/ui/SafeLottieView.web.tsx"
);
// Empty stub for native-only modules on web (e.g. react-native-google-mobile-ads,
// which references native codegen that doesn't bundle on web).
const EMPTY_WEB_STUB = path.resolve(__dirname, "src/lib/empty-module.web.js");

const NATIVE_ONLY_WEB_STUBS = new Set([
  "react-native-google-mobile-ads",
]);

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === "lottie-react-native" &&
    platform === "web" &&
    !context.originModulePath?.includes("SafeLottieView")
  ) {
    return { filePath: SAFE_LOTTIE_WEB, type: "sourceFile" };
  }
  if (platform === "web" && NATIVE_ONLY_WEB_STUBS.has(moduleName)) {
    return { filePath: EMPTY_WEB_STUB, type: "sourceFile" };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
