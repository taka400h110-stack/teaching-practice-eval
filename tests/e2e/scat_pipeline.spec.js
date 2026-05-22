/**
 * SCAT パイプライン E2E 検証
 *
 * Researcher として:
 *   1. ログイン
 *   2. SCAT プロジェクト作成
 *   3. セグメント追加
 *   4. コード入力 (step1 〜 step4)
 *   5. 理論化 (storyline, theoretical_description)
 *   6. 一覧取得・確認
 *
 * 使い方: node tests/e2e/scat_pipeline.spec.js
 * 本番 URL: https://teaching-practice-eval.pages.dev
 */
const BASE = process.env.BASE_URL || "https://teaching-practice-eval.pages.dev";

async function login(email, password) {
  const r = await fetch(`${BASE}/api/data/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(`login failed: ${r.status}`);
  const j = await r.json();
  return j.token;
}

async function apiPost(token, path, body) {
  return fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

async function apiPut(token, path, body) {
  return fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

async function apiGet(token, path) {
  return fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

(async () => {
  const results = [];
  const log = (label, ok, extra = "") => {
    results.push({ label, ok, extra });
    console.log(`${ok ? "OK " : "NG "} ${label} ${extra}`);
  };

  try {
    const token = await login("researcher@teaching-eval.jp", "password");
    log("login as researcher", true);

    // 1. プロジェクト作成
    const projRes = await apiPost(token, "/api/data/scat/projects", {
      title: `E2E Test Project ${Date.now()}`,
      description: "E2E SCAT pipeline test",
      created_by: "researcher@teaching-eval.jp",
    });
    log("POST /scat/projects", projRes.ok, `status=${projRes.status}`);
    if (!projRes.ok) {
      console.error(await projRes.text());
      process.exit(1);
    }
    const { id: projectId } = await projRes.json();
    console.log(`   projectId=${projectId}`);

    // 1b. バリデーションテスト: title なしで 400
    const projBadRes = await apiPost(token, "/api/data/scat/projects", {
      description: "missing title",
    });
    log("POST /scat/projects without title → 400", projBadRes.status === 400, `status=${projBadRes.status}`);

    // 2. セグメント追加
    const segRes = await apiPost(token, `/api/data/scat/segments/${projectId}`, {
      segments: [
        { text_content: "セグメント1: 実習生が初日に緊張していた様子が見られた" },
        { text_content: "セグメント2: 子どもとの会話を試みるも声が小さかった" },
        { text_content: "セグメント3: 翌日は積極的に声をかけるようになった" },
      ],
    });
    log("POST /scat/segments/:projectId", segRes.ok, `status=${segRes.status}`);

    // 2b. バリデーション: segments 空配列で 400
    const segBadRes = await apiPost(token, `/api/data/scat/segments/${projectId}`, {
      segments: [],
    });
    log("POST /scat/segments empty array → 400", segBadRes.status === 400, `status=${segBadRes.status}`);

    // 3. セグメント取得
    const segGet = await apiGet(token, `/api/data/scat/segments/${projectId}`);
    const segData = await segGet.json();
    log(
      "GET /scat/segments/:projectId",
      segGet.ok && Array.isArray(segData.segments) && segData.segments.length === 3,
      `count=${segData.segments?.length}`,
    );

    // 4. コード入力 (各セグメントに step1-4)
    for (const seg of segData.segments || []) {
      const codeRes = await apiPost(token, "/api/data/scat/codes", {
        segment_id: seg.id,
        researcher_id: "researcher@teaching-eval.jp",
        step1_keywords: "緊張, 初日",
        step2_thesaurus: "不安, 適応過程",
        step3_concept: "実習適応不安",
        step4_theme: "適応プロセスにおける情動変化",
        memo: "E2E test memo",
      });
      log(`POST /scat/codes seg=${seg.id}`, codeRes.ok, `status=${codeRes.status}`);
    }

    // 4b. バリデーション: segment_id なしで 400
    const codeBadRes = await apiPost(token, "/api/data/scat/codes", {
      step1_keywords: "no segment_id",
    });
    log("POST /scat/codes without segment_id → 400", codeBadRes.status === 400, `status=${codeBadRes.status}`);

    // 5. 理論化更新
    const theorRes = await apiPut(token, `/api/data/scat/projects/${projectId}/theorization`, {
      storyline:
        "実習生は初日緊張し声が小さかったが、翌日には適応し積極的になった。これは短期適応プロセスの一例である。",
      theoretical_description:
        "新規環境への短期適応過程として、24時間以内に情動緊張→受容→積極的関与へと推移するパターン。",
    });
    log("PUT /scat/projects/:id/theorization", theorRes.ok, `status=${theorRes.status}`);

    // 6. コード一覧確認
    const codesGet = await apiGet(token, `/api/data/scat/codes/${projectId}`);
    const codesData = await codesGet.json();
    log(
      "GET /scat/codes/:projectId",
      codesGet.ok && Array.isArray(codesData.codes) && codesData.codes.length === 3,
      `count=${codesData.codes?.length}`,
    );

    // 7. board_observer は SCAT 書き込み不可 (403)
    const boToken = await login("observer@teaching-eval.jp", "password");
    const boWriteRes = await apiPost(boToken, "/api/data/scat/projects", {
      title: "board_observer should NOT create",
    });
    log("board_observer POST /scat/projects → 403", boWriteRes.status === 403, `status=${boWriteRes.status}`);

    // 8. board_observer は SCAT 読み取り可能
    const boReadRes = await apiGet(boToken, "/api/data/scat/projects");
    log("board_observer GET /scat/projects → 200", boReadRes.ok, `status=${boReadRes.status}`);

    const pass = results.filter((r) => r.ok).length;
    const total = results.length;
    console.log(`\n=== SCAT E2E: ${pass}/${total} passed ===`);
    process.exit(pass === total ? 0 : 1);
  } catch (e) {
    console.error("E2E ERROR:", e);
    process.exit(2);
  }
})();
