/**
 * Claude Code Output Parser
 * Claude Codeの出力を構造化して解析・変換
 */

class ClaudeOutputParser {
  constructor() {
    // Claude Code の出力パターン
    this.patterns = {
      // コードブロック
      codeBlock: {
        regex: /```(\w*)\n([\s\S]*?)```/g,
        type: 'code'
      },
      
      // テーブル
      table: {
        regex: /(\|[^\n]+\|(?:\n\|[-:\s|]+\|)?(?:\n\|[^\n]+\|)*)/g,
        type: 'table'
      },
      
      // プログレスバー
      progressBar: {
        regex: /\[([█▓▒░\s]+)\]\s*(\d+)%/g,
        type: 'progress'
      },
      
      // thinking タグ（Claude の思考プロセス）
      thinking: {
        regex: /<thinking>([\s\S]*?)<\/thinking>/g,
        type: 'thinking'
      },
      
      // ツール使用
      toolUse: {
        regex: /<tool_use>([\s\S]*?)<\/tool_use>/g,
        type: 'tool_use'
      },
      
      // function calls
      functionCalls: {
        regex: /<function_calls>([\s\S]*?)<\/antml:function_calls>/g,
        type: 'function_calls'
      },
      
      // ファイルパス
      filePath: {
        regex: /(?:^|\s)((?:\/|\.\/|\.\.\/)?(?:[\w.-]+\/)*[\w.-]+\.\w+)(?:\s|$)/gm,
        type: 'file_path'
      },
      
      // URL
      url: {
        regex: /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g,
        type: 'url'
      },
      
      // Zeami コマンド
      zeamiCommand: {
        regex: /(?:^|\s)(zeami\s+[\w-]+(?:\s+[\w.-]+)*)/gm,
        type: 'zeami_command'
      },
      
      // エラーメッセージ
      error: {
        regex: /(?:Error|ERROR|エラー):\s*(.+)/g,
        type: 'error'
      },
      
      // 警告メッセージ
      warning: {
        regex: /(?:Warning|WARN|警告):\s*(.+)/g,
        type: 'warning'
      },
      
      // 成功メッセージ
      success: {
        regex: /(?:Success|OK|成功|完了):\s*(.+)/g,
        type: 'success'
      },
      
      // リスト項目
      listItem: {
        regex: /^(\s*)([-*+•]|\d+\.)\s+(.+)$/gm,
        type: 'list_item'
      },
      
      // JSON
      json: {
        regex: /\{[\s\S]*\}|\[[\s\S]*\]/g,
        type: 'json',
        validator: (str) => {
          try {
            JSON.parse(str);
            return true;
          } catch {
            return false;
          }
        }
      }
    };
    
    // 解析結果のキャッシュ
    this.cache = new Map();
    this.cacheSize = 100;
  }

  /**
   * 出力を解析
   * @param {string} output - Claude Codeの出力
   * @returns {ParsedOutput} 解析結果
   */
  parse(output) {
    // キャッシュチェック
    const cacheKey = this._generateCacheKey(output);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const segments = [];
    const metadata = {
      hasCode: false,
      hasTable: false,
      hasError: false,
      hasZeamiCommand: false,
      languages: new Set(),
      timestamp: Date.now()
    };
    
    // 各パターンでマッチング
    for (const [name, pattern] of Object.entries(this.patterns)) {
      const matches = this._findMatches(output, pattern);
      
      for (const match of matches) {
        // バリデーション
        if (pattern.validator && !pattern.validator(match.content)) {
          continue;
        }
        
        segments.push({
          type: pattern.type,
          content: match.content,
          raw: match.raw,
          start: match.start,
          end: match.end,
          metadata: this._extractMetadata(pattern.type, match)
        });
        
        // メタデータ更新
        this._updateMetadata(metadata, pattern.type, match);
      }
    }
    
    // セグメントをソート（位置順）
    segments.sort((a, b) => a.start - b.start);
    
    // 重複を除去
    const cleanSegments = this._removeDuplicates(segments);
    
    // 結果を構築
    const result = {
      raw: output,
      segments: cleanSegments,
      metadata,
      structured: this._buildStructured(output, cleanSegments)
    };
    
    // キャッシュに保存
    this._addToCache(cacheKey, result);
    
    return result;
  }

  /**
   * 特定のタイプのセグメントを抽出
   * @param {string} output - 出力
   * @param {string} type - タイプ
   * @returns {Array} マッチしたセグメント
   */
  extractByType(output, type) {
    const parsed = this.parse(output);
    return parsed.segments.filter(seg => seg.type === type);
  }

  /**
   * コードブロックを抽出して整形
   * @param {string} output - 出力
   * @returns {Array} コードブロックの配列
   */
  extractCodeBlocks(output) {
    const blocks = this.extractByType(output, 'code');
    
    return blocks.map(block => {
      const match = block.content.match(/^(\w*)\n([\s\S]*)$/);
      return {
        language: match ? match[1] : '',
        code: match ? match[2] : block.content,
        raw: block.raw
      };
    });
  }

  /**
   * テーブルをパース
   * @param {string} tableStr - テーブル文字列
   * @returns {Object} パースされたテーブル
   */
  parseTable(tableStr) {
    const lines = tableStr.trim().split('\n');
    if (lines.length < 2) return null;
    
    const headers = lines[0].split('|').filter(cell => cell.trim());
    const rows = [];
    
    // セパレータ行をスキップ
    const startIndex = lines[1].includes('---') ? 2 : 1;
    
    for (let i = startIndex; i < lines.length; i++) {
      const cells = lines[i].split('|').filter(cell => cell.trim());
      if (cells.length > 0) {
        rows.push(cells.map(cell => cell.trim()));
      }
    }
    
    return { headers, rows };
  }

  /**
   * Claude Codeへの入力を整形
   * @param {string} type - メッセージタイプ
   * @param {string} content - コンテンツ
   * @param {Object} metadata - メタデータ
   * @returns {string} 整形された入力
   */
  formatInput(type, content, metadata = {}) {
    const templates = {
      command: (cmd) => `$ ${cmd}`,
      
      zeami: (cmd) => `zeami ${cmd} --json`,
      
      code_request: (spec) => `
Please generate code with the following specifications:
${spec}

Requirements:
- Include proper error handling
- Add JSDoc comments
- Follow the existing code style
`,
      
      explanation_request: (code) => `
Please explain this code:
\`\`\`javascript
${code}
\`\`\`
`,
      
      debug_request: (error) => `
I'm encountering this error:
\`\`\`
${error}
\`\`\`

Context: ${metadata.context || 'No additional context'}
Current file: ${metadata.file || 'Unknown'}
`,
      
      refactor_request: (code) => `
Please refactor this code for better performance and readability:
\`\`\`javascript
${code}
\`\`\`
`
    };
    
    const template = templates[type];
    return template ? template(content) : content;
  }

  /**
   * プライベートメソッド
   */
  
  _findMatches(text, pattern) {
    const matches = [];
    let match;
    
    // regex をリセット
    pattern.regex.lastIndex = 0;
    
    while ((match = pattern.regex.exec(text)) !== null) {
      matches.push({
        content: match[1] || match[0],
        raw: match[0],
        start: match.index,
        end: match.index + match[0].length,
        groups: match
      });
    }
    
    return matches;
  }
  
  _extractMetadata(type, match) {
    const metadata = {};
    
    switch (type) {
      case 'code':
        const lang = match.groups[1];
        if (lang) {
          metadata.language = lang;
        }
        break;
        
      case 'progress':
        metadata.percentage = parseInt(match.groups[2]);
        break;
        
      case 'file_path':
        metadata.path = match.content;
        metadata.extension = match.content.split('.').pop();
        break;
        
      case 'zeami_command':
        const parts = match.content.split(/\s+/);
        metadata.command = parts[1];
        metadata.args = parts.slice(2);
        break;
    }
    
    return metadata;
  }
  
  _updateMetadata(metadata, type, match) {
    switch (type) {
      case 'code':
        metadata.hasCode = true;
        if (match.groups[1]) {
          metadata.languages.add(match.groups[1]);
        }
        break;
      case 'table':
        metadata.hasTable = true;
        break;
      case 'error':
        metadata.hasError = true;
        break;
      case 'zeami_command':
        metadata.hasZeamiCommand = true;
        break;
    }
  }
  
  _removeDuplicates(segments) {
    const cleaned = [];
    
    for (let i = 0; i < segments.length; i++) {
      const current = segments[i];
      let isDuplicate = false;
      
      // 既に追加されたセグメントと重複チェック
      for (const existing of cleaned) {
        if (this._isOverlapping(current, existing)) {
          // より具体的なタイプを優先
          if (this._getTypePriority(current.type) > this._getTypePriority(existing.type)) {
            cleaned.splice(cleaned.indexOf(existing), 1);
          } else {
            isDuplicate = true;
          }
          break;
        }
      }
      
      if (!isDuplicate) {
        cleaned.push(current);
      }
    }
    
    return cleaned;
  }
  
  _isOverlapping(seg1, seg2) {
    return !(seg1.end <= seg2.start || seg2.end <= seg1.start);
  }
  
  _getTypePriority(type) {
    const priorities = {
      code: 10,
      table: 9,
      function_calls: 8,
      tool_use: 7,
      zeami_command: 6,
      json: 5,
      file_path: 4,
      url: 3,
      error: 2,
      warning: 1,
      default: 0
    };
    
    return priorities[type] || priorities.default;
  }
  
  _buildStructured(raw, segments) {
    const structured = {
      plain: '',
      parts: []
    };
    
    let lastEnd = 0;
    
    for (const segment of segments) {
      // セグメント間のプレーンテキスト
      if (segment.start > lastEnd) {
        const plainText = raw.substring(lastEnd, segment.start);
        if (plainText.trim()) {
          structured.parts.push({
            type: 'text',
            content: plainText
          });
          structured.plain += plainText;
        }
      }
      
      // セグメント自体
      structured.parts.push({
        type: segment.type,
        content: segment.content,
        metadata: segment.metadata
      });
      
      if (segment.type === 'text') {
        structured.plain += segment.content;
      }
      
      lastEnd = segment.end;
    }
    
    // 最後のプレーンテキスト
    if (lastEnd < raw.length) {
      const plainText = raw.substring(lastEnd);
      if (plainText.trim()) {
        structured.parts.push({
          type: 'text',
          content: plainText
        });
        structured.plain += plainText;
      }
    }
    
    return structured;
  }
  
  _generateCacheKey(output) {
    // シンプルなハッシュ生成
    let hash = 0;
    for (let i = 0; i < output.length; i++) {
      const char = output.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
  
  _addToCache(key, value) {
    this.cache.set(key, value);
    
    // キャッシュサイズ制限
    if (this.cache.size > this.cacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClaudeOutputParser;
} else {
  window.ClaudeOutputParser = ClaudeOutputParser;
}