/**
 * Splitter - Draggable splitter component for resizing panes
 */

export class Splitter {
  constructor(container, direction = 'vertical', onResize) {
    this.container = container;
    this.direction = direction;
    this.onResize = onResize;
    this.isDragging = false;
    this.startPos = 0;
    this.startSizes = [0.5, 0.5];
    
    this.init();
  }
  
  init() {
    // Get or create splitter element
    this.element = this.container.querySelector(
      `.splitter-${this.direction}`
    );
    
    if (!this.element) return;
    
    // Add event listeners
    this.element.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    
    // Touch support
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this));
    document.addEventListener('touchmove', this.handleTouchMove.bind(this));
    document.addEventListener('touchend', this.handleTouchEnd.bind(this));
    
    // Prevent text selection while dragging
    this.element.addEventListener('selectstart', e => e.preventDefault());
  }
  
  handleMouseDown(e) {
    this.startDrag(e.clientX, e.clientY);
    e.preventDefault();
  }
  
  handleTouchStart(e) {
    const touch = e.touches[0];
    this.startDrag(touch.clientX, touch.clientY);
    e.preventDefault();
  }
  
  startDrag(x, y) {
    this.isDragging = true;
    this.startPos = this.direction === 'vertical' ? x : y;
    
    // Get current sizes
    const computed = window.getComputedStyle(this.container);
    if (this.direction === 'vertical') {
      const columns = computed.gridTemplateColumns.split(' ');
      const totalWidth = this.container.offsetWidth;
      
      // Parse the fr values properly
      const firstWidth = parseFloat(columns[0]);
      const secondWidth = parseFloat(columns[2]);
      
      // If values are in pixels, convert to ratios
      if (columns[0].includes('px')) {
        this.startSizes = [
          firstWidth / totalWidth,
          secondWidth / totalWidth
        ];
      } else {
        // Values are in fr units, normalize them
        const totalFr = firstWidth + secondWidth;
        this.startSizes = [
          firstWidth / totalFr,
          secondWidth / totalFr
        ];
      }
    } else {
      const rows = computed.gridTemplateRows.split(' ');
      const totalHeight = this.container.offsetHeight;
      
      // Parse the fr values properly
      const firstHeight = parseFloat(rows[0]);
      const secondHeight = parseFloat(rows[2]);
      
      // If values are in pixels, convert to ratios
      if (rows[0].includes('px')) {
        this.startSizes = [
          firstHeight / totalHeight,
          secondHeight / totalHeight
        ];
      } else {
        // Values are in fr units, normalize them
        const totalFr = firstHeight + secondHeight;
        this.startSizes = [
          firstHeight / totalFr,
          secondHeight / totalFr
        ];
      }
    }
    
    // Add dragging class
    document.body.style.cursor = this.direction === 'vertical' ? 'col-resize' : 'row-resize';
    this.element.classList.add('dragging');
  }
  
  handleMouseMove(e) {
    if (!this.isDragging) return;
    this.updateDrag(e.clientX, e.clientY);
  }
  
  handleTouchMove(e) {
    if (!this.isDragging) return;
    const touch = e.touches[0];
    this.updateDrag(touch.clientX, touch.clientY);
    e.preventDefault();
  }
  
  updateDrag(x, y) {
    const currentPos = this.direction === 'vertical' ? x : y;
    const delta = currentPos - this.startPos;
    
    const containerSize = this.direction === 'vertical' 
      ? this.container.offsetWidth 
      : this.container.offsetHeight;
    
    // Calculate new sizes as ratios
    const deltaRatio = delta / containerSize;
    let firstRatio = this.startSizes[0] + deltaRatio;
    let secondRatio = this.startSizes[1] - deltaRatio;
    
    // Enforce minimum sizes (10% minimum)
    const minRatio = 0.1;
    if (firstRatio < minRatio) {
      firstRatio = minRatio;
      secondRatio = 1 - minRatio - 0.004; // Account for splitter
    } else if (secondRatio < minRatio) {
      secondRatio = minRatio;
      firstRatio = 1 - minRatio - 0.004;
    }
    
    // Apply new sizes
    if (this.direction === 'vertical') {
      this.container.style.gridTemplateColumns = `${firstRatio}fr 4px ${secondRatio}fr`;
    } else {
      this.container.style.gridTemplateRows = `${firstRatio}fr 4px ${secondRatio}fr`;
    }
    
    // Trigger resize callback
    if (this.onResize) {
      this.onResize(firstRatio, secondRatio);
    }
  }
  
  handleMouseUp(e) {
    this.endDrag();
  }
  
  handleTouchEnd(e) {
    this.endDrag();
  }
  
  endDrag() {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    document.body.style.cursor = '';
    this.element.classList.remove('dragging');
    
    // Save the layout
    this.saveLayout();
  }
  
  saveLayout() {
    const computed = window.getComputedStyle(this.container);
    const layout = {
      direction: this.direction,
      sizes: this.direction === 'vertical' 
        ? computed.gridTemplateColumns
        : computed.gridTemplateRows
    };
    
    // Save to localStorage
    localStorage.setItem('zeami-layout-split', JSON.stringify(layout));
    
    console.log('[Splitter] Layout saved:', layout);
  }
  
  loadLayout() {
    try {
      const saved = localStorage.getItem('zeami-layout-split');
      if (saved) {
        const layout = JSON.parse(saved);
        if (layout.direction === this.direction) {
          // Validate the saved sizes - must be in 'fr' format
          const isValidFormat = (sizes) => {
            // Expected format: "Xfr 4px Yfr" where X and Y are numbers
            const pattern = /^[\d.]+fr\s+4px\s+[\d.]+fr$/;
            return pattern.test(sizes);
          };
          
          if (!isValidFormat(layout.sizes)) {
            console.log('[Splitter] Invalid saved layout format, using default');
            // Use default 50/50 split
            if (this.direction === 'vertical') {
              this.container.style.gridTemplateColumns = '1fr 4px 1fr';
            } else {
              this.container.style.gridTemplateRows = '1fr 4px 1fr';
            }
            // Clear invalid saved layout
            localStorage.removeItem('zeami-layout-split');
            return;
          }
          
          if (this.direction === 'vertical') {
            this.container.style.gridTemplateColumns = layout.sizes;
          } else {
            this.container.style.gridTemplateRows = layout.sizes;
          }
          console.log('[Splitter] Layout loaded:', layout);
        }
      }
    } catch (error) {
      console.error('[Splitter] Failed to load layout:', error);
      // Clear corrupted data
      localStorage.removeItem('zeami-layout-split');
    }
  }
  
  destroy() {
    // Remove bound event listeners
    document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    document.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    document.removeEventListener('touchend', this.handleTouchEnd.bind(this));
  }
}