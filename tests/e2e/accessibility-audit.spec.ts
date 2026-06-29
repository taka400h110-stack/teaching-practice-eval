import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/loginAs';
import { expectNoSeriousA11yViolations } from './helpers/axeAudit';

/**
 * 自動アクセシビリティ監査 (axe-core / WCAG 2.1 AA)
 *
 * 各ロールの主要ページ（ダッシュボード / 一覧 / 詳細）に対して axe を実行し、
 * impact が serious / critical の違反（button-name, color-contrast, label,
 * aria-* 等）が無いことを検証する。minor/moderate はログ出力のみ。
 *
 * デスクトップ Chrome 想定。Mobile Chrome では実行しない（レイアウト崩れ検知は
 * mobile-interaction-audit.spec.ts が担当）。
 */
test.describe('Accessibility (axe) Audit', () => {
  // 既知の非ブロッキング偽陽性をルール単位で除外したい場合はここに追加する。
  // 現状は除外なし（serious/critical を全件検出させる）。
  const COMMON_DISABLE: string[] = [];

  // ─────────────────────────────────────────────
  // ダッシュボード（ロール別ランディング）
  // ─────────────────────────────────────────────
  test('Student Dashboard - axe', async ({ page }) => {
    await loginAs(page, { role: 'student', state: 'ready' });
    await page.goto('/dashboard');
    await expect(page.getByTestId('student-dashboard-root')).toBeVisible({ timeout: 15000 });
    await page.waitForLoadState('networkidle');
    // 非同期データ（最近の日誌リスト等）の描画が落ち着くのを待つ（中間状態での偽陽性回避）
    await page.waitForTimeout(1200);
    await expectNoSeriousA11yViolations(page, { label: 'student-dashboard', disableRules: COMMON_DISABLE });
  });

  test('Teacher Dashboard - axe', async ({ page }) => {
    await loginAs(page, { role: 'teacher', state: 'ready' });
    await page.goto('/teacher-dashboard');
    await expect(page.getByTestId('teacher-dashboard-root')).toBeVisible({ timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await expectNoSeriousA11yViolations(page, { label: 'teacher-dashboard', disableRules: COMMON_DISABLE });
  });

  test('Admin Dashboard - axe', async ({ page }) => {
    await loginAs(page, { role: 'admin', state: 'ready' });
    await page.goto('/admin');
    await expect(page.getByTestId('admin-dashboard-root')).toBeVisible({ timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await expectNoSeriousA11yViolations(page, { label: 'admin-dashboard', disableRules: COMMON_DISABLE });
  });

  // ─────────────────────────────────────────────
  // 一覧・主要操作ページ（IconButton を多く含む — Item 2 の検証も兼ねる）
  // ─────────────────────────────────────────────
  test('Journal List (student) - axe', async ({ page }) => {
    await loginAs(page, { role: 'student', state: 'ready' });
    await page.goto('/journals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expectNoSeriousA11yViolations(page, { label: 'journal-list', disableRules: COMMON_DISABLE });
  });

  test('Evaluations List (teacher) - axe', async ({ page }) => {
    await loginAs(page, { role: 'teacher', state: 'ready' });
    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expectNoSeriousA11yViolations(page, { label: 'evaluations-list', disableRules: COMMON_DISABLE });
  });

  test('User Registration (admin) - axe', async ({ page }) => {
    await loginAs(page, { role: 'admin', state: 'ready' });
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expectNoSeriousA11yViolations(page, { label: 'user-registration', disableRules: COMMON_DISABLE });
  });

  test('Cohorts Management (teacher) - axe', async ({ page }) => {
    await loginAs(page, { role: 'teacher', state: 'ready' });
    await page.goto('/cohorts');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expectNoSeriousA11yViolations(page, { label: 'cohorts', disableRules: COMMON_DISABLE });
  });

  // ─────────────────────────────────────────────
  // 詳細・フォーム系ページ
  // ─────────────────────────────────────────────
  test('Journal Workflow (student) - axe', async ({ page }) => {
    await loginAs(page, { role: 'student', state: 'ready' });
    await page.goto('/journal-workflow');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expectNoSeriousA11yViolations(page, { label: 'journal-workflow', disableRules: COMMON_DISABLE });
  });

  test('Goals History (student) - axe', async ({ page }) => {
    await loginAs(page, { role: 'student', state: 'ready' });
    await page.goto('/goals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expectNoSeriousA11yViolations(page, { label: 'goals', disableRules: COMMON_DISABLE });
  });
});
