const { withInfoPlist } = require('@expo/config-plugins');

/**
 * Strip "audio" from UIBackgroundModes after all upstream plugins
 * (expo-audio in particular) have injected their entries.
 *
 * Apple App Review 2.5.4: rejected build 107 because expo-audio
 * declared background-audio capability the app doesn't use. FinPlay
 * uses expo-audio for foreground sound effects + lesson music only.
 */
module.exports = function withNoBackgroundAudio(config) {
  return withInfoPlist(config, (cfg) => {
    const modes = cfg.modResults.UIBackgroundModes;
    if (Array.isArray(modes)) {
      const filtered = modes.filter((m) => m !== 'audio');
      if (filtered.length === 0) {
        delete cfg.modResults.UIBackgroundModes;
      } else {
        cfg.modResults.UIBackgroundModes = filtered;
      }
    }
    return cfg;
  });
};