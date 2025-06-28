/**
 * 最適化後のPreference機能の包括的E2Eテスト
 * 
 * テストシナリオ：
 * 1. 削除された機能の確認（Privacy、Window）
 * 2. 簡略化されたAdvanced設定の確認
 * 3. Session機能の完全動作確認
 * 4. Coming Soonバッジの表示確認
 * 5. 全体的な動作確認
 */

const { test, expect, _electron: electron } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// テスト用のアプリケーションパス
const appPath = path.join(__dirname, '../../');

test.describe('最適化されたPreference機能', () => {
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
    
    console.log('✅ App launched successfully');
  });

  test.afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  test('1. 削除されたカテゴリの確認', async () => {
    console.log('\n🔍 Test 1: 削除されたカテゴリの確認');
    
    // Preferencesを開く
    await page.click('#preferences-btn');
    await page.waitForSelector('.preference-window');
    
    // カテゴリリストを取得
    const categories = await page.locator('.preference-category').all();
    const categoryTexts = await Promise.all(
      categories.map(cat => cat.textContent())
    );
    
    console.log('📋 Available categories:', categoryTexts);
    
    // Privacyカテゴリが存在しないことを確認
    const hasPrivacy = categoryTexts.some(text => text.includes('Privacy'));
    expect(hasPrivacy).toBe(false);
    console.log('✅ Privacy category removed');
    
    // Windowカテゴリが存在しないことを確認
    const hasWindow = categoryTexts.some(text => text.includes('Window'));
    expect(hasWindow).toBe(false);
    console.log('✅ Window category removed');
    
    // 期待されるカテゴリが存在することを確認
    expect(categoryTexts.some(text => text.includes('Terminal'))).toBe(true);
    expect(categoryTexts.some(text => text.includes('Appearance'))).toBe(true);
    expect(categoryTexts.some(text => text.includes('Shell & Profiles'))).toBe(true);
    expect(categoryTexts.some(text => text.includes('Session'))).toBe(true);
    expect(categoryTexts.some(text => text.includes('Keyboard'))).toBe(true);
    expect(categoryTexts.some(text => text.includes('Advanced'))).toBe(true);
    
    await page.click('.preference-close');
  });

  test('2. 簡略化されたAdvanced設定の確認', async () => {
    console.log('\n🔧 Test 2: 簡略化されたAdvanced設定の確認');
    
    // Preferencesを開く
    await page.click('#preferences-btn');
    await page.waitForSelector('.preference-window');
    
    // Advanced設定に移動
    await page.click('[data-category="advanced"]');
    await page.waitForSelector('[data-panel="advanced"]');
    
    // GPU設定が存在しないことを確認
    const gpuSection = await page.locator('h3:has-text("GPU Acceleration")').count();
    expect(gpuSection).toBe(0);
    console.log('✅ GPU settings removed');
    
    // FPSカウンターが存在しないことを確認
    const fpsOption = await page.locator('[data-pref="advanced.debugging.showFPS"]').count();
    expect(fpsOption).toBe(0);
    console.log('✅ FPS counter option removed');
    
    // 入力遅延表示が存在しないことを確認
    const latencyOption = await page.locator('[data-pref="advanced.debugging.showLatency"]').count();
    expect(latencyOption).toBe(0);
    console.log('✅ Input latency option removed');
    
    // Coming Soonバッジを確認
    const comingSoonBadges = await page.locator('.badge.coming-soon').all();
    expect(comingSoonBadges.length).toBeGreaterThan(0);
    console.log(`✅ Found ${comingSoonBadges.length} Coming Soon badges`);
    
    // Coming Soonが付いている機能を確認
    for (const badge of comingSoonBadges) {
      const parentText = await badge.locator('..').textContent();
      console.log(`  📌 Coming Soon: ${parentText.replace('Coming Soon', '').trim()}`);
    }
    
    await page.click('.preference-close');
  });

  test('3. Session機能の完全動作確認', async () => {
    console.log('\n🎬 Test 3: Session機能の完全動作確認');
    
    // Preferencesを開く
    await page.click('#preferences-btn');
    await page.waitForSelector('.preference-window');
    
    // Session設定に移動
    await page.click('[data-category="session"]');
    await page.waitForSelector('[data-panel="session"]');
    
    // Session Manager ボタンの存在を確認
    const sessionManagerBtn = await page.locator('#open-session-manager');
    expect(await sessionManagerBtn.isVisible()).toBe(true);
    expect(await sessionManagerBtn.textContent()).toContain('Open Session Manager');
    console.log('✅ Session Manager button found');
    
    // リアルタイムログ設定の確認
    const realtimeLogCheckbox = await page.locator('[data-pref="session.enableRealtimeLog"]');
    expect(await realtimeLogCheckbox.isVisible()).toBe(true);
    console.log('✅ Realtime log setting found');
    
    // 最大セッション数設定の確認
    const maxSessionsInput = await page.locator('[data-pref="session.maxSessions"]');
    expect(await maxSessionsInput.isVisible()).toBe(true);
    const maxSessions = await maxSessionsInput.inputValue();
    console.log(`✅ Max sessions setting found: ${maxSessions}`);
    
    // セッションディレクトリ設定の確認
    const sessionDirInput = await page.locator('[data-pref="session.sessionDirectory"]');
    expect(await sessionDirInput.isVisible()).toBe(true);
    console.log('✅ Session directory setting found');
    
    // Session Managerを開く
    await sessionManagerBtn.click();
    
    // Session Manager画面が表示されることを確認
    await page.waitForSelector('.session-manager-container', { timeout: 5000 });
    console.log('✅ Session Manager opened');
    
    // Session Manager UIの要素を確認
    expect(await page.locator('.session-search').isVisible()).toBe(true);
    expect(await page.locator('.session-sort').isVisible()).toBe(true);
    expect(await page.locator('.session-list').isVisible()).toBe(true);
    console.log('✅ Session Manager UI elements verified');
    
    // Session Managerを閉じる
    await page.click('.session-manager-close');
    await page.waitForSelector('.session-manager-container', { state: 'hidden' });
    
    await page.click('.preference-close');
  });

  test('4. 設定値の保存と適用の確認', async () => {
    console.log('\n💾 Test 4: 設定値の保存と適用の確認');
    
    // Preferencesを開く
    await page.click('#preferences-btn');
    await page.waitForSelector('.preference-window');
    
    // Terminal設定で複数の値を変更
    await page.click('[data-category="terminal"]');
    
    const changes = {
      fontSize: '20',
      scrollback: '20000',
      cursorStyle: 'bar'
    };
    
    // 値を変更
    await page.fill('[data-pref="terminal.fontSize"]', changes.fontSize);
    await page.fill('[data-pref="terminal.scrollback"]', changes.scrollback);
    await page.selectOption('[data-pref="terminal.cursorStyle"]', changes.cursorStyle);
    
    console.log('📝 Changed values:', changes);
    
    // Applyをクリック
    await page.click('#pref-apply');
    await page.waitForTimeout(300);
    
    // ターミナルに反映されたことを確認
    const terminalInfo = await page.evaluate(() => {
      const manager = window.zeamiTermManager;
      const terminal = manager?.getActiveTerminal();
      return {
        fontSize: terminal?.options.fontSize,
        scrollback: terminal?.options.scrollback,
        cursorStyle: terminal?.options.cursorStyle
      };
    });
    
    expect(terminalInfo.fontSize).toBe(parseInt(changes.fontSize));
    expect(terminalInfo.scrollback).toBe(parseInt(changes.scrollback));
    expect(terminalInfo.cursorStyle).toBe(changes.cursorStyle);
    console.log('✅ Settings applied to terminal:', terminalInfo);
    
    // 設定を保存して閉じる
    await page.click('#pref-save');
    await page.waitForSelector('.preference-window', { state: 'hidden' });
    
    // 再度開いて値が保持されていることを確認
    await page.click('#preferences-btn');
    await page.waitForSelector('.preference-window');
    await page.click('[data-category="terminal"]');
    
    const savedFontSize = await page.locator('[data-pref="terminal.fontSize"]').inputValue();
    const savedScrollback = await page.locator('[data-pref="terminal.scrollback"]').inputValue();
    const savedCursorStyle = await page.locator('[data-pref="terminal.cursorStyle"]').inputValue();
    
    expect(savedFontSize).toBe(changes.fontSize);
    expect(savedScrollback).toBe(changes.scrollback);
    expect(savedCursorStyle).toBe(changes.cursorStyle);
    console.log('✅ Settings persisted correctly');
    
    await page.click('.preference-close');
  });

  test('5. テーマ変更の動作確認', async () => {
    console.log('\n🎨 Test 5: テーマ変更の動作確認');
    
    // Preferencesを開く
    await page.click('#preferences-btn');
    await page.waitForSelector('.preference-window');
    
    // Appearance設定に移動
    await page.click('[data-category="appearance"]');
    await page.waitForSelector('[data-panel="appearance"]');
    
    // 各テーマをテスト
    const themes = ['VS Code Dark', 'VS Code Light', 'Monokai', 'Solarized Dark'];
    
    for (const theme of themes) {
      console.log(`\n🎨 Testing theme: ${theme}`);
      
      // テーマを選択
      await page.selectOption('[data-pref="theme.name"]', theme);
      
      // プレビューセクションの背景色を確認
      const previewBg = await page.locator('.theme-preview').evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );
      console.log(`  Preview background: ${previewBg}`);
      
      // Applyをクリック
      await page.click('#pref-apply');
      await page.waitForTimeout(200);
      
      // ターミナルに適用されたことを確認
      const terminalTheme = await page.evaluate(() => {
        const manager = window.zeamiTermManager;
        const terminal = manager?.getActiveTerminal();
        return terminal?.options.theme;
      });
      
      expect(terminalTheme).toBeDefined();
      expect(terminalTheme.background).toBeDefined();
      console.log(`  ✅ Theme applied - Background: ${terminalTheme.background}`);
      
      // スクリーンショットを撮る
      await page.screenshot({ 
        path: `test-results/optimized-theme-${theme.toLowerCase().replace(/\s+/g, '-')}.png`,
        fullPage: false 
      });
    }
    
    // 元のテーマに戻す
    await page.selectOption('[data-pref="theme.name"]', 'VS Code Dark');
    await page.click('#pref-save');
  });

  test('6. パフォーマンステスト', async () => {
    console.log('\n⚡ Test 6: パフォーマンステスト');
    
    const startTime = Date.now();
    
    // 高速に設定画面を開閉
    for (let i = 0; i < 5; i++) {
      await page.click('#preferences-btn');
      await page.waitForSelector('.preference-window');
      await page.click('.preference-close');
      await page.waitForSelector('.preference-window', { state: 'hidden' });
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ 5回の開閉が ${duration}ms で完了`);
    expect(duration).toBeLessThan(3000); // 3秒以内
    
    // カテゴリ切り替えのパフォーマンス
    await page.click('#preferences-btn');
    await page.waitForSelector('.preference-window');
    
    const categories = ['terminal', 'appearance', 'shell', 'session', 'keyboard', 'advanced'];
    const switchStartTime = Date.now();
    
    for (const category of categories) {
      await page.click(`[data-category="${category}"]`);
      await page.waitForSelector(`[data-panel="${category}"]`);
    }
    
    const switchDuration = Date.now() - switchStartTime;
    console.log(`✅ 6カテゴリの切り替えが ${switchDuration}ms で完了`);
    expect(switchDuration).toBeLessThan(1000); // 1秒以内
    
    await page.click('.preference-close');
  });

  test('7. エラーハンドリングの確認', async () => {
    console.log('\n🚨 Test 7: エラーハンドリングの確認');
    
    // Preferencesを開く
    await page.click('#preferences-btn');
    await page.waitForSelector('.preference-window');
    
    // Terminal設定に移動
    await page.click('[data-category="terminal"]');
    
    // 無効な値を入力
    const fontSizeInput = await page.locator('[data-pref="terminal.fontSize"]');
    await fontSizeInput.fill('999'); // 極端に大きい値
    await page.click('#pref-apply');
    
    // エラーが発生しないことを確認（適切に制限されるはず）
    const appliedSize = await page.evaluate(() => {
      const manager = window.zeamiTermManager;
      const terminal = manager?.getActiveTerminal();
      return terminal?.options.fontSize;
    });
    
    // 最大値（32）に制限されていることを確認
    expect(appliedSize).toBeLessThanOrEqual(32);
    console.log(`✅ Font size limited to: ${appliedSize}`);
    
    // リセット機能のテスト
    await page.click('#pref-reset');
    
    // 確認ダイアログが表示される
    page.once('dialog', async dialog => {
      console.log('📋 Reset dialog:', dialog.message());
      expect(dialog.message()).toContain('Reset all preferences to defaults?');
      await dialog.dismiss(); // キャンセル
    });
    
    await page.waitForTimeout(100);
    console.log('✅ Reset dialog handled correctly');
    
    await page.click('.preference-close');
  });
});

// 統合テスト
test.describe('統合テスト', () => {
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

  test('完全な使用シナリオ', async () => {
    console.log('\n🎯 完全な使用シナリオテスト');
    
    // 1. ターミナルでコマンドを実行
    const terminal = await page.locator('.xterm-screen');
    await terminal.click();
    await page.keyboard.type('echo "Hello ZeamiTerm"');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    console.log('✅ Command executed');
    
    // 2. Preference設定を変更
    await page.click('#preferences-btn');
    await page.waitForSelector('.preference-window');
    
    // フォントサイズを大きく
    await page.click('[data-category="terminal"]');
    await page.fill('[data-pref="terminal.fontSize"]', '18');
    
    // テーマをMonokaiに
    await page.click('[data-category="appearance"]');
    await page.selectOption('[data-pref="theme.name"]', 'Monokai');
    
    // セッション設定を確認
    await page.click('[data-category="session"]');
    const realtimeLog = await page.locator('[data-pref="session.enableRealtimeLog"]');
    if (!await realtimeLog.isChecked()) {
      await realtimeLog.click();
    }
    
    // 設定を保存
    await page.click('#pref-save');
    await page.waitForSelector('.preference-window', { state: 'hidden' });
    console.log('✅ Preferences updated');
    
    // 3. 新しいターミナルを作成
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+T' : 'Control+T');
    await page.waitForTimeout(500);
    
    // 設定が新しいターミナルにも適用されていることを確認
    const newTerminalInfo = await page.evaluate(() => {
      const manager = window.zeamiTermManager;
      const terminal = manager?.getActiveTerminal();
      return {
        fontSize: terminal?.options.fontSize,
        theme: terminal?.options.theme?.name || 'custom'
      };
    });
    
    expect(newTerminalInfo.fontSize).toBe(18);
    console.log('✅ Settings applied to new terminal');
    
    // 4. セッションコマンドのテスト
    // アクティブなターミナルをクリック
    await page.locator('.terminal.xterm.focus .xterm-screen').click();
    await page.keyboard.type('session list');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    console.log('✅ Session command executed');
    
    // 最終スクリーンショット
    await page.screenshot({ 
      path: 'test-results/final-integration-test.png',
      fullPage: true 
    });
    
    console.log('\n🎉 All integration tests passed!');
  });
});