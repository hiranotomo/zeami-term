// ANSI Escape Sequence Parser for Human-Readable Display

class AnsiParser {
    constructor() {
        // Common ANSI escape sequences
        this.escapePatterns = {
            // Cursor movement
            cursorUp: /\x1b\[(\d*)A/g,
            cursorDown: /\x1b\[(\d*)B/g,
            cursorForward: /\x1b\[(\d*)C/g,
            cursorBack: /\x1b\[(\d*)D/g,
            cursorPosition: /\x1b\[(\d*);(\d*)H/g,
            
            // Erase
            clearScreen: /\x1b\[2J/g,
            clearLine: /\x1b\[K/g,
            clearFromCursor: /\x1b\[0J/g,
            clearToCursor: /\x1b\[1J/g,
            
            // Colors and styles
            colorCode: /\x1b\[([0-9;]+)m/g,
            
            // Others
            setTitle: /\x1b\]([0-2]);([^\x07\x1b]*)\x07/g,
            osc: /\x1b\](\d+);([^\x07\x1b]*)\x07/g,
            bell: /\x07/g,
            
            // Generic CSI
            csi: /\x1b\[([^A-Za-z]*)([@A-Za-z])/g,
            
            // Generic escape
            genericEscape: /\x1b[^\[]/g
        };
        
        this.colorMap = {
            '0': 'reset',
            '1': 'bold',
            '2': 'dim',
            '3': 'italic',
            '4': 'underline',
            '30': 'black',
            '31': 'red',
            '32': 'green',
            '33': 'yellow',
            '34': 'blue',
            '35': 'magenta',
            '36': 'cyan',
            '37': 'white',
            '40': 'bg-black',
            '41': 'bg-red',
            '42': 'bg-green',
            '43': 'bg-yellow',
            '44': 'bg-blue',
            '45': 'bg-magenta',
            '46': 'bg-cyan',
            '47': 'bg-white',
            '90': 'bright-black',
            '91': 'bright-red',
            '92': 'bright-green',
            '93': 'bright-yellow',
            '94': 'bright-blue',
            '95': 'bright-magenta',
            '96': 'bright-cyan',
            '97': 'bright-white'
        };
    }
    
    parse(text) {
        const result = {
            clean: '',           // Text without escape sequences
            formatted: '',       // HTML formatted text with colors
            commands: [],        // Detected commands
            sequences: []        // Found escape sequences
        };
        
        let processed = text;
        let htmlOutput = text;
        
        // Track found sequences
        const foundSequences = [];
        
        // Process title changes
        processed = processed.replace(this.escapePatterns.setTitle, (match, mode, title) => {
            foundSequences.push({
                type: 'title',
                raw: match,
                readable: `[SET TITLE: "${title}"]`,
                mode: mode
            });
            return `[TITLE: ${title}]`;
        });
        
        // Process OSC sequences
        processed = processed.replace(this.escapePatterns.osc, (match, code, data) => {
            const readable = this.interpretOSC(code, data);
            foundSequences.push({
                type: 'osc',
                raw: match,
                readable: readable,
                code: code
            });
            return readable;
        });
        
        // Process color codes for HTML output
        htmlOutput = htmlOutput.replace(this.escapePatterns.colorCode, (match, codes) => {
            const codeList = codes.split(';');
            const classes = [];
            
            codeList.forEach(code => {
                const colorName = this.colorMap[code];
                if (colorName) {
                    classes.push(`ansi-${colorName}`);
                }
            });
            
            if (classes.length > 0) {
                return `<span class="${classes.join(' ')}">`;
            }
            return '';
        });
        
        // Close color spans
        htmlOutput = htmlOutput.replace(/\x1b\[0m/g, '</span>');
        
        // Process cursor movements
        processed = processed.replace(this.escapePatterns.cursorUp, (match, n) => {
            const count = n || 1;
            foundSequences.push({
                type: 'cursor',
                raw: match,
                readable: `[↑${count}]`
            });
            return `[↑${count}]`;
        });
        
        processed = processed.replace(this.escapePatterns.cursorDown, (match, n) => {
            const count = n || 1;
            foundSequences.push({
                type: 'cursor',
                raw: match,
                readable: `[↓${count}]`
            });
            return `[↓${count}]`;
        });
        
        processed = processed.replace(this.escapePatterns.cursorForward, (match, n) => {
            const count = n || 1;
            foundSequences.push({
                type: 'cursor',
                raw: match,
                readable: `[→${count}]`
            });
            return `[→${count}]`;
        });
        
        processed = processed.replace(this.escapePatterns.cursorBack, (match, n) => {
            const count = n || 1;
            foundSequences.push({
                type: 'cursor',
                raw: match,
                readable: `[←${count}]`
            });
            return `[←${count}]`;
        });
        
        // Process screen clearing
        processed = processed.replace(this.escapePatterns.clearScreen, (match) => {
            foundSequences.push({
                type: 'clear',
                raw: match,
                readable: '[CLEAR SCREEN]'
            });
            return '[CLEAR SCREEN]';
        });
        
        processed = processed.replace(this.escapePatterns.clearLine, (match) => {
            foundSequences.push({
                type: 'clear',
                raw: match,
                readable: '[CLEAR LINE]'
            });
            return '[CLEAR LINE]';
        });
        
        // Process bell
        processed = processed.replace(this.escapePatterns.bell, (match) => {
            foundSequences.push({
                type: 'bell',
                raw: match,
                readable: '[BELL]'
            });
            return '[🔔]';
        });
        
        // Remove remaining escape sequences for clean text
        let cleanText = processed;
        cleanText = cleanText.replace(this.escapePatterns.colorCode, '');
        cleanText = cleanText.replace(this.escapePatterns.csi, '');
        cleanText = cleanText.replace(this.escapePatterns.genericEscape, '');
        
        // Detect commands (lines ending with prompt indicators)
        const lines = cleanText.split('\n');
        const promptPatterns = [/\$\s*$/, />\s*$/, /#\s*$/, /:\s*$/];
        
        lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            if (trimmedLine && promptPatterns.some(pattern => pattern.test(line))) {
                result.commands.push({
                    line: index,
                    text: trimmedLine
                });
            }
        });
        
        result.clean = cleanText;
        result.formatted = htmlOutput;
        result.sequences = foundSequences;
        
        return result;
    }
    
    interpretOSC(code, data) {
        const oscCodes = {
            '0': 'Set Icon & Title',
            '1': 'Set Icon',
            '2': 'Set Title',
            '4': 'Set Color',
            '7': 'Set Working Directory',
            '8': 'Set Hyperlink',
            '9': 'Notification',
            '10': 'Set Foreground Color',
            '11': 'Set Background Color',
            '52': 'Clipboard Operation',
            '133': 'Shell Integration'
        };
        
        const meaning = oscCodes[code] || `OSC ${code}`;
        
        // Special handling for shell integration
        if (code === '133') {
            const parts = data.split(';');
            const subCommand = parts[0];
            const shellIntegration = {
                'A': 'Prompt Start',
                'B': 'Prompt End',
                'C': 'Command Start',
                'D': 'Command End',
                'P': 'Property'
            };
            const subMeaning = shellIntegration[subCommand] || subCommand;
            return `[SHELL: ${subMeaning}]`;
        }
        
        if (data.length > 50) {
            data = data.substring(0, 50) + '...';
        }
        
        return `[${meaning}: ${data}]`;
    }
    
    // Convert raw terminal data to human-readable format
    toHumanReadable(data) {
        const parsed = this.parse(data);
        
        return {
            display: parsed.clean,
            formatted: parsed.formatted,
            metadata: {
                commands: parsed.commands,
                sequences: parsed.sequences,
                hasEscapeSequences: parsed.sequences.length > 0
            }
        };
    }
}

// Export for use in monitor
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnsiParser;
}