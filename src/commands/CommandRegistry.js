/**
 * CommandRegistry - Unified command management system
 * Manages all terminal commands with a clean, extensible API
 */

export class CommandRegistry {
  constructor() {
    this.commands = new Map();
    this.categories = new Map();
    this.aliases = new Map();
  }
  
  /**
   * Register a command
   */
  register(name, handler, options = {}) {
    if (!name || !handler) {
      throw new Error('Command name and handler are required');
    }
    
    const command = {
      name,
      handler,
      description: options.description || '',
      usage: options.usage || name,
      category: options.category || 'user',
      aliases: options.aliases || []
    };
    
    // Register main command
    this.commands.set(name, command);
    
    // Register aliases
    command.aliases.forEach(alias => {
      this.aliases.set(alias, name);
    });
    
    // Add to category
    if (!this.categories.has(command.category)) {
      this.categories.set(command.category, new Set());
    }
    this.categories.get(command.category).add(name);
    
    return this;
  }
  
  /**
   * Get a command by name (including aliases)
   */
  get(name) {
    // Check if it's an alias
    if (this.aliases.has(name)) {
      name = this.aliases.get(name);
    }
    
    return this.commands.get(name);
  }
  
  /**
   * Check if a command exists
   */
  has(name) {
    return this.commands.has(name) || this.aliases.has(name);
  }
  
  /**
   * Get all commands
   */
  getAll() {
    return Array.from(this.commands.values());
  }
  
  /**
   * Get commands by category
   */
  getByCategory(category) {
    const commandNames = this.categories.get(category);
    if (!commandNames) return [];
    
    return Array.from(commandNames).map(name => this.commands.get(name));
  }
  
  /**
   * Get all categories
   */
  getCategories() {
    return Array.from(this.categories.keys());
  }
  
  /**
   * Remove a command
   */
  unregister(name) {
    const command = this.commands.get(name);
    if (!command) return false;
    
    // Remove from commands
    this.commands.delete(name);
    
    // Remove aliases
    command.aliases.forEach(alias => {
      this.aliases.delete(alias);
    });
    
    // Remove from category
    const categorySet = this.categories.get(command.category);
    if (categorySet) {
      categorySet.delete(name);
      if (categorySet.size === 0) {
        this.categories.delete(command.category);
      }
    }
    
    return true;
  }
  
  /**
   * Clear all commands
   */
  clear() {
    this.commands.clear();
    this.categories.clear();
    this.aliases.clear();
  }
}