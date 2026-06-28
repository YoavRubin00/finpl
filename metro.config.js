const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Enable modern package-exports resolution.
config.resolver.unstable_enablePackageExports = true;
// "browser" is web-only (reanimated v4 import.meta on web; on native it made
// @elevenlabs/react-native resolve to its web build → voice crash).
// Do NOT add "import" to the GLOBAL native conditions: it flips many packages to
// their ESM build and CRASHED THE APP AT BOOT on Hermes (Yoav 2026-06-28). The
// one package that genuinely needs its ESM build — livekit-client, whose
// "require" export is a browser-targeted UMD that throws on Hermes → undefined →
// breaks the @livekit/react-native voice chain — is redirected per-package in
// resolveRequest below. That's boot-safe because livekit-client only loads at
// call time, never at startup.
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

// livekit-client's "require" export is a browser UMD build that throws at eval on
// Hermes (→ undefined → breaks the @livekit/react-native → @elevenlabs voice
// chain). Point native at its ESM build instead. Scoped to this ONE package so
// app-wide resolution + boot stay untouched (a global "import" condition crashed boot).
const LIVEKIT_CLIENT_ESM = path.resolve(__dirname, "node_modules/livekit-client/dist/livekit-client.esm.mjs");

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
  // Native only: force livekit-client to its ESM build (see LIVEKIT_CLIENT_ESM).
  if (platform !== "web" && moduleName === "livekit-client") {
    return { filePath: LIVEKIT_CLIENT_ESM, type: "sourceFile" };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
