/**
 * TerminalProfileManager - Manage terminal profiles with different shells and configurations
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class TerminalProfileManager {
  constructor() {
    this.profiles = new Map();
    this.defaultProfileId = null;
    this.configPath = path.join(os.homedir(), '.zeami-term', 'profiles.json');
    
    // Default profiles
    this.initializeDefaultProfiles();
  }
  
  /**
   * Initialize with default profiles
   */
  initializeDefaultProfiles() {
    // Detect available shells
    const shells = this.detectAvailableShells();
    
    // Bash profile
    if (shells.bash) {
      this.addProfile({
        id: 'bash-default',
        name: 'Bash',
        shell: shells.bash,
        args: ['--login'],
        env: {},
        icon: 'terminal-bash',
        color: '#4EAA25',
        isDefault: true
      });
    }
    
    // Zsh profile
    if (shells.zsh) {
      this.addProfile({
        id: 'zsh-default',
        name: 'Zsh',
        shell: shells.zsh,
        args: ['-l'],
        env: {},
        icon: 'terminal',
        color: '#C397D8'
      });
    }
    
    // Fish profile
    if (shells.fish) {
      this.addProfile({
        id: 'fish-default',
        name: 'Fish',
        shell: shells.fish,
        args: [],
        env: {},
        icon: 'terminal',
        color: '#4B9FDE'
      });
    }
    
    // PowerShell profile (Windows/macOS/Linux)
    if (shells.pwsh) {
      this.addProfile({
        id: 'pwsh-default',
        name: 'PowerShell',
        shell: shells.pwsh,
        args: ['-NoLogo'],
        env: {},
        icon: 'terminal-powershell',
        color: '#012456'
      });
    }
    
    // Node.js REPL profile
    this.addProfile({
      id: 'node-repl',
      name: 'Node.js REPL',
      shell: process.execPath,
      args: [],
      env: {},
      icon: 'terminal-node',
      color: '#68A063'
    });
    
    // Python REPL profile
    if (shells.python) {
      this.addProfile({
        id: 'python-repl',
        name: 'Python REPL',
        shell: shells.python,
        args: ['-i'],
        env: {
          PYTHONIOENCODING: 'utf-8'
        },
        icon: 'terminal-python',
        color: '#3776AB'
      });
    }
  }
  
  /**
   * Detect available shells on the system
   */
  detectAvailableShells() {
    const shells = {};
    const { execSync } = require('child_process');
    
    // Common shell paths
    const shellPaths = {
      bash: ['/bin/bash', '/usr/bin/bash', '/usr/local/bin/bash'],
      zsh: ['/bin/zsh', '/usr/bin/zsh', '/usr/local/bin/zsh'],
      fish: ['/usr/bin/fish', '/usr/local/bin/fish'],
      pwsh: ['/usr/bin/pwsh', '/usr/local/bin/pwsh', 'pwsh'],
      python: ['python3', 'python', '/usr/bin/python3', '/usr/local/bin/python3']
    };
    
    // Check each shell
    for (const [name, paths] of Object.entries(shellPaths)) {
      for (const shellPath of paths) {
        try {
          // Check if shell exists
          if (name === 'pwsh' && shellPath === 'pwsh') {
            // Special case for PowerShell in PATH
            execSync('which pwsh', { stdio: 'ignore' });
            shells[name] = 'pwsh';
            break;
          } else {
            const stats = require('fs').statSync(shellPath);
            if (stats.isFile()) {
              shells[name] = shellPath;
              break;
            }
          }
        } catch (error) {
          // Shell not found, continue
        }
      }
    }
    
    return shells;
  }
  
  /**
   * Add a new profile
   */
  addProfile(profile) {
    // Validate profile
    if (!profile.id || !profile.name || !profile.shell) {
      throw new Error('Profile must have id, name, and shell');
    }
    
    // Set defaults
    profile = {
      args: [],
      env: {},
      icon: 'terminal',
      color: '#007ACC',
      cwd: null,
      ...profile
    };
    
    this.profiles.set(profile.id, profile);
    
    // Set as default if it's the first profile or marked as default
    if (this.profiles.size === 1 || profile.isDefault) {
      this.defaultProfileId = profile.id;
    }
    
    return profile;
  }
  
  /**
   * Get a profile by ID
   */
  getProfile(id) {
    return this.profiles.get(id);
  }
  
  /**
   * Get all profiles
   */
  getAllProfiles() {
    return Array.from(this.profiles.values());
  }
  
  /**
   * Get default profile
   */
  getDefaultProfile() {
    if (this.defaultProfileId) {
      return this.profiles.get(this.defaultProfileId);
    }
    
    // Return first profile if no default set
    const profiles = this.getAllProfiles();
    return profiles.length > 0 ? profiles[0] : null;
  }
  
  /**
   * Set default profile
   */
  setDefaultProfile(id) {
    if (!this.profiles.has(id)) {
      throw new Error(`Profile ${id} not found`);
    }
    
    this.defaultProfileId = id;
  }
  
  /**
   * Update a profile
   */
  updateProfile(id, updates) {
    const profile = this.profiles.get(id);
    if (!profile) {
      throw new Error(`Profile ${id} not found`);
    }
    
    // Update profile
    Object.assign(profile, updates);
    
    return profile;
  }
  
  /**
   * Delete a profile
   */
  deleteProfile(id) {
    // Can't delete default built-in profiles
    if (id.endsWith('-default')) {
      throw new Error('Cannot delete default profiles');
    }
    
    const deleted = this.profiles.delete(id);
    
    // Update default if needed
    if (deleted && this.defaultProfileId === id) {
      const profiles = this.getAllProfiles();
      this.defaultProfileId = profiles.length > 0 ? profiles[0].id : null;
    }
    
    return deleted;
  }
  
  /**
   * Create terminal options from profile
   */
  createTerminalOptions(profileId, overrides = {}) {
    const profile = profileId ? this.getProfile(profileId) : this.getDefaultProfile();
    
    if (!profile) {
      throw new Error('No profile available');
    }
    
    // Merge profile settings with overrides
    return {
      shell: profile.shell,
      args: profile.args,
      env: {
        ...process.env,
        ...profile.env,
        ZEAMI_PROFILE: profile.id,
        ZEAMI_PROFILE_NAME: profile.name,
        ...overrides.env
      },
      cwd: overrides.cwd || profile.cwd || process.env.HOME,
      cols: overrides.cols || 80,
      rows: overrides.rows || 30,
      profile: profile
    };
  }
  
  /**
   * Save profiles to disk
   */
  async saveProfiles() {
    const data = {
      version: '1.0',
      defaultProfileId: this.defaultProfileId,
      profiles: Array.from(this.profiles.entries()).map(([id, profile]) => ({
        ...profile,
        id
      }))
    };
    
    // Ensure config directory exists
    const configDir = path.dirname(this.configPath);
    await fs.mkdir(configDir, { recursive: true });
    
    // Write profiles
    await fs.writeFile(this.configPath, JSON.stringify(data, null, 2));
  }
  
  /**
   * Load profiles from disk
   */
  async loadProfiles() {
    try {
      const data = await fs.readFile(this.configPath, 'utf8');
      const config = JSON.parse(data);
      
      // Clear existing profiles (except defaults)
      for (const [id, profile] of this.profiles) {
        if (!id.endsWith('-default')) {
          this.profiles.delete(id);
        }
      }
      
      // Load saved profiles
      if (config.profiles) {
        for (const profile of config.profiles) {
          if (!profile.id.endsWith('-default')) {
            this.addProfile(profile);
          }
        }
      }
      
      // Set default profile
      if (config.defaultProfileId && this.profiles.has(config.defaultProfileId)) {
        this.defaultProfileId = config.defaultProfileId;
      }
    } catch (error) {
      // Config doesn't exist or is invalid, use defaults
      console.log('[ProfileManager] No saved profiles found, using defaults');
    }
  }
  
  /**
   * Export profile for sharing
   */
  exportProfile(id) {
    const profile = this.getProfile(id);
    if (!profile) {
      throw new Error(`Profile ${id} not found`);
    }
    
    // Remove internal properties
    const { isDefault, ...exportedProfile } = profile;
    
    return {
      version: '1.0',
      profile: exportedProfile
    };
  }
  
  /**
   * Import profile from exported data
   */
  importProfile(data, overrides = {}) {
    if (!data.profile) {
      throw new Error('Invalid profile data');
    }
    
    const profile = {
      ...data.profile,
      ...overrides,
      id: overrides.id || `imported-${Date.now()}`
    };
    
    return this.addProfile(profile);
  }
}

module.exports = { TerminalProfileManager };