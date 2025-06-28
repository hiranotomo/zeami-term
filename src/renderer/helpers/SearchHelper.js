/**
 * SearchHelper - Enhanced search functionality with scrollbar decorations
 */

export class SearchHelper {
  constructor() {
    this.searchResults = [];
    this.currentResultIndex = -1;
    this.decorations = [];
  }
  
  /**
   * Initialize search with terminal and addon
   */
  init(terminal, searchAddon) {
    this.terminal = terminal;
    this.searchAddon = searchAddon;
    
    // Enable decorations if supported
    if (searchAddon) {
      this.decorationsEnabled = true;
    }
  }
  
  /**
   * Perform search with decorations
   */
  findNext(term, options = {}) {
    if (!this.searchAddon) return false;
    
    // Add decoration options for search
    const searchOptions = {
      ...options,
      decorations: this.decorationsEnabled ? {
        matchBackground: '#4e4e2e',
        matchBorder: '1px solid #7e7e4e',
        matchOverviewRuler: '#7e7e4e',
        activeMatchBackground: '#515C2A',
        activeMatchBorder: '1px solid #7e7e4e',
        activeMatchColorOverviewRuler: '#ffa500'
      } : undefined
    };
    
    return this.searchAddon.findNext(term, searchOptions);
  }
  
  /**
   * Find previous with decorations
   */
  findPrevious(term, options = {}) {
    if (!this.searchAddon) return false;
    
    // Add decoration options for search
    const searchOptions = {
      ...options,
      decorations: this.decorationsEnabled ? {
        matchBackground: '#4e4e2e',
        matchBorder: '1px solid #7e7e4e',
        matchOverviewRuler: '#7e7e4e',
        activeMatchBackground: '#515C2A',
        activeMatchBorder: '1px solid #7e7e4e',
        activeMatchColorOverviewRuler: '#ffa500'
      } : undefined
    };
    
    return this.searchAddon.findPrevious(term, searchOptions);
  }
  
  /**
   * Clear search and decorations
   */
  clear() {
    if (this.searchAddon && this.searchAddon.clearDecorations) {
      this.searchAddon.clearDecorations();
    }
    this.searchResults = [];
    this.currentResultIndex = -1;
  }
  
  /**
   * Update scrollbar decorations manually (fallback)
   */
  updateScrollbarDecorations() {
    // Clear existing decorations
    this.decorations.forEach(decoration => {
      if (decoration.dispose) {
        decoration.dispose();
      }
    });
    this.decorations = [];
    
    if (!this.terminal || this.searchResults.length === 0) return;
    
    // Create decorations for each result
    this.searchResults.forEach((result, index) => {
      try {
        const decoration = this.terminal.registerDecoration({
          marker: {
            line: result.row
          },
          overviewRulerOptions: {
            color: index === this.currentResultIndex ? '#ffa500' : '#7e7e4e',
            position: 'full'
          }
        });
        
        if (decoration) {
          this.decorations.push(decoration);
        }
      } catch (error) {
        console.warn('Failed to create decoration:', error);
      }
    });
  }
}