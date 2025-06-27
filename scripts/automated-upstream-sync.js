/**
 * Automated upstream sync for Claude Code
 * This script can be run periodically to check for updates
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class XtermUpstreamSync {
  constructor() {
    this.vendorPath = 'src/vendor/xterm';
    this.upstreamUrl = 'https://api.github.com/repos/xtermjs/xterm.js';
    this.ourModifications = new Set([
      'browser/services/ThemeService.ts',
      'browser/renderer/shared/CellColorResolver.ts'
    ]);
  }

  async checkForUpdates() {
    console.log('🔍 Checking xterm.js upstream for updates...');
    
    try {
      // Get latest release info
      const response = await fetch(`${this.upstreamUrl}/releases/latest`);
      const latestRelease = await response.json();
      
      console.log(`📦 Latest upstream version: ${latestRelease.tag_name}`);
      console.log(`📅 Released: ${new Date(latestRelease.published_at).toLocaleDateString()}`);
      
      // Check our current version
      const ourVersion = this.getCurrentVersion();
      console.log(`📌 Our fork version: ${ourVersion}`);
      
      // Compare versions
      if (this.compareVersions(latestRelease.tag_name, ourVersion) > 0) {
        console.log('⚠️  Update available!');
        await this.generateUpdateReport(latestRelease);
        return true;
      } else {
        console.log('✅ Fork is up to date!');
        return false;
      }
    } catch (error) {
      console.error('❌ Error checking upstream:', error.message);
      return false;
    }
  }

  getCurrentVersion() {
    try {
      const packagePath = path.join(this.vendorPath, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      return `v${pkg.version}`;
    } catch {
      return 'unknown';
    }
  }

  compareVersions(v1, v2) {
    const clean = (v) => v.replace(/^v/, '').split('.').map(Number);
    const [a1, a2, a3] = clean(v1);
    const [b1, b2, b3] = clean(v2);
    
    if (a1 !== b1) return a1 - b1;
    if (a2 !== b2) return a2 - b2;
    return a3 - b3;
  }

  async generateUpdateReport(release) {
    const report = {
      timestamp: new Date().toISOString(),
      upstream: {
        version: release.tag_name,
        url: release.html_url,
        changelog: release.body,
        breaking: this.detectBreakingChanges(release.body)
      },
      recommendations: this.generateRecommendations(release),
      automatedActions: []
    };

    // Save report
    const reportPath = `docs/upstream-sync/auto-report-${new Date().toISOString().split('T')[0]}.json`;
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`📄 Update report saved: ${reportPath}`);
    
    // Generate Claude Code instructions
    this.generateClaudeInstructions(report);
  }

  detectBreakingChanges(changelog) {
    const breakingKeywords = ['BREAKING', 'breaking change', 'deprecated', 'removed'];
    return breakingKeywords.some(keyword => 
      changelog.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  generateRecommendations(release) {
    const recommendations = [];
    
    if (release.body.includes('security')) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Review and apply security updates immediately'
      });
    }
    
    if (release.body.includes('performance')) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Consider performance improvements for ZeamiTerm'
      });
    }
    
    return recommendations;
  }

  generateClaudeInstructions(report) {
    const instructions = `
# xterm.js Upstream Update Instructions for Claude Code

## Update Available: ${report.upstream.version}

### 1. Review Changes
\`\`\`bash
# Fetch upstream changes
./scripts/sync-xterm-upstream.sh
\`\`\`

### 2. Check Our Modifications
Our custom modifications in:
${Array.from(this.ourModifications).map(f => `- ${f}`).join('\n')}

### 3. Selective Merge Strategy
${report.upstream.breaking ? '⚠️  BREAKING CHANGES DETECTED - Review carefully!' : ''}

#### Safe to merge:
- Bug fixes in unmodified files
- Performance improvements
- New features that don't conflict

#### Requires careful review:
- Changes to ThemeService.ts
- Changes to CellColorResolver.ts
- API changes

### 4. Test Plan
After merging:
1. npm run build:xterm
2. Test selection transparency
3. Test all terminal features
4. Run performance benchmarks

### 5. Update Documentation
- Update CHANGELOG.md
- Document any API changes
- Update fork version
`;

    const instructionPath = 'docs/upstream-sync/claude-instructions-latest.md';
    fs.writeFileSync(instructionPath, instructions);
    console.log(`🤖 Claude instructions generated: ${instructionPath}`);
  }

  async automatedSafeMerge() {
    console.log('🔧 Attempting automated safe merge...');
    
    // This would contain logic to:
    // 1. Identify non-conflicting files
    // 2. Apply updates to those files only
    // 3. Run tests
    // 4. Generate merge report
    
    console.log('✅ Safe merge complete (simulation)');
  }
}

// Run if called directly
if (require.main === module) {
  const sync = new XtermUpstreamSync();
  sync.checkForUpdates().then(hasUpdates => {
    if (hasUpdates) {
      console.log('\n🎯 Action required: Review update report and apply changes');
    }
  });
}

module.exports = XtermUpstreamSync;