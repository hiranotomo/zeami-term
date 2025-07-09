# プロファイルシステム

> 🤖 **Claude Code最適化ドキュメント**  
> 複数の開発環境を瞬時に切り替え。プロファイル機能の完全ガイド。

## 🎯 クイックリファレンス

| 機能 | 操作方法 | 実装箇所 |
|-----|---------|---------|
| プロファイル切替 | メニュー → プロファイル | `ProfileManager.js:123-145` |
| プロファイル追加 | 設定 → プロファイル → 新規 | `ProfileManager.js:234-267` |
| デフォルト設定 | プロファイル右クリック → デフォルトに設定 | `ProfileManager.js:345-367` |
| 環境変数編集 | プロファイル編集 → 環境変数タブ | `ProfileEditor.js:456-489` |

## 📋 プロファイルシステムの概要

```yaml
目的: 異なる開発環境を簡単に切り替え
主な用途:
  - 複数プロジェクトの管理
  - 開発/本番環境の切り替え
  - 言語別REPL環境
  - カスタムツール環境
```

## 🏗️ プロファイル構造

### プロファイルデータモデル

```javascript
// 📍 src/main/profileManager.js:45-89

interface Profile {
    id: string;              // UUID
    name: string;            // 表示名
    icon: string;            // アイコン（絵文字）
    shell: string;           // シェルパス
    args: string[];          // シェル引数
    env: Record<string, string>; // 環境変数
    cwd: string;             // 作業ディレクトリ
    
    // 表示設定
    theme?: string;          // テーマ名
    fontSize?: number;       // フォントサイズ
    fontFamily?: string;     // フォントファミリー
    
    // 動作設定
    scrollback?: number;     // スクロールバック行数
    bellStyle?: 'none' | 'sound' | 'visual';
    
    // メタデータ
    createdAt: number;       // 作成日時
    updatedAt: number;       // 更新日時
    isDefault: boolean;      // デフォルトフラグ
}
```

### デフォルトプロファイル

```javascript
// 📍 標準プロファイルセット

const defaultProfiles = {
    'default': {
        id: 'default',
        name: 'Default',
        icon: '🖥️',
        shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/bash',
        args: [],
        env: {},
        cwd: process.env.HOME || process.env.USERPROFILE,
        isDefault: true
    },
    
    'zsh': {
        id: 'zsh',
        name: 'Zsh',
        icon: '🐚',
        shell: '/bin/zsh',
        args: ['--login'],
        env: {
            ZDOTDIR: process.env.HOME
        },
        cwd: process.env.HOME
    },
    
    'node': {
        id: 'node',
        name: 'Node.js REPL',
        icon: '📦',
        shell: process.execPath,
        args: [],
        env: {
            NODE_ENV: 'development'
        },
        cwd: process.cwd()
    },
    
    'python': {
        id: 'python',
        name: 'Python REPL',
        icon: '🐍',
        shell: '/usr/bin/python3',
        args: ['-i'],
        env: {
            PYTHONPATH: '.'
        },
        cwd: process.cwd()
    }
};
```

## 🔧 プロファイル管理

### ProfileManager実装

```javascript
// 📍 src/main/profileManager.js

class ProfileManager {
    constructor(userDataPath) {
        this.profilesPath = path.join(userDataPath, 'profiles.json');
        this.profiles = new Map();
        this.defaultProfileId = 'default';
        
        this._loadProfiles();
    }
    
    // プロファイル読み込み
    async _loadProfiles() {
        try {
            const data = await fs.readFile(this.profilesPath, 'utf8');
            const parsed = JSON.parse(data);
            
            Object.entries(parsed.profiles).forEach(([id, profile]) => {
                this.profiles.set(id, profile);
            });
            
            this.defaultProfileId = parsed.defaultProfileId || 'default';
        } catch (error) {
            // 初回起動時はデフォルトプロファイルを作成
            this._createDefaultProfiles();
        }
    }
    
    // プロファイル追加
    async addProfile(profile) {
        const id = profile.id || crypto.randomUUID();
        const newProfile = {
            ...profile,
            id,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        this.profiles.set(id, newProfile);
        await this._saveProfiles();
        
        return newProfile;
    }
    
    // プロファイル更新
    async updateProfile(id, updates) {
        const profile = this.profiles.get(id);
        if (!profile) throw new Error(`Profile ${id} not found`);
        
        const updated = {
            ...profile,
            ...updates,
            updatedAt: Date.now()
        };
        
        this.profiles.set(id, updated);
        await this._saveProfiles();
        
        return updated;
    }
    
    // 環境変数のマージ
    getEffectiveEnv(profileId) {
        const profile = this.profiles.get(profileId);
        if (!profile) return process.env;
        
        return {
            ...process.env,
            ...profile.env,
            ZEAMI_PROFILE: profile.name,
            ZEAMI_PROFILE_ID: profile.id
        };
    }
}
```

### プロファイル切替UI

```javascript
// 📍 src/renderer/features/ProfileSelector.js

class ProfileSelector {
    constructor(termManager, profileManager) {
        this.termManager = termManager;
        this.profileManager = profileManager;
        this.element = this._createElement();
    }
    
    _createElement() {
        const selector = document.createElement('div');
        selector.className = 'profile-selector';
        
        const select = document.createElement('select');
        select.className = 'profile-dropdown';
        
        // プロファイル一覧を取得
        this.profileManager.getProfiles().forEach(profile => {
            const option = document.createElement('option');
            option.value = profile.id;
            option.textContent = `${profile.icon} ${profile.name}`;
            
            if (profile.isDefault) {
                option.selected = true;
            }
            
            select.appendChild(option);
        });
        
        // 変更イベント
        select.addEventListener('change', (e) => {
            this._switchProfile(e.target.value);
        });
        
        selector.appendChild(select);
        return selector;
    }
    
    async _switchProfile(profileId) {
        const profile = await this.profileManager.getProfile(profileId);
        
        // 新しいターミナルを作成
        await this.termManager.createTerminalWithProfile(profile);
        
        // UIフィードバック
        this._showNotification(`プロファイル「${profile.name}」に切り替えました`);
    }
}
```

## 🎨 プロファイルエディタ

### 編集UI

```javascript
// 📍 src/renderer/features/ProfileEditor.js

class ProfileEditor {
    constructor(profile = null) {
        this.profile = profile || this._createNewProfile();
        this.dialog = this._createDialog();
    }
    
    _createDialog() {
        return `
            <div class="profile-editor-dialog">
                <h2>${this.profile.id ? 'プロファイル編集' : '新規プロファイル'}</h2>
                
                <div class="form-group">
                    <label>名前</label>
                    <input type="text" id="profile-name" value="${this.profile.name}">
                </div>
                
                <div class="form-group">
                    <label>アイコン</label>
                    <select id="profile-icon">
                        <option value="🖥️">🖥️ デフォルト</option>
                        <option value="🐚">🐚 シェル</option>
                        <option value="📦">📦 Node.js</option>
                        <option value="🐍">🐍 Python</option>
                        <option value="💎">💎 Ruby</option>
                        <option value="☕">☕ Java</option>
                        <option value="🦀">🦀 Rust</option>
                        <option value="🐹">🐹 Go</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>シェル</label>
                    <input type="text" id="profile-shell" value="${this.profile.shell}">
                    <button onclick="this.browseShell()">参照...</button>
                </div>
                
                <div class="form-group">
                    <label>引数</label>
                    <input type="text" id="profile-args" 
                           value="${this.profile.args.join(' ')}"
                           placeholder="例: --login --norc">
                </div>
                
                <div class="form-group">
                    <label>作業ディレクトリ</label>
                    <input type="text" id="profile-cwd" value="${this.profile.cwd}">
                    <button onclick="this.browseCwd()">参照...</button>
                </div>
                
                <div class="form-group">
                    <label>環境変数</label>
                    <div id="env-vars-editor">
                        ${this._renderEnvVars()}
                    </div>
                    <button onclick="this.addEnvVar()">+ 追加</button>
                </div>
                
                <div class="dialog-buttons">
                    <button onclick="this.save()">保存</button>
                    <button onclick="this.cancel()">キャンセル</button>
                </div>
            </div>
        `;
    }
    
    _renderEnvVars() {
        return Object.entries(this.profile.env).map(([key, value]) => `
            <div class="env-var-row">
                <input type="text" class="env-key" value="${key}" placeholder="変数名">
                <input type="text" class="env-value" value="${value}" placeholder="値">
                <button onclick="this.removeEnvVar('${key}')">×</button>
            </div>
        `).join('');
    }
}
```

## ⚡ 高度な機能

### プロファイル継承

```javascript
// 📍 プロファイルの継承システム

class ProfileInheritance {
    static createDerivedProfile(baseProfile, overrides) {
        return {
            ...baseProfile,
            ...overrides,
            id: crypto.randomUUID(),
            parent: baseProfile.id,
            env: {
                ...baseProfile.env,
                ...overrides.env
            },
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
    }
    
    static resolveProfile(profile, profileManager) {
        if (!profile.parent) return profile;
        
        const parent = profileManager.getProfile(profile.parent);
        const resolved = this.resolveProfile(parent, profileManager);
        
        return {
            ...resolved,
            ...profile,
            env: {
                ...resolved.env,
                ...profile.env
            }
        };
    }
}
```

### プロファイルテンプレート

```javascript
// 📍 よく使われるプロファイルテンプレート

const profileTemplates = {
    'react-dev': {
        name: 'React開発',
        icon: '⚛️',
        shell: '/bin/bash',
        env: {
            NODE_ENV: 'development',
            REACT_APP_ENV: 'development',
            BROWSER: 'none'
        }
    },
    
    'docker': {
        name: 'Docker環境',
        icon: '🐳',
        shell: '/bin/bash',
        env: {
            DOCKER_HOST: 'unix:///var/run/docker.sock'
        }
    },
    
    'aws': {
        name: 'AWS CLI',
        icon: '☁️',
        shell: '/bin/bash',
        env: {
            AWS_PROFILE: 'default',
            AWS_REGION: 'us-east-1'
        }
    }
};
```

### 動的プロファイル生成

```javascript
// 📍 プロジェクトベースのプロファイル自動生成

class DynamicProfileGenerator {
    static async generateFromProject(projectPath) {
        const profile = {
            id: crypto.randomUUID(),
            name: path.basename(projectPath),
            cwd: projectPath,
            env: {}
        };
        
        // package.jsonから情報取得
        try {
            const packageJson = JSON.parse(
                await fs.readFile(path.join(projectPath, 'package.json'), 'utf8')
            );
            
            profile.name = packageJson.name || profile.name;
            profile.icon = '📦';
            
            // Node.jsプロジェクト
            if (packageJson.scripts) {
                profile.env.NODE_ENV = 'development';
            }
        } catch (e) {
            // package.jsonがない
        }
        
        // .envファイルから環境変数読み込み
        try {
            const envFile = await fs.readFile(
                path.join(projectPath, '.env'), 
                'utf8'
            );
            
            const envVars = this._parseEnvFile(envFile);
            profile.env = { ...profile.env, ...envVars };
        } catch (e) {
            // .envファイルがない
        }
        
        return profile;
    }
}
```

## 🔍 デバッグとトラブルシューティング

### プロファイル診断

```javascript
// プロファイルの問題を診断
class ProfileDiagnostics {
    static diagnose(profile) {
        const issues = [];
        
        // シェルの存在確認
        if (!fs.existsSync(profile.shell)) {
            issues.push({
                severity: 'error',
                message: `シェルが見つかりません: ${profile.shell}`
            });
        }
        
        // 環境変数の検証
        Object.entries(profile.env).forEach(([key, value]) => {
            if (key.includes(' ')) {
                issues.push({
                    severity: 'warning',
                    message: `環境変数名に空白が含まれています: ${key}`
                });
            }
        });
        
        // 作業ディレクトリの確認
        if (!fs.existsSync(profile.cwd)) {
            issues.push({
                severity: 'warning',
                message: `作業ディレクトリが存在しません: ${profile.cwd}`
            });
        }
        
        return issues;
    }
}
```

## 🔗 関連ドキュメント

- [ターミナル管理](./terminal-management.md)
- [環境変数設定](../getting-started/configuration.md#環境変数の設定)
- [セッション永続化](./session-persistence.md)

---

> 💡 **Claude Codeへのヒント**: プロファイルの環境変数は、プロセスの環境変数とマージされます。プロファイル固有の設定が優先されるので、開発環境の切り替えに便利です。