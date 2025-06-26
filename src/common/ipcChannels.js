// IPC channel definitions for type safety and consistency
const IPC_CHANNELS = {
  // Main -> Renderer
  TERMINAL_DATA: 'zeami:terminal-data',
  PATTERN_DETECTED: 'zeami:pattern-detected',
  SUGGEST_ACTION: 'zeami:suggest-action',
  SESSION_CLOSED: 'zeami:session-closed',
  
  // Renderer -> Main
  START_SESSION: 'zeami:start-session',
  SEND_INPUT: 'zeami:send-input',
  REQUEST_CONTEXT: 'zeami:request-context',
  RESIZE_TERMINAL: 'zeami:resize-terminal',
  CLOSE_SESSION: 'zeami:close-session'
};

module.exports = { IPC_CHANNELS };