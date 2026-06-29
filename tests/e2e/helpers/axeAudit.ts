import { Page, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * アクセシビリティ監査ヘルパー (axe-core)
 *
 * WCAG 2.0/2.1 A & AA のルールセットで現在のページを検査し、
 * impact が serious / critical の違反があればテストを失敗させる。
 * (minor / moderate は情報として出力するが失敗にはしない — 段階的改善のため)
 *
 * アプリ全体に共通する既知の課題（recharts SVG、サードパーティ等）で
 * 偽陽性が出る場合は disableRules で個別に除外できる。
 */

export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** 失敗とみなす impact レベル */
const BLOCKING_IMPACTS = new Set(['serious', 'critical']);

/**
 * 「既知だがデザインシステム/テーマ全体に関わる課題」で、別タスクとして段階的に
 * 改善するためブロッキング扱いにしないルールID。
 * テストは実行・記録するが、これらでは失敗させない（ラチェット方式）。
 *
 * - color-contrast: MUI 既定の Chip / caption 文字色などテーマトークン由来。
 *   theme.ts の主要コントラストは確認済み。残りは ACCESSIBILITY_AUDIT.md に集約。
 */
export const TRACKED_NON_BLOCKING_RULES = new Set<string>(['color-contrast']);

export interface AxeAuditOptions {
  /** 検査対象を限定する CSS セレクタ（省略時はページ全体） */
  include?: string;
  /** 一時的に除外する axe ルールID（既知の偽陽性・別対応予定のもの） */
  disableRules?: string[];
  /** ラベル（レポート出力用） */
  label?: string;
  /**
   * 非同期描画（react-query 等）の中間状態で偽陽性が出る場合に、
   * ブロッキング違反検知時に settle 待ち→再検査を行う回数（既定 1 回）。
   * 再検査でも違反が残る場合のみ失敗とする。
   */
  retries?: number;
}

export interface AxeViolationSummary {
  id: string;
  impact: string | null | undefined;
  help: string;
  nodes: number;
  targets: string[];
}

/**
 * 指定ページで axe を実行し、結果サマリを返す（失敗判定はしない）。
 * 監査レポート生成にも使えるよう、生のサマリを返すバージョン。
 */
export async function collectAxeViolations(
  page: Page,
  options: AxeAuditOptions = {}
): Promise<AxeViolationSummary[]> {
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  if (options.include) builder = builder.include(options.include);
  if (options.disableRules?.length) builder = builder.disableRules(options.disableRules);

  const results = await builder.analyze();
  return results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.length,
    targets: v.nodes.flatMap((n) => n.target.map(String)).slice(0, 5),
  }));
}

/**
 * 指定ページで axe を実行し、serious/critical 違反があれば失敗させる。
 * 違反内容は読みやすい形でエラーメッセージに含める。
 */
export async function expectNoSeriousA11yViolations(
  page: Page,
  options: AxeAuditOptions = {}
): Promise<void> {
  const maxRetries = options.retries ?? 1;
  const isBlocking = (v: AxeViolationSummary) =>
    BLOCKING_IMPACTS.has(String(v.impact)) && !TRACKED_NON_BLOCKING_RULES.has(v.id);

  let all = await collectAxeViolations(page, options);

  // 非同期描画の中間状態による偽陽性（例: react-query 解決前の一時的な <ul> 構造）に
  // 備え、ブロッキング違反が出た場合は settle 待ちをして再検査する（ラチェットは維持）。
  for (let attempt = 0; attempt < maxRetries && all.some(isBlocking); attempt++) {
    console.log(
      `[a11y:${options.label ?? 'page'}] blocking 違反を検知、settle 待ち後に再検査 (retry ${attempt + 1}/${maxRetries})`
    );
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);
    all = await collectAxeViolations(page, options);
  }

  const blocking = all.filter(isBlocking);
  const tracked = all.filter((v) => TRACKED_NON_BLOCKING_RULES.has(v.id));
  const nonBlocking = all.filter(
    (v) => !BLOCKING_IMPACTS.has(String(v.impact)) && !TRACKED_NON_BLOCKING_RULES.has(v.id)
  );

  if (tracked.length > 0) {
    // 既知の追跡対象（別タスクで段階改善）。失敗にはしない。
    console.log(
      `[a11y:${options.label ?? 'page'}] TRACKED (non-blocking, see ACCESSIBILITY_AUDIT.md): ` +
        tracked.map((v) => `${v.id}(${v.impact})x${v.nodes}`).join(', ')
    );
  }
  if (nonBlocking.length > 0) {
    // 情報出力（失敗にはしない）
    console.log(
      `[a11y:${options.label ?? 'page'}] non-blocking (minor/moderate) violations: ` +
        nonBlocking.map((v) => `${v.id}(${v.impact})x${v.nodes}`).join(', ')
    );
  }

  const detail = blocking
    .map(
      (v) =>
        `  - [${v.impact}] ${v.id}: ${v.help}\n      nodes=${v.nodes} e.g. ${v.targets.join(' | ')}`
    )
    .join('\n');

  expect(
    blocking.length,
    blocking.length > 0
      ? `[a11y:${options.label ?? 'page'}] serious/critical アクセシビリティ違反が ${blocking.length} 件:\n${detail}`
      : undefined
  ).toBe(0);
}
