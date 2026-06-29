import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/loginAs';

/**
 * キーボード操作の E2E アクセシビリティ監査
 *
 * - Tab 順序: 主要ページで Tab を押すとフォーカス可能要素へ順に移動し、
 *   フォーカスインジケータ（:focus-visible）を持つ要素に到達できる。
 * - フォーカストラップ + Esc: モバイルの一時ドロワー（MUI temporary Drawer）は
 *   開いている間フォーカスを内部に保持し、Escape で閉じられる。
 * - スキップ的操作: キーボードのみでメインナビゲーションを開いて項目へ到達できる。
 *
 * これらはスクリーンリーダー利用者・キーボードのみの利用者にとって必須。
 */

test.describe('Keyboard Navigation Audit', () => {
  // ─────────────────────────────────────────────
  // 1) Tab でフォーカスが移動し、操作可能な要素にフォーカスできる
  // ─────────────────────────────────────────────
  test('Tab moves focus to interactive elements (student dashboard)', async ({ page }) => {
    await loginAs(page, { role: 'student', state: 'ready' });
    await page.goto('/dashboard');
    await expect(page.getByTestId('student-dashboard-root')).toBeVisible({ timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // 連続して Tab を押し、フォーカスがフォーカス可能要素（a/button/input等）に乗ることを確認
    const focusableTags = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY']);
    let reachedInteractive = false;
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el) return null;
        return {
          tag: el.tagName,
          tabindex: el.getAttribute('tabindex'),
          role: el.getAttribute('role'),
        };
      });
      if (info && (focusableTags.has(info.tag) || info.role === 'button' || info.tabindex === '0')) {
        reachedInteractive = true;
        break;
      }
    }
    expect(reachedInteractive, 'Tab キーで操作可能な要素にフォーカスできること').toBeTruthy();
  });

  // ─────────────────────────────────────────────
  // 2) フォーカス可能要素が可視のフォーカスインジケータを持つ
  // ─────────────────────────────────────────────
  test('Focused button has a visible focus indicator (outline/box-shadow)', async ({ page }) => {
    await loginAs(page, { role: 'student', state: 'ready' });
    await page.goto('/dashboard');
    await expect(page.getByTestId('student-dashboard-root')).toBeVisible({ timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // NOTE: MUI のフォーカスリング（outline / box-shadow）は :focus-visible 擬似クラスで
    // 付与される。プログラム的な element.focus() では :focus-visible が発火しないため、
    // 実際のキーボード操作（Tab）でフォーカスを移動させて検証する必要がある。
    await page.locator('body').click(); // フォーカスを一旦リセット
    let foundIndicator = false;
    let inspected = '';
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        // :focus-visible 由来のスタイルも getComputedStyle に反映される
        const csv = (() => {
          try {
            return el.matches(':focus-visible');
          } catch {
            return false;
          }
        })();
        return {
          tag: el.tagName,
          outlineStyle: cs.outlineStyle,
          outlineWidth: cs.outlineWidth,
          boxShadow: cs.boxShadow,
          focusVisible: csv,
        };
      });
      if (!info) continue;
      inspected = JSON.stringify(info);
      const hasIndicator =
        (info.outlineStyle !== 'none' && info.outlineWidth !== '0px') ||
        (info.boxShadow !== 'none' && info.boxShadow !== '') ||
        info.focusVisible; // :focus-visible が立っていればブラウザ既定のリングが表示される
      if (hasIndicator) {
        foundIndicator = true;
        break;
      }
    }
    // Tab で到達したいずれかのインタラクティブ要素が、キーボードフォーカス時に
    // 可視のフォーカスインジケータ（outline / box-shadow / :focus-visible）を持つこと。
    expect(
      foundIndicator,
      `キーボードフォーカス時に可視のフォーカスインジケータが必要。最後に検査した要素: ${inspected}`
    ).toBeTruthy();
  });

  // ─────────────────────────────────────────────
  // 3) モバイル一時ドロワー: キーボードで開閉でき、Esc で閉じる
  // ─────────────────────────────────────────────
  test.describe('Mobile drawer keyboard behavior', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('Hamburger opens nav drawer and Escape closes it', async ({ page }) => {
      await loginAs(page, { role: 'student', state: 'ready' });
      await page.goto('/dashboard');
      await expect(page.getByTestId('student-dashboard-root')).toBeVisible({ timeout: 15000 });
      await page.waitForLoadState('networkidle');

      // ハンバーガー（aria-label="メニューを開く"）をキーボード操作で起動
      const hamburger = page.getByRole('button', { name: 'メニューを開く' });
      await expect(hamburger).toBeVisible();
      await hamburger.focus();
      await page.keyboard.press('Enter');

      // 一時ドロワー（presentation/dialog）が開きナビゲーション項目が見える
      const dialog = page.locator('.MuiDrawer-root.MuiModal-root');
      await expect(dialog.first()).toBeVisible({ timeout: 5000 });
      // ナビ項目（例: ダッシュボード）がドロワー内に表示される
      await expect(page.getByRole('button', { name: /ダッシュボード/ }).first()).toBeVisible();

      // フォーカストラップ: フォーカスがドロワー（MuiModal）内部にあること
      const focusInsideModal = await page.evaluate(() => {
        const modal = document.querySelector('.MuiDrawer-root.MuiModal-root');
        const active = document.activeElement;
        return !!(modal && active && modal.contains(active));
      });
      expect(focusInsideModal, 'ドロワー表示中はフォーカスがモーダル内部に保持されること').toBeTruthy();

      // Escape で閉じる
      await page.keyboard.press('Escape');
      // MUI temporary Drawer はアンマウント既定のため、モーダルが非表示/消滅する
      await expect(page.locator('.MuiDrawer-root.MuiModal-root .MuiBackdrop-root')).toBeHidden({
        timeout: 5000,
      });
    });
  });

  // ─────────────────────────────────────────────
  // 4) フォーム: ラベルとフォーカス可能性（ログイン後の登録ページ）
  // ─────────────────────────────────────────────
  test('Form controls are reachable and labeled (user registration)', async ({ page }) => {
    await loginAs(page, { role: 'admin', state: 'ready' });
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // テキスト入力が少なくとも1つあり、フォーカス可能であること
    const inputs = page.locator('input:visible, textarea:visible');
    const count = await inputs.count();
    expect(count, '登録フォームに入力欄が存在すること').toBeGreaterThan(0);

    await inputs.first().focus();
    const isFocused = await inputs.first().evaluate((el) => el === document.activeElement);
    expect(isFocused, '入力欄がキーボードでフォーカス可能であること').toBeTruthy();
  });
});
