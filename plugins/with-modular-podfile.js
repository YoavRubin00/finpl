const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Patches the auto-generated ios/Podfile so that @react-native-firebase
 * (built as a static framework via useFrameworks=static) can include
 * React-Core's headers without tripping
 * -Wnon-modular-include-in-framework-module under -Werror.
 *
 * Two changes:
 *   1. `use_modular_headers!` at the top of the file — instructs
 *      CocoaPods to install pods with module maps where possible.
 *      This alone does not always cover pods added via the
 *      use_react_native! macro, so we also add #2.
 *   2. A post_install hook that sets DEFINES_MODULE=YES on every
 *      Pods target. This forces Xcode to emit a module map for each
 *      pod (React-Core, React-RCTBridge, etc.) which is what the
 *      RNFBApp framework's #include directives need.
 *
 * Idempotent — both edits skip when the marker text is already present
 * so re-running prebuild does not duplicate.
 */
module.exports = function withModularPodfile(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');
      let touched = false;

      // 1. use_modular_headers! at the top (above the first `require`).
      if (!contents.includes('use_modular_headers!')) {
        contents = `use_modular_headers!\n${contents}`;
        touched = true;
      }

      // 2. Append post_install hook that forces DEFINES_MODULE=YES on every
      //    pod target. Keeps any existing post_install block intact by
      //    appending our own as a separate top-level hook (CocoaPods allows
      //    multiple post_install blocks; they all execute).
      const HOOK_MARKER = '# with-modular-podfile: DEFINES_MODULE hook';
      if (!contents.includes(HOOK_MARKER)) {
        contents += `\n${HOOK_MARKER}\npost_install do |installer|\n  installer.pods_project.targets.each do |target|\n    target.build_configurations.each do |config|\n      config.build_settings['DEFINES_MODULE'] = 'YES'\n    end\n  end\nend\n`;
        touched = true;
      }

      if (touched) {
        fs.writeFileSync(podfilePath, contents);
        // Surface plugin execution in the EAS prebuild logs so failures
        // here are visible without having to inspect the file system.
        // eslint-disable-next-line no-console
        console.log('[with-modular-podfile] Patched Podfile (use_modular_headers! + DEFINES_MODULE post_install).');
      }
      return cfg;
    },
  ]);
};