class PatternDetector {
  constructor() {
    this.patterns = [
      {
        name: 'typescript-error',
        regex: /error TS\d+:/i,
        type: 'error',
        action: 'suggest-zeami-type-diagnose',
        highlight: { color: '\x1b[91m', bgColor: '\x1b[41m' }
      },
      {
        name: 'module-not-found',
        regex: /Cannot find module|Module not found/i,
        type: 'error',
        action: 'suggest-npm-install',
        highlight: { color: '\x1b[91m' }
      },
      {
        name: 'git-conflict',
        regex: /CONFLICT|Merge conflict/,
        type: 'warning',
        action: 'suggest-conflict-resolution',
        highlight: { color: '\x1b[93m' }
      },
      {
        name: 'claude-thinking',
        regex: /thinking\.\.\.|analyzing\.\.\./i,
        type: 'info',
        action: 'show-thinking-indicator',
        highlight: { color: '\x1b[96m' }
      },
      {
        name: 'test-failure',
        regex: /\d+ (test|tests) failed/i,
        type: 'error',
        action: 'suggest-test-debug',
        highlight: { color: '\x1b[91m', bold: true }
      },
      // Success patterns
      {
        name: 'test-success',
        regex: /\d+ (test|tests) passed|All tests passed/i,
        type: 'success',
        action: null,
        highlight: { color: '\x1b[92m' }
      },
      {
        name: 'build-success',
        regex: /Build succeeded|Compiled successfully/i,
        type: 'success',
        action: null,
        highlight: { color: '\x1b[92m', bold: true }
      },
      // Syntax highlighting patterns
      {
        name: 'json-key',
        regex: /"([^"]+)":/g,
        type: 'syntax',
        action: null,
        highlight: { color: '\x1b[94m' }
      },
      {
        name: 'file-path',
        regex: /[\w\-/]+\.(js|ts|jsx|tsx|json|md|css|html)/g,
        type: 'syntax',
        action: null,
        highlight: { color: '\x1b[36m' }
      }
    ];
  }

  analyze(text) {
    const detectedPatterns = [];
    
    for (const pattern of this.patterns) {
      if (pattern.regex.test(text)) {
        detectedPatterns.push({
          name: pattern.name,
          type: pattern.type,
          action: pattern.action,
          highlight: pattern.highlight,
          timestamp: Date.now(),
          matchedText: text.match(pattern.regex)[0]
        });
      }
    }
    
    return detectedPatterns;
  }

  // Apply color highlighting to text based on detected patterns
  highlightText(text) {
    let highlightedText = text;
    
    for (const pattern of this.patterns) {
      if (pattern.highlight && pattern.regex.test(text)) {
        const { color, bgColor, bold } = pattern.highlight;
        let replacement = '';
        
        if (bold) replacement += '\x1b[1m';
        if (bgColor) replacement += bgColor;
        if (color) replacement += color;
        
        replacement += '$&\x1b[0m'; // $& is the matched text
        
        highlightedText = highlightedText.replace(pattern.regex, replacement);
      }
    }
    
    return highlightedText;
  }

  addPattern(name, regex, type, action) {
    this.patterns.push({ name, regex, type, action });
  }
}

module.exports = { PatternDetector };