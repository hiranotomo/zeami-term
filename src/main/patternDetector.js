class PatternDetector {
  constructor() {
    this.patterns = [
      {
        name: 'typescript-error',
        regex: /error TS\d+:/i,
        type: 'error',
        action: 'suggest-zeami-type-diagnose'
      },
      {
        name: 'module-not-found',
        regex: /Cannot find module|Module not found/i,
        type: 'error',
        action: 'suggest-npm-install'
      },
      {
        name: 'git-conflict',
        regex: /CONFLICT|Merge conflict/,
        type: 'warning',
        action: 'suggest-conflict-resolution'
      },
      {
        name: 'claude-thinking',
        regex: /thinking\.\.\.|analyzing\.\.\./i,
        type: 'info',
        action: 'show-thinking-indicator'
      },
      {
        name: 'test-failure',
        regex: /\d+ (test|tests) failed/i,
        type: 'error',
        action: 'suggest-test-debug'
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
          timestamp: Date.now(),
          matchedText: text.match(pattern.regex)[0]
        });
      }
    }
    
    return detectedPatterns;
  }

  addPattern(name, regex, type, action) {
    this.patterns.push({ name, regex, type, action });
  }
}

module.exports = { PatternDetector };