const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Injects `use_modular_headers!` into the iOS Podfile so React-Core's
 * headers compile as modular ones. Required when using
 * `useFrameworks: "static"` together with @react-native-firebase/app —
 * RNFBApp is built as a framework and #includes React/RCTConvert.h,
 * which is non-modular by default and trips -Wnon-modular-include-in-
 * framework-module under -Werror.
 *
 * Idempotent: skips if `use_modular_headers!` is already present.
 */
module.exports = function withModularPodfile(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');
      if (contents.includes('use_modular_headers!')) {
        return cfg;
      }
      // Insert immediately inside the main target block so it applies to
      // every pod that gets autolinked into the app target.
      const updated = contents.replace(
        /(target\s+['"][^'"]+['"]\s+do\s*\n)/,
        `$1  use_modular_headers!\n`,
      );
      if (updated === contents) {
        // Fallback: prepend at top of the Podfile if no target block matched.
        fs.writeFileSync(podfilePath, `use_modular_headers!\n${contents}`);
      } else {
        fs.writeFileSync(podfilePath, updated);
      }
      return cfg;
    },
  ]);
};