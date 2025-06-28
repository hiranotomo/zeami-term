/**
 * ProfileSelector Test Suite
 */

// Mock Electron API
const mockElectronAPI = {
  getProfiles: jest.fn()
};

// Setup global mocks before tests
global.window = {
  electronAPI: mockElectronAPI
};

global.document = {
  createElement: jest.fn((tag) => {
    const element = {
      tagName: tag.toUpperCase(),
      className: '',
      innerHTML: '',
      textContent: '',
      style: {},
      children: [],
      appendChild: jest.fn(function(child) {
        this.children.push(child);
        return child;
      }),
      addEventListener: jest.fn(),
      querySelector: jest.fn(),
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
        toggle: jest.fn(),
        contains: jest.fn()
      },
      click: jest.fn()
    };
    return element;
  }),
  addEventListener: jest.fn(),
  body: {
    appendChild: jest.fn()
  }
};

// Simplified ProfileSelector for testing
class ProfileSelector {
  constructor() {
    this.element = null;
    this.profiles = [];
    this.defaultProfileId = null;
    this.onProfileSelect = null;
  }
  
  render() {
    this.element = document.createElement('div');
    this.element.className = 'profile-selector';
    
    const dropdownButton = document.createElement('button');
    dropdownButton.className = 'profile-dropdown-button';
    dropdownButton.innerHTML = `
      <span class="profile-icon"></span>
      <span class="profile-name">Default</span>
      <span class="dropdown-arrow">▼</span>
    `;
    
    const dropdownMenu = document.createElement('div');
    dropdownMenu.className = 'profile-dropdown-menu hidden';
    
    dropdownButton.addEventListener('click', (e) => {
      if (e && e.stopPropagation) e.stopPropagation();
      dropdownMenu.classList.toggle('hidden');
    });
    
    document.addEventListener('click', () => {
      dropdownMenu.classList.add('hidden');
    });
    
    this.element.appendChild(dropdownButton);
    this.element.appendChild(dropdownMenu);
    
    this.dropdownButton = dropdownButton;
    this.dropdownMenu = dropdownMenu;
    
    return this.element;
  }
  
  async update() {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.getProfiles();
        this.profiles = result.profiles || [];
        this.defaultProfileId = result.defaultProfileId;
      } else {
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
  
  renderProfiles() {
    this.dropdownMenu.innerHTML = '';
    
    this.profiles.forEach(profile => {
      const item = document.createElement('div');
      item.className = 'profile-item';
      item.textContent = profile.name;
      
      if (profile.id === this.defaultProfileId) {
        item.classList.add('default');
      }
      
      item.addEventListener('click', () => {
        this.selectProfile(profile);
      });
      
      this.dropdownMenu.appendChild(item);
    });
  }
  
  selectProfile(profile) {
    // Update button text
    if (this.dropdownButton && this.dropdownButton.querySelector) {
      const nameSpan = this.dropdownButton.querySelector('.profile-name');
      if (nameSpan) {
        nameSpan.textContent = profile.name;
      }
    }
    
    // Hide dropdown
    this.dropdownMenu.classList.add('hidden');
    
    // Trigger callback
    if (this.onProfileSelect) {
      this.onProfileSelect(profile);
    }
  }
}

describe('ProfileSelector', () => {
  let selector;
  
  beforeEach(() => {
    jest.clearAllMocks();
    selector = new ProfileSelector();
  });
  
  describe('Rendering', () => {
    test('should create profile selector element', () => {
      const element = selector.render();
      
      expect(element).toBeDefined();
      expect(element.className).toBe('profile-selector');
      expect(element.children).toHaveLength(2); // button and menu
    });
    
    test('should create dropdown button with correct structure', () => {
      selector.render();
      
      const button = selector.dropdownButton;
      expect(button).toBeDefined();
      expect(button.className).toBe('profile-dropdown-button');
      expect(button.innerHTML).toContain('profile-icon');
      expect(button.innerHTML).toContain('profile-name');
      expect(button.innerHTML).toContain('dropdown-arrow');
    });
    
    test('should create hidden dropdown menu', () => {
      selector.render();
      
      const menu = selector.dropdownMenu;
      expect(menu).toBeDefined();
      expect(menu.className).toBe('profile-dropdown-menu hidden');
    });
  });
  
  describe('Profile Loading', () => {
    test('should load profiles from Electron API', async () => {
      const mockProfiles = [
        { id: 'bash', name: 'Bash', icon: 'bash' },
        { id: 'powershell', name: 'PowerShell', icon: 'ps' }
      ];
      
      mockElectronAPI.getProfiles.mockResolvedValue({
        profiles: mockProfiles,
        defaultProfileId: 'bash'
      });
      
      selector.render();
      await selector.update();
      
      expect(mockElectronAPI.getProfiles).toHaveBeenCalled();
      expect(selector.profiles).toEqual(mockProfiles);
      expect(selector.defaultProfileId).toBe('bash');
    });
    
    test('should use demo profiles when Electron API is not available', async () => {
      const originalAPI = window.electronAPI;
      window.electronAPI = null;
      
      selector.render();
      await selector.update();
      
      expect(selector.profiles).toHaveLength(3);
      expect(selector.profiles[0].name).toBe('Bash');
      expect(selector.defaultProfileId).toBe('bash-default');
      
      window.electronAPI = originalAPI;
    });
    
    test('should handle profile loading errors gracefully', async () => {
      mockElectronAPI.getProfiles.mockRejectedValue(new Error('Network error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      selector.render();
      await selector.update();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[ProfileSelector] Failed to load profiles:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });
  
  describe('Profile Rendering', () => {
    test('should render profile items in dropdown menu', async () => {
      const mockProfiles = [
        { id: 'bash', name: 'Bash' },
        { id: 'zsh', name: 'Zsh' }
      ];
      
      mockElectronAPI.getProfiles.mockResolvedValue({
        profiles: mockProfiles,
        defaultProfileId: 'bash'
      });
      
      selector.render();
      await selector.update();
      
      expect(selector.dropdownMenu.children).toHaveLength(2);
      expect(selector.dropdownMenu.appendChild).toHaveBeenCalledTimes(2);
    });
    
    test('should mark default profile', async () => {
      const mockProfiles = [
        { id: 'bash', name: 'Bash' },
        { id: 'zsh', name: 'Zsh' }
      ];
      
      mockElectronAPI.getProfiles.mockResolvedValue({
        profiles: mockProfiles,
        defaultProfileId: 'zsh'
      });
      
      selector.render();
      await selector.update();
      
      // Check that the second profile item has 'default' class added
      const profileItems = selector.dropdownMenu.children;
      expect(profileItems[1].classList.add).toHaveBeenCalledWith('default');
    });
  });
  
  describe('User Interaction', () => {
    test('should toggle dropdown menu on button click', () => {
      selector.render();
      
      const button = selector.dropdownButton;
      const menu = selector.dropdownMenu;
      
      // Simulate button click
      const clickEvent = { stopPropagation: jest.fn() };
      button.addEventListener.mock.calls[0][1](clickEvent);
      
      expect(menu.classList.toggle).toHaveBeenCalledWith('hidden');
      expect(clickEvent.stopPropagation).toHaveBeenCalled();
    });
    
    test('should close dropdown on document click', () => {
      selector.render();
      
      const menu = selector.dropdownMenu;
      
      // Simulate document click
      const documentClickHandler = document.addEventListener.mock.calls[0][1];
      documentClickHandler();
      
      expect(menu.classList.add).toHaveBeenCalledWith('hidden');
    });
    
    test('should trigger callback on profile selection', async () => {
      const mockProfiles = [
        { id: 'bash', name: 'Bash' },
        { id: 'zsh', name: 'Zsh' }
      ];
      
      mockElectronAPI.getProfiles.mockResolvedValue({
        profiles: mockProfiles,
        defaultProfileId: 'bash'
      });
      
      selector.render();
      await selector.update();
      
      // Set callback
      const mockCallback = jest.fn();
      selector.onProfileSelect = mockCallback;
      
      // Simulate profile selection
      selector.selectProfile(mockProfiles[1]);
      
      expect(mockCallback).toHaveBeenCalledWith(mockProfiles[1]);
    });
    
    test('should update button text on profile selection', () => {
      selector.render();
      
      // Mock querySelector to return a span element
      const nameSpan = { textContent: '' };
      selector.dropdownButton.querySelector = jest.fn().mockReturnValue(nameSpan);
      
      const profile = { id: 'zsh', name: 'Zsh' };
      selector.selectProfile(profile);
      
      expect(nameSpan.textContent).toBe('Zsh');
      expect(selector.dropdownMenu.classList.add).toHaveBeenCalledWith('hidden');
    });
  });
  
  describe('Edge Cases', () => {
    test('should handle empty profiles list', async () => {
      mockElectronAPI.getProfiles.mockResolvedValue({
        profiles: [],
        defaultProfileId: null
      });
      
      selector.render();
      await selector.update();
      
      expect(selector.profiles).toHaveLength(0);
      expect(selector.dropdownMenu.children).toHaveLength(0);
    });
    
    test('should handle missing onProfileSelect callback', () => {
      selector.render();
      selector.onProfileSelect = null;
      
      // Should not throw
      expect(() => {
        selector.selectProfile({ id: 'test', name: 'Test' });
      }).not.toThrow();
    });
  });
});