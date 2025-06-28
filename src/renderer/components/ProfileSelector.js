/**
 * ProfileSelector - UI component for selecting terminal profiles
 */

export class ProfileSelector {
  constructor() {
    this.element = null;
    this.profiles = [];
    this.defaultProfileId = null;
    this.onProfileSelect = null;
    
    // Bind methods
    this.render = this.render.bind(this);
    this.update = this.update.bind(this);
  }
  
  /**
   * Create and render the profile selector
   */
  render() {
    // Create container
    this.element = document.createElement('div');
    this.element.className = 'profile-selector';
    
    // Create dropdown button
    const dropdownButton = document.createElement('button');
    dropdownButton.className = 'profile-dropdown-button';
    dropdownButton.title = 'シェルプロファイルを選択';
    dropdownButton.innerHTML = `
      <span class="profile-icon"></span>
      <span class="profile-name">Default</span>
      <span class="dropdown-arrow">▼</span>
    `;
    
    // Create dropdown menu
    const dropdownMenu = document.createElement('div');
    dropdownMenu.className = 'profile-dropdown-menu hidden';
    
    // Toggle dropdown
    dropdownButton.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle('hidden');
    });
    
    // Close dropdown on outside click
    document.addEventListener('click', () => {
      dropdownMenu.classList.add('hidden');
    });
    
    this.element.appendChild(dropdownButton);
    this.element.appendChild(dropdownMenu);
    
    // Store references
    this.dropdownButton = dropdownButton;
    this.dropdownMenu = dropdownMenu;
    
    return this.element;
  }
  
  /**
   * Update profiles list
   */
  async update() {
    try {
      // Fetch profiles from main process
      if (window.electronAPI) {
        const result = await window.electronAPI.getProfiles();
        this.profiles = result.profiles || [];
        this.defaultProfileId = result.defaultProfileId;
      } else {
        // Demo profiles for development
        this.profiles = [
          { id: 'bash-default', name: 'Bash', icon: 'terminal-bash', color: '#4EAA25' },
          { id: 'zsh-default', name: 'Zsh', icon: 'terminal', color: '#C397D8' },
          { id: 'node-repl', name: 'Node.js', icon: 'terminal-node', color: '#68A063' }
        ];
        this.defaultProfileId = 'bash-default';
      }
      
      this.renderProfiles();
    } catch (error) {
      console.error('[ProfileSelector] Failed to load profiles:', error);
    }
  }
  
  /**
   * Render profiles in dropdown
   */
  renderProfiles() {
    // Clear menu
    this.dropdownMenu.innerHTML = '';
    
    // Default profiles section
    const defaultSection = document.createElement('div');
    defaultSection.className = 'profile-section';
    
    const defaultHeader = document.createElement('div');
    defaultHeader.className = 'profile-section-header';
    defaultHeader.textContent = 'Default Profiles';
    defaultSection.appendChild(defaultHeader);
    
    // Custom profiles section
    const customSection = document.createElement('div');
    customSection.className = 'profile-section';
    
    const customHeader = document.createElement('div');
    customHeader.className = 'profile-section-header';
    customHeader.textContent = 'Custom Profiles';
    customSection.appendChild(customHeader);
    
    // Render each profile
    this.profiles.forEach(profile => {
      const item = this.createProfileItem(profile);
      
      if (profile.id.endsWith('-default') || profile.id.includes('repl')) {
        defaultSection.appendChild(item);
      } else {
        customSection.appendChild(item);
      }
    });
    
    // Add sections to menu
    this.dropdownMenu.appendChild(defaultSection);
    
    // Only show custom section if there are custom profiles
    const hasCustomProfiles = this.profiles.some(p => 
      !p.id.endsWith('-default') && !p.id.includes('repl')
    );
    
    if (hasCustomProfiles) {
      this.dropdownMenu.appendChild(customSection);
    }
    
    // Add actions section
    const actionsSection = document.createElement('div');
    actionsSection.className = 'profile-actions';
    
    // Add new profile button
    const addButton = document.createElement('button');
    addButton.className = 'profile-action-button';
    addButton.innerHTML = '+ Add Profile';
    addButton.addEventListener('click', () => this.showAddProfileDialog());
    actionsSection.appendChild(addButton);
    
    // Manage profiles button
    const manageButton = document.createElement('button');
    manageButton.className = 'profile-action-button';
    manageButton.innerHTML = 'Manage Profiles';
    manageButton.addEventListener('click', () => this.showManageProfilesDialog());
    actionsSection.appendChild(manageButton);
    
    this.dropdownMenu.appendChild(actionsSection);
    
    // Update current profile display
    const currentProfile = this.profiles.find(p => p.id === this.defaultProfileId) || this.profiles[0];
    if (currentProfile) {
      this.updateCurrentProfile(currentProfile);
    }
  }
  
  /**
   * Create profile item element
   */
  createProfileItem(profile) {
    const item = document.createElement('div');
    item.className = 'profile-item';
    if (profile.id === this.defaultProfileId) {
      item.classList.add('default');
    }
    
    // Profile icon
    const icon = document.createElement('span');
    icon.className = `profile-icon ${profile.icon || 'terminal'}`;
    icon.style.color = profile.color || '#007ACC';
    item.appendChild(icon);
    
    // Profile name
    const name = document.createElement('span');
    name.className = 'profile-name';
    name.textContent = profile.name;
    item.appendChild(name);
    
    // Default indicator
    if (profile.id === this.defaultProfileId) {
      const defaultBadge = document.createElement('span');
      defaultBadge.className = 'profile-default-badge';
      defaultBadge.textContent = 'default';
      item.appendChild(defaultBadge);
    }
    
    // Click handler
    item.addEventListener('click', () => {
      this.selectProfile(profile);
      this.dropdownMenu.classList.add('hidden');
    });
    
    return item;
  }
  
  /**
   * Update current profile display
   */
  updateCurrentProfile(profile) {
    const icon = this.dropdownButton.querySelector('.profile-icon');
    const name = this.dropdownButton.querySelector('.profile-name');
    
    icon.className = `profile-icon ${profile.icon || 'terminal'}`;
    icon.style.color = profile.color || '#007ACC';
    name.textContent = profile.name;
  }
  
  /**
   * Select a profile
   */
  selectProfile(profile) {
    console.log('[ProfileSelector] Selected profile:', profile);
    
    // Update display
    this.updateCurrentProfile(profile);
    
    // Notify callback
    if (this.onProfileSelect) {
      this.onProfileSelect(profile);
    }
  }
  
  /**
   * Show add profile dialog
   */
  showAddProfileDialog() {
    // TODO: Implement profile creation dialog
    console.log('[ProfileSelector] Add profile dialog');
    
    // For now, just close dropdown
    this.dropdownMenu.classList.add('hidden');
  }
  
  /**
   * Show manage profiles dialog
   */
  showManageProfilesDialog() {
    // TODO: Implement profile management dialog
    console.log('[ProfileSelector] Manage profiles dialog');
    
    // For now, just close dropdown
    this.dropdownMenu.classList.add('hidden');
  }
  
  /**
   * Get selected profile ID
   */
  getSelectedProfileId() {
    // Return the current default profile
    return this.defaultProfileId;
  }
}