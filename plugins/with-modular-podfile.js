const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Patches the auto-generated ios/Podfile so that @react-native-firebase
 * (built as a static framework via useFrameworks=static) can include
 * React-Core's headers without tripping
 * -Wnon-modular-include-in-framework-module under -Werror.
 *
 * Three changes:
 *   1. `use_modular_headers!` at the top of the file — instructs
 *      CocoaPods to install pods with module maps where possible.
 *      Alone this does not cover pods loaded via use_react_native!
 *      autolinking, hence change #2.
 *   2. Inject DEFINES_MODULE=YES INTO Expo's existing post_install
 *      block (not as a new block — CocoaPods bans multiple
 *      post_install hooks). This forces Xcode to emit a module map
 *      for every pod target including React-Core, which is what
 *      RNFBApp's #include <React/RCTConvert.h> needs.
 *   3. Also set CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES
 *      to YES. Xcode 16 Explicit Modules (visible in build logs as
 *      `ExplicitPrecompiledModules/RNFBApp-*.scan`) enforces modular
 *      includes stricter than DEFINES_MODULE alone can satisfy when
 *      React-Core headers stay non-modular. This flag is the direct
 *      counterpart of -Wnon-modular-include-in-framework-module and
 *      bypasses the -Werror trip.
 *
 * Idempotent — both edits check for marker text and skip if present.
 */
module.exports = function withModularPodfile(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');
      let touched = false;

      // 1. use_modular_headers! at the top of the file.
      if (!contents.includes('use_modular_headers!')) {
        contents = `use_modular_headers!\n${contents}`;
        touched = true;
      }

      // 2+3. Inject DEFINES_MODULE=YES and CLANG_ALLOW_NON_MODULAR_INCLUDES
      // INTO the existing post_install block. Marker bumped so stale Podfiles
      // patched by the previous version get re-patched on next prebuild.
      const HOOK_MARKER = '# with-modular-podfile: DEFINES_MODULE+ALLOW_NON_MODULAR';
      if (!contents.includes(HOOK_MARKER)) {
        const injection = `\n    ${HOOK_MARKER}\n    installer.pods_project.targets.each do |target|\n      target.build_configurations.each do |config|\n        config.build_settings['DEFINES_MODULE'] = 'YES'\n        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'\n      end\n    end\n`;
        const match = contents.match(/(post_install\s+do\s+\|installer\|\s*\n)/);
        if (match) {
          contents = contents.replace(match[1], `${match[1]}${injection}`);
          touched = true;
        } else {
          // Fallback: no existing post_install block found — add our own.
          // (Shouldn't happen on Expo-generated Podfiles but safer to handle.)
          contents += `\npost_install do |installer|${injection}end\n`;
          touched = true;
        }
      }

      if (touched) {
        fs.writeFileSync(podfilePath, contents);
        // eslint-disable-next-line no-console
        console.log('[with-modular-podfile] Patched Podfile (use_modular_headers! + DEFINES_MODULE + CLANG_ALLOW_NON_MODULAR inside existing post_install).');
      }
      return cfg;
    },
  ]);
};