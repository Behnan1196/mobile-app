const { withAndroidManifest } = require('@expo/config-plugins');

const withAndroidManifestPlugin = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    
    // Find the application tag
    const application = androidManifest.manifest.application[0];
    
    // Add tools namespace if not present
    if (!androidManifest.manifest.$['xmlns:tools']) {
      androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }
    
    // Find and update Firebase notification metadata
    if (application['meta-data']) {
      application['meta-data'].forEach((metaData) => {
        if (metaData.$['android:name'] === 'com.google.firebase.messaging.default_notification_channel_id') {
          metaData.$['tools:replace'] = 'android:value';
        }
        if (metaData.$['android:name'] === 'com.google.firebase.messaging.default_notification_color') {
          metaData.$['tools:replace'] = 'android:resource';
        }
      });
    }
    
    return config;
  });
};

module.exports = withAndroidManifestPlugin;
