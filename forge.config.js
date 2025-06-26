module.exports = {
  packagerConfig: {
    asar: true,
    icon: './assets/icon',
    extraResource: [],
    osxSign: {},
    osxNotarize: {
      tool: 'notarytool',
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID
    }
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'zeami_term'
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin']
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          maintainer: 'Zeami Team',
          homepage: 'https://github.com/zeami/zeami-term'
        }
      }
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {}
    }
  ],
  publishers: [],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {}
    }
  ],
  hooks: {}
};