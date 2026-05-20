const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Patches the auto-generated ios/Podfile so that @react-native-firebase
 * (built as a static framework via useFrameworks=static) can include
 * React-Core's headers without tripping
 * -Wnon-modular-include-in-framework-module under -Werror.
 *
 * Four changes:
 *   1. `use_modular_headers!` at the top of the file — instructs
 *      CocoaPods to install pods with module maps where possible.
 *      Alone this does not cover pods loaded via use_react_native!
 *      autolinking, hence the post_install changes.
 *   2. DEFINES_MODULE=YES on every Pods target — forces Xcode to emit
 *      a module map for every pod including React-Core, which is what
 *      RNFBApp's #include <React/RCTConvert.h> needs.
 *   3. CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES=YES —
 *      direct counterpart of -Wnon-modular-include-in-framework-module;
 *      bypasses the -Werror trip when DEFINES_MODULE alone can't make
 *      React-Core headers modular.
 *   4. CLANG_ENABLE_EXPLICIT_MODULES=NO — reverts Xcode 16+ Explicit
 *      Modules to Implicit. Explicit Modules turns missing @imports
 *      into hard errors ("declaration of 'RCTBridgeModule' must be
 *      imported from module 'RNFBApp.RNFBAppModule' before it is
 *      required"), which RN Firebase v24's header chain can't satisfy.
 *      Implicit Modules restores Xcode 15 behavior.
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

      // 2+3+4. Inject DEFINES_MODULE=YES, CLANG_ALLOW_NON_MODULAR_INCLUDES,
      // and CLANG_ENABLE_EXPLICIT_MODULES=NO INTO the existing post_install
      // block. Marker bumped so stale Podfiles patched by the previous
      // version get re-patched on next prebuild.
      const HOOK_MARKER = '# with-modular-podfile: DEFINES_MODULE+ALLOW_NON_MODULAR+NO_EXPLICIT_MODULES';
      if (!contents.includes(HOOK_MARKER)) {
        const injection = `\n    ${HOOK_MARKER}\n    installer.pods_project.targets.each do |target|\n      target.build_configurations.each do |config|\n        config.build_settings['DEFINES_MODULE'] = 'YES'\n        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'\n        config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'\n      end\n    end\n`;
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
        console.log('[with-modular-podfile] Patched Podfile (use_modular_headers! + DEFINES_MODULE + CLANG_ALLOW_NON_MODULAR + NO_EXPLICIT_MODULES inside existing post_install).');
      }
      return cfg;
    },
  ]);
};