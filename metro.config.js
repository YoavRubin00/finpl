const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Enable modern package-exports resolution.
config.resolver.unstable_enablePackageExports = true;
// Two corrections to the previous override, both needed for the native voice SDK:
//  1. "browser" MUST be web-only. Globally it was active on native too, so
//     @elevenlabs/react-native (browser→web build) resolved wrong on Android.
//  2. "import" MUST be present (it's a Metro default the old override dropped).
//     livekit-client's exports are ONLY { import: *.esm.mjs, require: *.umd.js }.
//     Without "import", native matched "require" → the UMD build, which is
//     browser-targeted and throws at eval on Hermes → require('livekit-client')
//     returned undefined → @livekit/react-native → @elevenlabs/react-native all
//     cascaded to undefined → the shark voice call crashed (PostHog probe:
//     livekit-client=undefined, registerGlobals fails). With "import", native
//     resolves the ESM build, which Metro transpiles cleanly.
// "browser" stays web-only (reanimated v4 import.meta) via conditionsByPlatform.
config.resolver.unstable_conditionNames = ["require", "import", "react-native"];
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
