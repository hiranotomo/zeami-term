/**
 * SessionPlayer - Terminal session playback functionality
 * 
 * Features:
 * - Play recorded sessions with original timing
 * - Speed control (0.5x - 4x)
 * - Pause/resume functionality
 * - Seek to specific time
 * - Progress tracking
 */

export class SessionPlayer {
  constructor(terminal, options = {}) {
    this.terminal = terminal;
    this.session = null;
    this.events = [];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.isPaused = false;
    this.playbackSpeed = 1.0;
    this.startPlayTime = null;
    this.pausedAt = null;
    this.totalPausedTime = 0;
    
    // Options
    this.options = {
      showProgress: options.showProgress !== false,
      showControls: options.showControls !== false,
      skipSilence: options.skipSilence || false,
      silenceThreshold: options.silenceThreshold || 1000, // 1 second
      onProgress: options.onProgress || null,
      onComplete: options.onComplete || null,
      onError: options.onError || null,
      ...options
    };
    
    this.timeouts = [];
    this.controlsElement = null;
  }

  /**
   * Load session for playback
   * @param {Object} session - Session data from RealtimeLogger
   */
  loadSession(session) {
    if (!session || !session.events || session.events.length === 0) {
      throw new Error('Invalid or empty session');
    }
    
    this.session = session;
    this.events = session.events;
    this.currentIndex = 0;
    this.reset();
    
    // Calculate total duration
    this.totalDuration = session.duration || 
      (this.events[this.events.length - 1].timestamp || 0);
    
    console.log(`[SessionPlayer] Loaded session with ${this.events.length} events, duration: ${this.formatTime(this.totalDuration)}`);
  }

  /**
   * Start playback
   */
  async play() {
    if (!this.session) {
      throw new Error('No session loaded');
    }
    
    if (this.isPlaying && !this.isPaused) {
      return; // Already playing
    }
    
    if (this.isPaused) {
      this.resume();
      return;
    }
    
    this.isPlaying = true;
    this.isPaused = false;
    this.startPlayTime = Date.now();
    this.totalPausedTime = 0;
    
    // Clear terminal and show playback indicator
    this.terminal.clear();
    this.terminal.writeln('\x1b[1;36m=== Session Playback Started ===\x1b[0m');
    this.terminal.writeln(`Speed: ${this.playbackSpeed}x | Duration: ${this.formatTime(this.totalDuration)}`);
    this.terminal.writeln('\x1b[1;36m' + '='.repeat(30) + '\x1b[0m\r\n');
    
    // Restore terminal dimensions if available
    if (this.session.metadata && this.session.metadata.terminal) {
      const { cols, rows } = this.session.metadata.terminal;
      if (this.terminal.cols !== cols || this.terminal.rows !== rows) {
        this.terminal.resize(cols, rows);
      }
    }
    
    // Show controls if enabled
    if (this.options.showControls) {
      this.showControls();
    }
    
    // Start playback
    this.scheduleNextEvent();
  }

  /**
   * Pause playback
   */
  pause() {
    if (!this.isPlaying || this.isPaused) {
      return;
    }
    
    this.isPaused = true;
    this.pausedAt = Date.now();
    
    // Cancel scheduled events
    this.clearTimeouts();
    
    // Show pause indicator
    this.terminal.write('\r\n\x1b[33m[PAUSED]\x1b[0m ');
    
    if (this.options.onProgress) {
      this.options.onProgress({
        state: 'paused',
        currentTime: this.getCurrentPlaybackTime(),
        totalTime: this.totalDuration,
        progress: this.getProgress()
      });
    }
  }

  /**
   * Resume playback
   */
  resume() {
    if (!this.isPlaying || !this.isPaused) {
      return;
    }
    
    this.isPaused = false;
    const pauseDuration = Date.now() - this.pausedAt;
    this.totalPausedTime += pauseDuration;
    this.pausedAt = null;
    
    // Clear pause indicator
    this.terminal.write('\x1b[2K\r'); // Clear line
    
    // Resume playback
    this.scheduleNextEvent();
  }

  /**
   * Stop playback
   */
  stop() {
    if (!this.isPlaying) {
      return;
    }
    
    this.isPlaying = false;
    this.isPaused = false;
    
    // Cancel all scheduled events
    this.clearTimeouts();
    
    // Hide controls
    if (this.controlsElement) {
      this.hideControls();
    }
    
    // Show completion message
    this.terminal.writeln('\r\n\r\n\x1b[1;36m=== Playback Stopped ===\x1b[0m');
    
    if (this.options.onComplete) {
      this.options.onComplete();
    }
  }

  /**
   * Seek to specific time
   * @param {number} timeMs - Time in milliseconds
   */
  seek(timeMs) {
    if (!this.session) {
      return;
    }
    
    // Clamp time
    timeMs = Math.max(0, Math.min(timeMs, this.totalDuration));
    
    // Find the event index for the target time
    let targetIndex = 0;
    for (let i = 0; i < this.events.length; i++) {
      if (this.events[i].timestamp > timeMs) {
        break;
      }
      targetIndex = i;
    }
    
    // Clear terminal and replay up to target
    this.terminal.clear();
    
    // Quickly replay events up to target
    for (let i = 0; i < targetIndex; i++) {
      this.processEvent(this.events[i], true); // Skip delays
    }
    
    this.currentIndex = targetIndex;
    
    // Adjust timing
    const wasPlaying = this.isPlaying && !this.isPaused;
    if (wasPlaying) {
      this.clearTimeouts();
      const elapsedReal = Date.now() - this.startPlayTime - this.totalPausedTime;
      const adjustment = timeMs - (elapsedReal * this.playbackSpeed);
      this.startPlayTime = Date.now() - (adjustment / this.playbackSpeed);
      this.scheduleNextEvent();
    }
  }

  /**
   * Set playback speed
   * @param {number} speed - Playback speed multiplier
   */
  setSpeed(speed) {
    speed = Math.max(0.25, Math.min(4, speed));
    
    if (this.playbackSpeed === speed) {
      return;
    }
    
    const wasPlaying = this.isPlaying && !this.isPaused;
    
    if (wasPlaying) {
      // Adjust timing for new speed
      const currentTime = this.getCurrentPlaybackTime();
      this.playbackSpeed = speed;
      this.startPlayTime = Date.now() - (currentTime / speed);
      
      // Reschedule events
      this.clearTimeouts();
      this.scheduleNextEvent();
    } else {
      this.playbackSpeed = speed;
    }
    
    // Update display
    if (this.options.showControls) {
      this.updateControls();
    }
  }

  /**
   * Schedule next event for playback
   */
  scheduleNextEvent() {
    if (!this.isPlaying || this.isPaused || this.currentIndex >= this.events.length) {
      if (this.currentIndex >= this.events.length) {
        this.stop();
      }
      return;
    }
    
    const event = this.events[this.currentIndex];
    const nextEvent = this.events[this.currentIndex + 1];
    
    // Calculate when this event should be played
    const eventPlayTime = event.timestamp / this.playbackSpeed;
    const elapsedReal = Date.now() - this.startPlayTime - this.totalPausedTime;
    const delay = Math.max(0, eventPlayTime - elapsedReal);
    
    // Skip long silences if enabled
    let actualDelay = delay;
    if (this.options.skipSilence && nextEvent && delay > this.options.silenceThreshold) {
      actualDelay = Math.min(delay, this.options.silenceThreshold);
    }
    
    const timeout = setTimeout(() => {
      this.processEvent(event);
      this.currentIndex++;
      
      // Update progress
      if (this.options.onProgress) {
        this.options.onProgress({
          state: 'playing',
          currentTime: event.timestamp,
          totalTime: this.totalDuration,
          progress: this.getProgress()
        });
      }
      
      // Schedule next
      this.scheduleNextEvent();
    }, actualDelay);
    
    this.timeouts.push(timeout);
  }

  /**
   * Process a single event
   * @param {Object} event - Event to process
   * @param {boolean} skipDelay - Skip timing delays
   */
  processEvent(event, skipDelay = false) {
    try {
      switch (event.type) {
        case 'output':
          if (event.data) {
            this.terminal.write(event.data);
          }
          break;
          
        case 'input':
          // Optionally show user input differently
          if (this.options.showInput && event.data) {
            this.terminal.write(`\x1b[32m${event.data}\x1b[0m`);
          }
          break;
          
        case 'resize':
          if (event.data && event.data.cols && event.data.rows) {
            this.terminal.resize(event.data.cols, event.data.rows);
          }
          break;
          
        case 'clear':
          this.terminal.clear();
          break;
      }
    } catch (error) {
      console.error('[SessionPlayer] Error processing event:', error);
      if (this.options.onError) {
        this.options.onError(error);
      }
    }
  }

  /**
   * Get current playback time
   * @returns {number} Current time in milliseconds
   */
  getCurrentPlaybackTime() {
    if (!this.isPlaying) {
      return 0;
    }
    
    const elapsedReal = Date.now() - this.startPlayTime - this.totalPausedTime;
    return Math.min(elapsedReal * this.playbackSpeed, this.totalDuration);
  }

  /**
   * Get playback progress
   * @returns {number} Progress percentage (0-100)
   */
  getProgress() {
    if (!this.session || this.totalDuration === 0) {
      return 0;
    }
    
    return Math.min(100, (this.getCurrentPlaybackTime() / this.totalDuration) * 100);
  }

  /**
   * Clear all scheduled timeouts
   */
  clearTimeouts() {
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts = [];
  }

  /**
   * Reset player state
   */
  reset() {
    this.clearTimeouts();
    this.currentIndex = 0;
    this.isPlaying = false;
    this.isPaused = false;
    this.startPlayTime = null;
    this.pausedAt = null;
    this.totalPausedTime = 0;
  }

  /**
   * Format time for display
   * @param {number} ms - Time in milliseconds
   * @returns {string} Formatted time string
   */
  formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  }

  /**
   * Show playback controls
   */
  showControls() {
    // Create controls UI element
    const controls = document.createElement('div');
    controls.className = 'session-player-controls';
    controls.innerHTML = `
      <div class="player-progress">
        <span class="time-current">0:00</span>
        <input type="range" class="progress-bar" min="0" max="100" value="0">
        <span class="time-total">${this.formatTime(this.totalDuration)}</span>
      </div>
      <div class="player-buttons">
        <button class="btn-play-pause">⏸</button>
        <button class="btn-stop">⏹</button>
        <select class="speed-selector">
          <option value="0.5">0.5x</option>
          <option value="1" selected>1x</option>
          <option value="1.5">1.5x</option>
          <option value="2">2x</option>
          <option value="4">4x</option>
        </select>
      </div>
    `;
    
    // Add event listeners
    const progressBar = controls.querySelector('.progress-bar');
    progressBar.addEventListener('input', (e) => {
      const percent = parseFloat(e.target.value);
      const targetTime = (this.totalDuration * percent) / 100;
      this.seek(targetTime);
    });
    
    const playPauseBtn = controls.querySelector('.btn-play-pause');
    playPauseBtn.addEventListener('click', () => {
      if (this.isPaused) {
        this.resume();
        playPauseBtn.textContent = '⏸';
      } else {
        this.pause();
        playPauseBtn.textContent = '▶';
      }
    });
    
    const stopBtn = controls.querySelector('.btn-stop');
    stopBtn.addEventListener('click', () => this.stop());
    
    const speedSelector = controls.querySelector('.speed-selector');
    speedSelector.addEventListener('change', (e) => {
      this.setSpeed(parseFloat(e.target.value));
    });
    
    // Append to terminal container
    const container = this.terminal.element.parentElement;
    container.appendChild(controls);
    this.controlsElement = controls;
    
    // Update progress periodically
    this.progressInterval = setInterval(() => {
      if (this.isPlaying && !this.isPaused) {
        this.updateControls();
      }
    }, 100);
  }

  /**
   * Update controls display
   */
  updateControls() {
    if (!this.controlsElement) return;
    
    const currentTime = this.getCurrentPlaybackTime();
    const progress = this.getProgress();
    
    this.controlsElement.querySelector('.time-current').textContent = 
      this.formatTime(currentTime);
    this.controlsElement.querySelector('.progress-bar').value = progress;
  }

  /**
   * Hide playback controls
   */
  hideControls() {
    if (this.controlsElement) {
      this.controlsElement.remove();
      this.controlsElement = null;
    }
    
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }
}