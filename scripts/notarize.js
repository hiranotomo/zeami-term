const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  
  if (electronPlatformName !== 'darwin') {
    return;
  }

  // Skip notarization in CI or if credentials are not set
  if (!process.env.APPLE_ID || !process.env.APPLE_APP_SPECIFIC_PASSWORD) {
    console.log('Skipping notarization: Apple credentials not found');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  console.log('Notarizing application...');
  console.log(`App: ${appPath}`);

  try {
    await notarize({
      appBundleId: 'com.zeami.term',
      appPath: appPath,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID
    });
    console.log('Notarization complete');
  } catch (error) {
    console.error('Notarization failed:', error);
    throw error;
  }
};