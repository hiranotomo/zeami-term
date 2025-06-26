/**
 * Auto-updater configuration for private repository
 */

// For private repositories, we need to use the GitHub API URL directly
// This bypasses the Atom feed which requires authentication
exports.getUpdaterConfig = () => {
  return {
    provider: 'github',
    owner: 'hiranotomo',
    repo: 'zeami-term',
    releaseType: 'release',
    private: true,
    // Use direct API URL to avoid authentication issues
    updaterCacheDirName: 'zeami-term-updater'
  };
};

// Alternative: Use generic provider with direct URLs
exports.getGenericConfig = () => {
  return {
    provider: 'generic',
    url: 'https://github.com/hiranotomo/zeami-term/releases/download/latest',
    updaterCacheDirName: 'zeami-term-updater'
  };
};