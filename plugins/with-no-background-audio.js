const { withInfoPlist, withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

/**
 * Strip background-audio + foreground-media-playback artifacts that
 * expo-audio's autolinking injects but FinPlay does not actually use.
 *
 * iOS:     remove "audio" from UIBackgroundModes (Apple 2.5.4)
 * Android: force-remove FOREGROUND_SERVICE_MEDIA_PLAYBACK / FOREGROUND_SERVICE
 *          uses-permission via tools:node="remove" so the manifest merger
 *          drops anything autolinked native modules try to declare.
 *          Also marks MainActivity resizeableActivity=true so Android 16
 *          large-screen warnings clear without unlocking portrait.
 */
function withNoBackgroundAudioIos(config) {
  return withInfoPlist(config, (cfg) => {
    const modes = cfg.modResults.UIBackgroundModes;
    if (Array.isArray(modes)) {
      const filtered = modes.filter((m) => m !== 'audio');
      if (filtered.length === 0) delete cfg.modResults.UIBackgroundModes;
      else cfg.modResults.UIBackgroundModes = filtered;
    }
    return cfg;
  });
}

const BLOCKED_ANDROID_PERMS = [
  'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
  'android.permission.FOREGROUND_SERVICE',
];

function withNoBackgroundAudioAndroid(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    manifest.$ = manifest.$ || {};
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    if (Array.isArray(manifest['uses-permission'])) {
      manifest['uses-permission'] = manifest['uses-permission'].filter(
        (p) => p && p.$ && !BLOCKED_ANDROID_PERMS.includes(p.$['android:name'])
      );
    }
    manifest['uses-permission'] = manifest['uses-permission'] || [];

    for (const perm of BLOCKED_ANDROID_PERMS) {
      manifest['uses-permission'].push({
        $: {
          'android:name': perm,
          'tools:node': 'remove',
        },
      });
    }

    const mainApp = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    if (Array.isArray(mainApp.activity)) {
      for (const act of mainApp.activity) {
        const name = act && act.$ && act.$['android:name'];
        if (typeof name === 'string' && name.endsWith('.MainActivity')) {
          act.$['android:resizeableActivity'] = 'true';
        }
      }
    }

    return cfg;
  });
}

module.exports = function withNoBackgroundAudio(config) {
  config = withNoBackgroundAudioIos(config);
  config = withNoBackgroundAudioAndroid(config);
  return config;
};
