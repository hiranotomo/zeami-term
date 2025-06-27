/**
 * Custom GitHub Release Provider for private repos with public releases
 */

const { Provider } = require('electron-updater');
const { net } = require('electron');

class GitHubPublicReleaseProvider extends Provider {
  constructor(configuration, updater, runtimeOptions) {
    super(runtimeOptions);
    this.configuration = configuration;
    this.updater = updater;
    this.baseApiUrl = `https://api.github.com/repos/${configuration.owner}/${configuration.repo}`;
  }

  async getLatestVersion() {
    const url = `${this.baseApiUrl}/releases/latest`;
    
    return new Promise((resolve, reject) => {
      const request = net.request({
        method: 'GET',
        url: url,
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'zeami-term-updater'
        }
      });

      let responseData = '';

      request.on('response', (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`GitHub API returned ${response.statusCode}`));
          return;
        }

        response.on('data', (chunk) => {
          responseData += chunk;
        });

        response.on('end', () => {
          try {
            const release = JSON.parse(responseData);
            const updateInfo = this.parseReleaseData(release);
            resolve(updateInfo);
          } catch (error) {
            reject(error);
          }
        });
      });

      request.on('error', (error) => {
        reject(error);
      });

      request.end();
    });
  }

  parseReleaseData(release) {
    // Find the latest-mac.yml file
    const yamlAsset = release.assets.find(asset => 
      asset.name === 'latest-mac.yml' || 
      asset.name === 'latest.yml'
    );

    if (!yamlAsset) {
      throw new Error('No update metadata file found');
    }

    // Return update info structure
    return {
      version: release.tag_name.replace(/^v/, ''),
      releaseDate: release.published_at,
      releaseNotes: release.body,
      releaseName: release.name,
      files: release.assets.map(asset => ({
        url: asset.browser_download_url,
        sha512: '', // Will be fetched from latest-mac.yml
        size: asset.size
      }))
    };
  }

  async getUpdateFile(updateInfo) {
    // This method would download the actual update file
    // For now, we'll use the standard GitHub provider behavior
    return updateInfo;
  }
}

module.exports = GitHubPublicReleaseProvider;