/**
 * journal-core-regression.spec.ts
 *
 * 中核機能である「教育実習日誌」の提出フローが壊れていないことを保証する回帰テスト。
 * Phase 12 で発見・修正した致命バグ2件
 *   1) createJournal が status:"draft"/entry_date:today をハードコードで上書き
 *      → 「提出してAI評価へ」を押しても draft 保存され自動評価が起動しない
 *   2) PUT /journals/:id が存在しないカラム(reflection_text 等)で D1_ERROR → 500
 *      → 既存日誌を開いて draft→submitted する操作が必ず失敗する
 * の再発を CI で自動検知することを目的とする。
 *
 * 注: CI 環境には OPENAI_API_KEY が無いため AI 評価レコードは生成されない。
 *     本テストはコア要件 (status=submitted / 選択した実習日が尊重される /
 *     提出時に 4xx・5xx が出ない) を厳密に検証する。AI 評価本体の動作確認は対象外。
 */
import { test, expect, Page, BrowserContext } from '@playwright/test';

const STUDENT_EMAIL = 'student@teaching-eval.jp';

const IGNORE_PATTERNS: RegExp[] = [/favicon\.ico/i];

function shouldIgnore(msg: string): boolean {
  return IGNORE_PATTERNS.some((p) => p.test(msg));
}

async function loginViaApi(page: Page, email: string): Promise<{ user: any; token: string }> {
  const resp = await page.request.post('/api/data/auth/login', {
    data: { email, password: 'password' },
  });
  expect(resp.ok(), `login should succeed for ${email}`).toBe(true);
  const json = (await resp.json()) as { success: boolean; user: any; token: string };
  expect(json.success).toBe(true);
  expect(json.token).toBeTruthy();
  return { user: json.user, token: json.token };
}

async function seedAuth(context: BrowserContext, auth: { user: any; token: string }): Promise<void> {
  await context.addInitScript((authData) => {
    localStorage.setItem('token', authData.token);
    localStorage.setItem('auth_token', authData.token);
    localStorage.setItem('user', JSON.stringify(authData.user));
    localStorage.setItem('user_info', JSON.stringify(authData.user));
    localStorage.setItem(`onboarding_done_${authData.user.id}`, 'true');
    localStorage.removeItem('pending_onboarding');
  }, auth);
}

/** ランダムな過去日付を返す (UNIQUE(student,date) 衝突回避のため再実行ごとに変える) */
function uniquePastDate(): string {
  const dd = String(1 + Math.floor(Math.random() * 27)).padStart(2, '0');
  const mm = String(1 + Math.floor(Math.random() * 9)).padStart(2, '0');
  return `2025-${mm}-${dd}`;
}

const BODY_TEXT =
  '本日は算数の授業を担当した。児童の反応を見ながら机間指導を行い、つまずいている児童に個別に声かけをした。授業の導入で具体物を使ったことで関心を引き出せた。';

/** 本文 textarea を特定し入力する。折りたたまれている場合は展開してから入力する。 */
async function fillJournalBody(page: Page, text: string): Promise<void> {
  // 本文欄は placeholder「授業の内容・活動の様子を記録…」で特定できる
  const bodyField = page.locator('textarea[placeholder*="授業の内容"]').first();
  if ((await bodyField.count()) === 0) {
    // 折りたたみ状態の可能性 → 展開トグルを押す
    const expandBtn = page.getByRole('button', { name: /本文を展開/ }).first();
    if (await expandBtn.count()) {
      await expandBtn.click();
      await page.waitForTimeout(300);
    }
  }
  const field = page.locator('textarea[placeholder*="授業の内容"]').first();
  if (await field.count()) {
    await field.fill(text);
  } else {
    // フォールバック: 最初の textarea
    await page.locator('textarea').first().fill(text);
  }
}

async function fetchLatestJournal(page: Page, token: string, studentId: string): Promise<any | null> {
  const resp = await page.request.get('/api/data/journals', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const list = await resp.json();
  const journals = Array.isArray(list) ? list : list.journals || list.data || [];
  return (
    journals
      .filter((j: any) => j.student_id === studentId)
      .sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''))[0] || null
  );
}

test.describe('教育実習日誌コア機能 回帰テスト', () => {
  test('新規日誌を「提出してAI評価へ」で提出すると status=submitted・選択した実習日が尊重される', async ({
    browser,
  }) => {
    // --- API ログイン ---
    const tmpCtx = await browser.newContext();
    const tmpPage = await tmpCtx.newPage();
    const auth = await loginViaApi(tmpPage, STUDENT_EMAIL);
    await tmpPage.close();
    await tmpCtx.close();

    const context = await browser.newContext();
    await seedAuth(context, auth);
    const page = await context.newPage();

    const netErrors: string[] = [];
    page.on('response', (res) => {
      const url = res.url();
      const status = res.status();
      if (!url.includes('/api/')) return;
      if (status >= 400 && status !== 304) {
        if (shouldIgnore(`${url} ${status}`)) return;
        netErrors.push(`${status} ${res.request().method()} ${url.replace(/^https?:\/\/[^/]+/, '')}`);
      }
    });

    // --- 新規日誌記入 ---
    await page.goto('/journal-workflow', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const chosenDate = uniquePastDate();
    const dateInput = page.locator('input[type="date"]').first();
    await expect(dateInput, '実習日入力欄が存在する').toHaveCount(1);
    await dateInput.fill(chosenDate);

    await fillJournalBody(page, BODY_TEXT);
    await page.waitForTimeout(400);

    // --- 提出 ---
    const submitBtn = page.getByRole('button', { name: /提出してAI評価/ });
    await expect(submitBtn, '「提出してAI評価へ」ボタンが存在する').toHaveCount(1);
    await submitBtn.first().click();

    // 提出完了スナックバー (autoHideDuration=3000ms のため早めに確認)
    await expect(
      page.getByText(/提出しました|AI評価が完了/),
      '提出成功のスナックバーが表示される',
    ).toBeVisible({ timeout: 5000 });

    // パイプライン + ステップ遷移を待つ
    await page.waitForTimeout(3000);

    // --- 保存結果を API で検証 ---
    const latest = await fetchLatestJournal(page, auth.token, auth.user.id);
    expect(latest, '提出した日誌が取得できる').toBeTruthy();
    expect(latest.status, 'status は submitted (draft のまま提出されていない)').toBe('submitted');
    expect(
      (latest.entry_date || '').slice(0, 10),
      '選択した実習日が尊重されている (today で上書きされていない)',
    ).toBe(chosenDate);

    // --- 提出時に致命的な 4xx/5xx が出ていないこと ---
    expect(
      netErrors,
      `提出フロー中に API エラーが検出されました:\n${netErrors.join('\n')}`,
    ).toEqual([]);

    await context.close();
  });

  test('既存の下書きを開いて提出すると 500 にならず draft→submitted に更新される', async ({
    browser,
  }) => {
    // --- API ログイン (この context は下書き作成にも使うので開いたままにする) ---
    const apiCtx = await browser.newContext();
    const apiPage = await apiCtx.newPage();
    const auth = await loginViaApi(apiPage, STUDENT_EMAIL);

    // --- まず下書きを API で作成 (entry_date は一意に) ---
    const draftDate = uniquePastDate();
    const draftContent = JSON.stringify({
      version: 2,
      records: [
        {
          id: 'r1',
          order: 0,
          time_label: '1時限',
          time_start: '09:00',
          time_end: '09:45',
          subject: '国語',
          lesson_goal: '',
          body: '物語文の読み取りを行った。登場人物の心情を問う発問を中心に進め、児童の発言を板書で整理した。',
          difficulty: '',
          devise: '',
        },
      ],
      reflection: '',
    });
    const createResp = await apiPage.request.post('/api/data/journals', {
      headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
      data: {
        student_id: auth.user.id,
        entry_date: draftDate,
        title: '回帰テスト下書き',
        content: draftContent,
        status: 'draft',
      },
    });
    expect(createResp.ok(), '下書きの作成に成功する').toBe(true);
    const created = await createResp.json();
    const draftId = created.id;
    expect(draftId, '作成された下書きの id が返る').toBeTruthy();
    await apiPage.close();
    await apiCtx.close();

    // --- ブラウザで編集モードを開く ---
    const context = await browser.newContext();
    await seedAuth(context, auth);
    const page = await context.newPage();

    const netErrors: string[] = [];
    page.on('response', (res) => {
      const url = res.url();
      const status = res.status();
      if (!url.includes('/api/')) return;
      if (status >= 400 && status !== 304) {
        if (shouldIgnore(`${url} ${status}`)) return;
        netErrors.push(`${status} ${res.request().method()} ${url.replace(/^https?:\/\/[^/]+/, '')}`);
      }
    });

    // PATH パラメータでの編集モード (?id= ではない)
    await page.goto(`/journal-workflow/${draftId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);

    // 本文が復元されていること (字数チップ or textarea の値)
    const restored = await page.locator('textarea[placeholder*="授業の内容"]').first();
    if (await restored.count()) {
      const val = await restored.inputValue();
      expect(val.length, '下書き本文が復元されている').toBeGreaterThan(10);
    }

    // --- 提出 ---
    const submitBtn = page.getByRole('button', { name: /提出してAI評価/ });
    await expect(submitBtn, '編集モードに提出ボタンがある').toHaveCount(1);
    await submitBtn.first().click();

    await expect(
      page.getByText(/提出しました|AI評価が完了/),
      '編集モードでも提出成功スナックバーが出る',
    ).toBeVisible({ timeout: 5000 });

    await page.waitForTimeout(3000);

    // --- 提出後の状態を検証 ---
    const after = await fetchLatestJournal(page, auth.token, auth.user.id);
    const target = after && after.id === draftId ? after : null;
    // 念のため id 指定でも取得
    const byIdResp = await page.request.get(`/api/data/journals/${draftId}`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    let byId: any = null;
    if (byIdResp.ok()) {
      const j = await byIdResp.json();
      byId = j.journal || j.data || j;
    }
    const finalStatus = (target?.status) || (byId?.status);
    expect(finalStatus, '編集モード提出後の status が submitted (PUT が 500 で失敗していない)').toBe(
      'submitted',
    );

    // --- 500 を含む API エラーが出ていないこと (旧バグは D1_ERROR→500) ---
    expect(
      netErrors,
      `編集モード提出中に API エラーが検出されました:\n${netErrors.join('\n')}`,
    ).toEqual([]);

    await context.close();
  });
});
