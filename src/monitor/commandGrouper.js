// Command Grouper - Groups terminal data by commands

class CommandGrouper {
    constructor() {
        this.currentCommand = null;
        this.groups = [];
        this.activeGroup = null;
        this.promptPatterns = [
            /[$#>]\s*$/,            // Common prompts
            /\]\s*[$#>]\s*$/,       // With brackets
            /\w+@\w+.*[$#>]\s*$/,   // User@host prompts
            /➜\s*$/,                // Fancy prompts
            /❯\s*$/,                // Another fancy prompt
        ];
    }
    
    processData(data) {
        if (data.type === 'input') {
            // Start a new command group
            this.startNewGroup(data);
        } else if (data.type === 'output') {
            // Add output to current group
            if (this.activeGroup) {
                this.activeGroup.outputs.push(data);
                this.activeGroup.endTime = data.timestamp;
            } else {
                // No active group, create orphan group
                this.createOrphanGroup(data);
            }
        }
        
        return this.activeGroup;
    }
    
    startNewGroup(inputData) {
        // Finish previous group
        if (this.activeGroup) {
            this.activeGroup.completed = true;
        }
        
        // Extract command from input
        const command = this.extractCommand(inputData.data);
        
        // Create new group
        this.activeGroup = {
            id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            command: command,
            input: inputData,
            outputs: [],
            startTime: inputData.timestamp,
            endTime: inputData.timestamp,
            completed: false
        };
        
        this.groups.push(this.activeGroup);
        return this.activeGroup;
    }
    
    createOrphanGroup(outputData) {
        const orphanGroup = {
            id: `orphan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            command: '[No Command]',
            input: null,
            outputs: [outputData],
            startTime: outputData.timestamp,
            endTime: outputData.timestamp,
            completed: true,
            orphan: true
        };
        
        this.groups.push(orphanGroup);
        return orphanGroup;
    }
    
    extractCommand(input) {
        // Remove ANSI escape sequences
        let clean = input.replace(/\x1b\[[^m]*m/g, '');
        clean = clean.replace(/\x1b\].*?\x07/g, '');
        clean = clean.replace(/[\r\n]+/g, ' ').trim();
        
        // Remove trailing whitespace and newlines
        clean = clean.trim();
        
        // If it's just Enter or whitespace, return placeholder
        if (!clean || clean === '\r' || clean === '\n') {
            return '[Enter]';
        }
        
        return clean;
    }
    
    getGroups() {
        return this.groups;
    }
    
    getActiveGroup() {
        return this.activeGroup;
    }
    
    reset() {
        this.currentCommand = null;
        this.groups = [];
        this.activeGroup = null;
    }
    
    // Create a summary view of grouped data
    createGroupedView(dataHistory) {
        this.reset();
        
        // Process all historical data
        dataHistory.forEach(data => {
            this.processData(data);
        });
        
        // Ensure last group is completed
        if (this.activeGroup) {
            this.activeGroup.completed = true;
        }
        
        return this.groups;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CommandGrouper;
}