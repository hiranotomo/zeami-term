/**
 * Selection Fix for xterm.js
 * Forces transparent selection by monitoring and overriding inline styles
 */

class SelectionFix {
  constructor() {
    this.targetColor = 'rgba(120, 150, 200, 0.3)';
    this.observer = null;
    this.styleElement = null;
  }

  /**
   * Initialize the selection fix
   */
  init() {
    // Create a style element with maximum specificity
    this.styleElement = document.createElement('style');
    this.styleElement.id = 'zeami-selection-fix';
    this.styleElement.textContent = this.generateOverrideStyles();
    document.head.appendChild(this.styleElement);

    // Start monitoring for selection elements
    this.startMonitoring();

    // Also monitor for new terminals
    this.monitorNewTerminals();
  }

  /**
   * Generate CSS with maximum specificity
   */
  generateOverrideStyles() {
    return `
/* Override any inline styles on selection divs */
.xterm-screen .xterm-selection-layer > div[style*="background-color"] {
  background-color: ${this.targetColor} !important;
  opacity: 1 !important;
}

/* Target specific gray colors that might be hardcoded */
div[style*="background-color: rgb(58, 61, 65)"],
div[style*="background-color: rgba(58, 61, 65"],
div[style*="background-color: #3a3d41"],
div[style*="background-color:#3a3d41"] {
  background-color: ${this.targetColor} !important;
}

/* Use attribute selector for even higher specificity */
.xterm [style*="background-color"][style*="position: absolute"] {
  background-color: ${this.targetColor} !important;
}

/* Apply to all selection layer children */
.xterm-selection-layer * {
  background-color: ${this.targetColor} !important;
}
`;
  }

  /**
   * Monitor DOM for selection elements and fix their styles
   */
  startMonitoring() {
    // Use MutationObserver to catch dynamically created selection elements
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              this.fixSelectionElement(node);
              
              // Also check children
              if (node.querySelectorAll) {
                const selectionDivs = node.querySelectorAll('.xterm-selection-layer > div');
                selectionDivs.forEach(div => this.fixSelectionElement(div));
              }
            }
          });
        } else if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          this.fixSelectionElement(mutation.target);
        }
      });
    });

    // Start observing the entire document
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style']
    });

    // Fix any existing selection elements
    this.fixAllSelections();
  }

  /**
   * Fix a single selection element
   */
  fixSelectionElement(element) {
    if (!element || !element.style) return;

    const style = element.getAttribute('style');
    if (style && style.includes('background-color') && 
        (style.includes('58, 61, 65') || style.includes('#3a3d41'))) {
      
      // Replace the background color
      const newStyle = style.replace(
        /background-color:\s*[^;]+;?/gi,
        `background-color: ${this.targetColor};`
      );
      element.setAttribute('style', newStyle);
    }
  }

  /**
   * Fix all existing selection elements
   */
  fixAllSelections() {
    const selectionDivs = document.querySelectorAll('.xterm-selection-layer > div');
    selectionDivs.forEach(div => this.fixSelectionElement(div));
  }

  /**
   * Monitor for new terminal instances
   */
  monitorNewTerminals() {
    // Re-apply fixes when new terminals are created
    const terminalObserver = new MutationObserver(() => {
      setTimeout(() => {
        this.fixAllSelections();
      }, 100);
    });

    terminalObserver.observe(document.getElementById('terminal-container') || document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Update the target color
   */
  updateTargetColor(color) {
    this.targetColor = color;
    this.styleElement.textContent = this.generateOverrideStyles();
    this.fixAllSelections();
  }

  /**
   * Cleanup
   */
  dispose() {
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.styleElement) {
      this.styleElement.remove();
    }
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.selectionFix = new SelectionFix();
    window.selectionFix.init();
  });
} else {
  window.selectionFix = new SelectionFix();
  window.selectionFix.init();
}

// Export for use in other modules
window.SelectionFix = SelectionFix;