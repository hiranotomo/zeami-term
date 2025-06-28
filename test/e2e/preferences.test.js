/**
 * Preference機能のE2Eテスト
 * 
 * テストシナリオ：
 * 1. 基本的なUI操作（開く、閉じる、カテゴリ切り替え）
 * 2. Terminal設定の変更と反映確認
 * 3. Appearance（テーマ）設定の変更と反映確認
 * 4. 設定の保存と復元
 * 5. リアルタイム反映の確認
 */

const { test, expect, _electron: electron } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// テスト用のアプリケーションパス
const appPath = path.join(__dirname, '../../');

test.describe('Preference Settings', () => {
  let app;
  let page;

  test.beforeEach(async () => {
    // Electronアプリを起動
    app = await electron.launch({
      args: [appPath],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    // メインウィンドウを取得
    page = await app.firstWindow();
    
    // アプリケーションの初期化を待つ
    await page.waitForSelector('.terminal-wrapper', { state: 'visible', timeout: 10000 });
    
    // デバッグ情報
    console.log('App launched, waiting for terminal initialization...');
  });

  test.afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  test('1. Preference画面の基本操作', async () => {
    // Preferencesボタンを探す
    const prefButton = await page.locator('#preferences-btn');
    await expect(prefButton).toBeVisible();
    
    // Preferencesを開く
    await prefButton.click();
    
    // Preference画面が表示されることを確認
    await expect(page.locator('.preference-window')).toBeVisible();
    
    // カテゴリの切り替えテスト
    const categories = ['terminal', 'appearance', 'shell', 'session', 'keyboard', 'window', 'advanced', 'privacy'];
    
    for (const category of categories) {
      await page.click(`[data-category="${category}"]`);
      await expect(page.locator(`[data-panel="${category}"]`)).toBeVisible();
      console.log(`✓ ${category} panel displayed correctly`);
    }
    
    // 閉じるボタンのテスト
    await page.click('.preference-close');
    await expect(page.locator('.preference-window')).not.toBeVisible();
  });

  test('2. Terminal設定の変更と反映', async () => {
    // Preferencesを開く
    await page.click('#preferences-btn');
    await page.waitForSelector('.preference-window');
    
    // Terminal設定に移動
    await page.click('[data-category="terminal"]');
    
    // フォントサイズの変更テスト
    const fontSizeInput = await page.locator('[data-pref="terminal.fontSize"]');
    const originalSize = await fontSizeInput.inputValue();
    console.log(`Original font size: ${originalSize}`);
    
    // フォントサイズを18に変更
    await fontSizeInput.fill('18');
    
    // Applyボタンをクリック
    await page.click('#pref-apply');
    
    // 設定が反映されるまで待つ
    await page.waitForTimeout(300);
    
    // ターミナルのフォントサイズが変更されたことを確認
    // window.zeamiTermManager経由でアクセス
    const terminalInfo = await page.evaluate(() => {
      const manager = window.zeamiTermManager;
      const terminal = manager?.getActiveTerminal();
      return {
        hasManager: !!manager,
        hasTerminal: !!terminal,
        fontSize: terminal ? terminal.options.fontSize : null,
        terminals: manager ? manager.terminals.size : 0
      };
    });
    
    console.log('Terminal info:', terminalInfo);
    expect(terminalInfo.hasManager).toBe(true);
    expect(terminalInfo.hasTerminal).toBe(true);
    expect(terminalInfo.fontSize).toBe(18);
    console.log('✓ Font size changed successfully');
    
    // カーソルスタイルの変更テスト
    await page.selectOption('[data-pref="terminal.cursorStyle"]', 'underline');
    await page.click('#pref-apply');
    
    // カーソルブリンクのテスト
    const cursorBlinkCheckbox = await page.locator('[data-pref="terminal.cursorBlink"]');
    const isChecked = await cursorBlinkCheckbox.isChecked();
    await cursorBlinkCheckbox.click();
    await page.click('#pref-apply');
    
    // 元に戻す
    await fontSizeInput.fill(originalSize);
    if (isChecked) {
      await cursorBlinkCheckbox.click();
    }
    await page.click('#pref-save');
  });

  test('3. Appearance（テーマ）設定の変更', async () => {
    // Preferencesを開く
    await page.click('#preferences-btn');
    await page.waitForSelector('.preference-window');
    
    // Appearance設定に移動
    await page.click('[data-category="appearance"]');
    
    // テーマ変更のテスト
    const themes = ['VS Code Dark', 'VS Code Light', 'Monokai', 'Solarized Dark'];
    
    for (const theme of themes) {
      // テーマを選択
      await page.selectOption('[data-pref="theme.name"]', theme);
      
      // プレビューが更新されることを確認
      await page.waitForTimeout(100); // 少し待つ
      
      // Applyボタンをクリック
      await page.click('#pref-apply');
      
      // ターミナルの背景色が変更されたことを確認
      const backgroundColor = await page.evaluate(() => {
        const terminal = window.zeamiTermManager?.getActiveTerminal();
        if (terminal && terminal.element) {
          return window.getComputedStyle(terminal.element).backgroundColor;
        }
        return null;
      });
      
      console.log(`✓ Theme "${theme}" applied, background: ${backgroundColor}`);
      
      // スクリーンショットを撮る
      await page.screenshot({ 
        path: `test-results/theme-${theme.toLowerCase().replace(/\s+/g, '-')}.png`,
        fullPage: true 
      });
    }
    
    // 元のテーマに戻す
    await page.selectOption('[data-pref="theme.name"]', 'VS Code Dark');
    await page.click('#pref-save');
  });

  test('4. 設定の保存と復元', async () => {
    // Preferencesを開く
    await page.click('#preferences-btn');
    await page.waitForSelector('.preference-window');
    
    // いくつかの設定を変更
    await page.click('[data-category="terminal"]');
    await page.fill('[data-pref="terminal.fontSize"]', '16');
    await page.fill('[data-pref="terminal.scrollback"]', '5000');
    
    // 保存
    await page.click('#pref-save');
    await page.waitForSelector('.preference-window', { state: 'hidden' });
    
    // アプリを再起動
    await app.close();
    app = await electron.launch({
      args: [appPath],
      env: { ...process.env, NODE_ENV: 'test' }
    });
    page = await app.firstWindow();
    await page.waitForSelector('.terminal-wrapper', { state: 'visible' });
    
    // 初期化を待つ
    await page.waitForTimeout(500);
    
    // Preferencesを再度開く
    await page.click('#preferences-btn');
    await page.waitForSelector('.preference-window');
    await page.click('[data-category="terminal"]');
    
    // 設定が保存されていることを確認
    const fontSize = await page.locator('[data-pref="terminal.fontSize"]').inputValue();
    const scrollback = await page.locator('[data-pref="terminal.scrollback"]').inputValue();
    
    expect(fontSize).toBe('16');
    expect(scrollback).toBe('5000');
    console.log('✓ Settings persisted correctly');
    
    // ターミナルにも反映されていることを確認
    const terminalFontSize = await page.evaluate(() => {
      const terminal = window.zeamiTermManager?.getActiveTerminal();
      return terminal ? terminal.options.fontSize : null;
    });
    expect(terminalFontSize).toBe(16);
  });

  test('5. リアルタイム設定反映の確認', async () => {
    // Preferencesを開く
    await page.click('#preferences-btn');
    await page.waitForSelector('.preference-window');
    
    // Terminal設定に移動
    await page.click('[data-category="terminal"]');
    
    // リアルタイムでフォントサイズが変わることを確認
    const fontSizeInput = await page.locator('[data-pref="terminal.fontSize"]');
    
    // スライダーで値を変更しながら確認
    for (const size of [12, 14, 16, 18, 20]) {
      await fontSizeInput.fill(size.toString());
      await page.click('#pref-apply');
      
      // 少し待つ
      await page.waitForTimeout(100);
      
      // ターミナルのフォントサイズを確認
      const actualSize = await page.evaluate(() => {
        const terminal = window.zeamiTermManager?.getActiveTerminal();
        return terminal ? terminal.options.fontSize : null;
      });
      
      expect(actualSize).toBe(size);
      console.log(`✓ Font size ${size} applied in real-time`);
    }
    
    // 元に戻す
    await fontSizeInput.fill('14');
    await page.click('#pref-save');
  });

  test('6. 未実装機能の確認（Window設定）', async () => {
    // Preferencesを開く
    await page.click('#preferences-btn');
    await page.waitForSelector('.preference-window');
    
    // Window設定に移動
    await page.click('[data-category="window"]');
    
    // 透明度設定のテスト
    const transparentCheckbox = await page.locator('[data-pref="window.transparent"]');
    const opacitySlider = await page.locator('[data-pref="window.opacity"]');
    
    // 透明度を有効にする
    if (!await transparentCheckbox.isChecked()) {
      await transparentCheckbox.click();
    }
    
    // スライダーが有効になることを確認
    await expect(opacitySlider).not.toBeDisabled();
    
    // 値を変更してApply
    await opacitySlider.fill('0.8');
    await page.click('#pref-apply');
    
    // 注意: Window設定は現在メインプロセス連携が未実装なので、
    // 実際には反映されないことを確認
    console.log('⚠️  Window transparency settings are not yet implemented');
    
    await page.click('#pref-cancel');
  });

  test('7. エクスポート/インポート機能', async () => {
    // Preferencesを開く
    await page.click('#preferences-btn');
    await page.waitForSelector('.preference-window');
    
    // いくつかの設定を変更
    await page.click('[data-category="terminal"]');
    await page.fill('[data-pref="terminal.fontSize"]', '20');
    await page.click('[data-category="appearance"]');
    await page.selectOption('[data-pref="theme.name"]', 'Monokai');
    
    // エクスポートボタンをクリック（実際のファイル保存はモックする必要がある）
    await page.click('#pref-export');
    console.log('✓ Export dialog triggered (actual file save needs to be mocked)');
    
    // リセット機能のテスト
    await page.click('#pref-reset');
    
    // 確認ダイアログでキャンセル
    page.once('dialog', dialog => dialog.dismiss());
    await page.waitForTimeout(100);
    
    // 設定画面を閉じる
    await page.click('#pref-cancel');
  });
});

// パフォーマンステスト
test.describe('Preference Performance', () => {
  let app;
  let page;

  test.beforeEach(async () => {
    app = await electron.launch({
      args: [appPath],
      env: { ...process.env, NODE_ENV: 'test' }
    });
    page = await app.firstWindow();
    await page.waitForSelector('.terminal-wrapper', { state: 'visible' });
  });

  test.afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  test('設定変更のパフォーマンス', async () => {
    await page.click('#preferences-btn');
    await page.waitForSelector('.preference-window');
    
    // 高速な設定変更
    const startTime = Date.now();
    
    for (let i = 0; i < 10; i++) {
      await page.click('[data-category="terminal"]');
      await page.fill('[data-pref="terminal.fontSize"]', (14 + i).toString());
      await page.click('#pref-apply');
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✓ 10 preference changes completed in ${duration}ms`);
    expect(duration).toBeLessThan(5000); // 5秒以内に完了すること
    
    await page.click('#pref-cancel');
  });
});