// Simple terminal initialization for testing
document.addEventListener('DOMContentLoaded', () => {
  const terminalContainer = document.getElementById('terminal');
  
  if (!terminalContainer) {
    console.error('Terminal container not found');
    return;
  }
  
  // Display a simple message for now
  terminalContainer.innerHTML = `
    <div style="color: #0dbc79; font-family: monospace; padding: 20px;">
      <h2>ZeamiTerm</h2>
      <p>Enhanced Terminal for Claude Code</p>
      <p style="color: #666;">Initializing terminal...</p>
      <br>
      <p style="color: #e5e510;">$ <span style="color: #cccccc;">Welcome to ZeamiTerm!</span></p>
    </div>
  `;
  
  console.log('Terminal loader initialized');
});