// Terminal Data Monitor JavaScript

let sessionId = null;
let eventCount = 0;
let inputCount = 0;
let outputCount = 0;
let dataHistory = [];
let ansiParser = null;
let commandGrouper = null;

// Initialize parsers
try {
    ansiParser = new AnsiParser();
} catch (e) {
    console.warn('AnsiParser not loaded, using fallback')
}

try {
    commandGrouper = new CommandGrouper();
} catch (e) {
    console.warn('CommandGrouper not loaded, using fallback')
}

// DOM Elements
const dataDisplay = document.getElementById('dataDisplay');
const sessionIdSpan = document.getElementById('sessionId');
const eventCountSpan = document.getElementById('eventCount');
const inputCountSpan = document.getElementById('inputCount');
const outputCountSpan = document.getElementById('outputCount');
const autoScrollCheckbox = document.getElementById('autoScroll');
const showTimestampsCheckbox = document.getElementById('showTimestamps');
const showInputCheckbox = document.getElementById('showInput');
const showOutputCheckbox = document.getElementById('showOutput');
const groupCommandsCheckbox = document.getElementById('groupCommands');
const showSequencesCheckbox = document.getElementById('showSequences');
const clearButton = document.getElementById('clearData');
const searchBox = document.getElementById('searchBox');
const exportButton = document.getElementById('exportData');

// Listen for terminal data from main process
window.electronAPI.onMonitorData((data) => {
    console.log('Monitor received data:', data);
    
    if (data.sessionId && sessionId !== data.sessionId) {
        sessionId = data.sessionId;
        sessionIdSpan.textContent = sessionId;
    }
    
    // Store data
    dataHistory.push(data);
    
    // Update counters
    eventCount++;
    if (data.type === 'input') {
        inputCount++;
    } else if (data.type === 'output') {
        outputCount++;
    }
    
    updateStats();
    addDataEntry(data);
});

function updateStats() {
    eventCountSpan.textContent = eventCount;
    inputCountSpan.textContent = inputCount;
    outputCountSpan.textContent = outputCount;
}

function addDataEntry(data) {
    // Check filters
    if (data.type === 'input' && !showInputCheckbox.checked) return;
    if (data.type === 'output' && !showOutputCheckbox.checked) return;
    
    const entry = document.createElement('div');
    entry.className = `data-entry ${data.type}`;
    
    // Timestamp
    if (showTimestampsCheckbox.checked) {
        const timestamp = document.createElement('span');
        timestamp.className = 'timestamp';
        timestamp.textContent = new Date(data.timestamp).toLocaleTimeString('ja-JP', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        });
        entry.appendChild(timestamp);
    }
    
    // Type badge
    const typeBadge = document.createElement('span');
    typeBadge.className = `data-type ${data.type}`;
    typeBadge.textContent = data.type.toUpperCase();
    entry.appendChild(typeBadge);
    
    // Content
    const content = document.createElement('div');
    content.className = 'data-content';
    
    // Parse ANSI sequences if parser is available
    if (ansiParser) {
        const parsed = ansiParser.toHumanReadable(data.data);
        
        // Main content
        const readable = document.createElement('div');
        readable.className = 'readable-content';
        
        // Use formatted HTML if available
        if (parsed.formatted && parsed.formatted !== data.data) {
            readable.innerHTML = parsed.formatted;
        } else {
            readable.textContent = parsed.display;
        }
        content.appendChild(readable);
        
        // Show metadata if there are escape sequences and option is enabled
        if (parsed.metadata.hasEscapeSequences && showSequencesCheckbox.checked) {
            const metadata = document.createElement('div');
            metadata.className = 'data-metadata';
            
            parsed.metadata.sequences.forEach(seq => {
                const seqInfo = document.createElement('span');
                seqInfo.className = 'sequence-info';
                seqInfo.textContent = seq.readable;
                metadata.appendChild(seqInfo);
            });
            
            content.appendChild(metadata);
        }
        
        // Show detected commands
        if (parsed.metadata.commands.length > 0 && data.type === 'output') {
            const cmdIndicator = document.createElement('span');
            cmdIndicator.className = 'command-indicator';
            cmdIndicator.textContent = '⌘';
            cmdIndicator.title = 'Command detected';
            entry.appendChild(cmdIndicator);
        }
    } else {
        // Fallback to original display
        const readable = document.createElement('div');
        readable.textContent = data.data;
        content.appendChild(readable);
        
        // Add hex view for non-printable characters
        if (containsNonPrintable(data.data)) {
            const hex = document.createElement('div');
            hex.className = 'data-content hex';
            hex.textContent = 'HEX: ' + stringToHex(data.data);
            content.appendChild(hex);
        }
    }
    
    entry.appendChild(content);
    dataDisplay.appendChild(entry);
    
    // Auto scroll
    if (autoScrollCheckbox.checked) {
        dataDisplay.scrollTop = dataDisplay.scrollHeight;
    }
    
    // Apply search highlighting if needed
    if (searchBox.value) {
        highlightSearch();
    }
}

function containsNonPrintable(str) {
    // Check for non-printable characters (excluding common ones like \n, \r, \t)
    return /[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/.test(str);
}

function stringToHex(str) {
    return Array.from(str)
        .map(char => {
            const code = char.charCodeAt(0);
            return code.toString(16).padStart(2, '0').toUpperCase();
        })
        .join(' ');
}

// Clear button
clearButton.addEventListener('click', () => {
    dataDisplay.innerHTML = '';
    dataHistory = [];
    eventCount = 0;
    inputCount = 0;
    outputCount = 0;
    updateStats();
});

// Search functionality
searchBox.addEventListener('input', () => {
    highlightSearch();
});

function highlightSearch() {
    const searchTerm = searchBox.value.toLowerCase();
    if (!searchTerm) {
        // Remove all highlights
        document.querySelectorAll('.highlight').forEach(el => {
            const parent = el.parentNode;
            parent.replaceChild(document.createTextNode(el.textContent), el);
            parent.normalize();
        });
        return;
    }
    
    // Apply highlights
    document.querySelectorAll('.data-content').forEach(content => {
        if (content.classList.contains('hex')) return; // Skip hex displays
        
        const text = content.textContent;
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes(searchTerm)) {
            const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
            content.innerHTML = text.replace(regex, '<span class="highlight">$1</span>');
        }
    });
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Export functionality
exportButton.addEventListener('click', () => {
    const exportData = {
        sessionId: sessionId,
        timestamp: new Date().toISOString(),
        totalEvents: eventCount,
        inputEvents: inputCount,
        outputEvents: outputCount,
        data: dataHistory
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zeami-monitor-${sessionId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

// Filter change handlers
showInputCheckbox.addEventListener('change', rebuildDisplay);
showOutputCheckbox.addEventListener('change', rebuildDisplay);
showTimestampsCheckbox.addEventListener('change', rebuildDisplay);
groupCommandsCheckbox.addEventListener('change', rebuildDisplay);
showSequencesCheckbox.addEventListener('change', rebuildDisplay);

function rebuildDisplay() {
    dataDisplay.innerHTML = '';
    
    if (groupCommandsCheckbox.checked && commandGrouper) {
        // Display grouped view
        const groups = commandGrouper.createGroupedView(dataHistory);
        groups.forEach(group => addGroupedEntry(group));
    } else {
        // Display flat view
        dataHistory.forEach(data => addDataEntry(data));
    }
}

function addGroupedEntry(group) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'command-group';
    
    // Command header
    const header = document.createElement('div');
    header.className = 'group-header';
    
    // Command text
    const cmdText = document.createElement('span');
    cmdText.className = 'group-command';
    cmdText.textContent = `$ ${group.command}`;
    header.appendChild(cmdText);
    
    // Duration
    if (group.startTime && group.endTime) {
        const duration = group.endTime - group.startTime;
        const durationSpan = document.createElement('span');
        durationSpan.className = 'group-duration';
        durationSpan.textContent = `${duration}ms`;
        header.appendChild(durationSpan);
    }
    
    groupDiv.appendChild(header);
    
    // Output section
    if (group.outputs.length > 0) {
        const outputDiv = document.createElement('div');
        outputDiv.className = 'group-output';
        
        // Combine all outputs
        const combinedOutput = group.outputs.map(o => o.data).join('');
        
        if (ansiParser) {
            const parsed = ansiParser.toHumanReadable(combinedOutput);
            outputDiv.innerHTML = parsed.formatted || parsed.display;
        } else {
            outputDiv.textContent = combinedOutput;
        }
        
        groupDiv.appendChild(outputDiv);
    }
    
    dataDisplay.appendChild(groupDiv);
}

// Request initial data if monitor opened for existing session
window.electronAPI.requestMonitorHistory();