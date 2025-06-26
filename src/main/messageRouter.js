class MessageRouter {
  constructor() {
    this.enhancementRules = [
      {
        pattern: /^zeami\s+/,
        enhance: (input, context) => {
          // Zeamiコマンドの場合は相対パスを補完
          return input.replace(/^zeami/, '../../bin/zeami');
        }
      },
      {
        pattern: /^claude\s+code\s+/i,
        enhance: (input, context) => {
          // Claude Codeコマンドを検出して補強
          return this.enhanceClaudeCommand(input, context);
        }
      }
    ];
  }

  processInput(input, context) {
    // Apply enhancement rules
    for (const rule of this.enhancementRules) {
      if (rule.pattern.test(input)) {
        return rule.enhance(input, context);
      }
    }
    
    return input;
  }

  enhanceClaudeCommand(input, context) {
    // 将来的にClaude Codeコマンドの自動補完や
    // コンテキスト情報の追加を実装
    return input;
  }

  addRule(pattern, enhancer) {
    this.enhancementRules.push({
      pattern,
      enhance: enhancer
    });
  }
}

module.exports = { MessageRouter };