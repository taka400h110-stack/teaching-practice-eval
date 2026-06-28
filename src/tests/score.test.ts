import {
  computeStrictScores,
  computeFactorWeightedTotal,
  roundScore,
  TOTAL_ITEM_COUNT,
  FACTOR_ITEM_COUNTS,
} from "../utils/score";

/**
 * 6因子40項目ルーブリック（src/constants/rubric.ts）に対応したテスト。
 * 因子境界:
 *   factor1: 項目 1–11 (11項目)
 *   factor2: 項目 12–19 (8項目)
 *   factor3: 項目 20–24 (5項目)
 *   factor4: 項目 25–31 (7項目)
 *   factor5: 項目 32–36 (5項目)
 *   factor6: 項目 37–40 (4項目)
 */
function runTests() {
  console.log("=== スコア計算ユーティリティのテスト (6因子40項目) ===");

  // Test 0: 定数の検証
  console.assert(TOTAL_ITEM_COUNT === 40, `Test 0.1 failed: TOTAL_ITEM_COUNT is ${TOTAL_ITEM_COUNT}`);
  console.assert(FACTOR_ITEM_COUNTS.factor1 === 11, `Test 0.2 failed: ${FACTOR_ITEM_COUNTS.factor1}`);
  console.assert(FACTOR_ITEM_COUNTS.factor2 === 8, `Test 0.3 failed: ${FACTOR_ITEM_COUNTS.factor2}`);
  console.assert(FACTOR_ITEM_COUNTS.factor3 === 5, `Test 0.4 failed: ${FACTOR_ITEM_COUNTS.factor3}`);
  console.assert(FACTOR_ITEM_COUNTS.factor4 === 7, `Test 0.5 failed: ${FACTOR_ITEM_COUNTS.factor4}`);
  console.assert(FACTOR_ITEM_COUNTS.factor5 === 5, `Test 0.6 failed: ${FACTOR_ITEM_COUNTS.factor5}`);
  console.assert(FACTOR_ITEM_COUNTS.factor6 === 4, `Test 0.7 failed: ${FACTOR_ITEM_COUNTS.factor6}`);
  const sumCounts =
    FACTOR_ITEM_COUNTS.factor1 + FACTOR_ITEM_COUNTS.factor2 + FACTOR_ITEM_COUNTS.factor3 +
    FACTOR_ITEM_COUNTS.factor4 + FACTOR_ITEM_COUNTS.factor5 + FACTOR_ITEM_COUNTS.factor6;
  console.assert(sumCounts === 40, `Test 0.8 failed: sum of factor counts is ${sumCounts}`);
  console.log("-> 定数(40項目/因子内訳[11,8,5,7,5,4])テストOK");

  // Test 1: roundScore
  const r1 = roundScore(3.144);
  const r2 = roundScore(3.145);
  console.assert(r1 === 3.14, `Test 1.1 failed: ${r1}`);
  console.assert(r2 === 3.15, `Test 1.2 failed: ${r2}`);
  console.log("-> 丸め処理テストOK");

  // Test 2: computeStrictScores (すべて評価済み)
  const itemsAll = Array.from({ length: 40 }, (_, i) => ({
    item_number: i + 1,
    score: 3.0,
    is_na: false,
  }));
  const strict1 = computeStrictScores(itemsAll);
  console.assert(strict1.total_score === 3.0, `Test 2.1 failed: ${strict1.total_score}`);
  console.assert(strict1.evaluated_item_count === 40, `Test 2.2 failed: ${strict1.evaluated_item_count}`);
  console.assert(strict1.factor1_score === 3.0, `Test 2.3 failed`);
  console.assert(strict1.factor6_score === 3.0, `Test 2.4 failed`);
  console.log("-> 厳密平均テスト(全40項目)OK");

  // Test 3: computeStrictScores (NULL/NAあり)
  const itemsPartial = Array.from({ length: 40 }, (_, i) => {
    const n = i + 1;
    // factor1(1~11)のうち2項目をNULLにする
    if (n === 10 || n === 11) return { item_number: n, score: null as number | null };
    // factor3(20~24)のうち1項目をNAにする
    if (n === 20) return { item_number: n, score: 5.0, is_na: true };
    return { item_number: n, score: 3.0, is_na: false };
  });
  const strict2 = computeStrictScores(itemsPartial);
  // 評価された項目数: 40 - 2(NULL) - 1(NA) = 37項目
  console.assert(strict2.evaluated_item_count === 37, `Test 3.1 failed: count is ${strict2.evaluated_item_count}`);
  // 入力はすべて3.0、NA/NULLは除外されるので平均は3.0のまま
  console.assert(strict2.total_score === 3.0, `Test 3.2 failed: total is ${strict2.total_score}`);
  console.log("-> 厳密平均テスト(NULL/NA除外)OK");

  // Test 4: computeFactorWeightedTotal と computeStrictScores の比較
  // 各因子に異なるスコアを与え、両者が一致することを確認する
  // f1=5.0, f2=4.0, f3=3.0, f4=2.0, f5=1.0, f6=5.0
  const itemsF: Array<{ item_number: number; score: number }> = [];
  for (let i = 1; i <= 11; i++) itemsF.push({ item_number: i, score: 5.0 });   // factor1
  for (let i = 12; i <= 19; i++) itemsF.push({ item_number: i, score: 4.0 });  // factor2
  for (let i = 20; i <= 24; i++) itemsF.push({ item_number: i, score: 3.0 });  // factor3
  for (let i = 25; i <= 31; i++) itemsF.push({ item_number: i, score: 2.0 });  // factor4
  for (let i = 32; i <= 36; i++) itemsF.push({ item_number: i, score: 1.0 });  // factor5
  for (let i = 37; i <= 40; i++) itemsF.push({ item_number: i, score: 5.0 });  // factor6

  const strictF = computeStrictScores(itemsF);
  const weightedTotal = computeFactorWeightedTotal(5.0, 4.0, 3.0, 2.0, 1.0, 5.0);

  console.assert(strictF.factor1_score === 5.0, `Test 4.1 failed: f1=${strictF.factor1_score}`);
  console.assert(strictF.factor2_score === 4.0, `Test 4.2 failed: f2=${strictF.factor2_score}`);
  console.assert(strictF.factor3_score === 3.0, `Test 4.3 failed: f3=${strictF.factor3_score}`);
  console.assert(strictF.factor4_score === 2.0, `Test 4.4 failed: f4=${strictF.factor4_score}`);
  console.assert(strictF.factor5_score === 1.0, `Test 4.5 failed: f5=${strictF.factor5_score}`);
  console.assert(strictF.factor6_score === 5.0, `Test 4.6 failed: f6=${strictF.factor6_score}`);

  // 期待値: (5*11 + 4*8 + 3*5 + 2*7 + 1*5 + 5*4) / 40
  //        = (55 + 32 + 15 + 14 + 5 + 20) / 40 = 141 / 40 = 3.525 -> 3.53
  const expected = roundScore((5 * 11 + 4 * 8 + 3 * 5 + 2 * 7 + 1 * 5 + 5 * 4) / 40);
  console.assert(weightedTotal === expected, `Test 4.7 failed: ${weightedTotal} !== ${expected}`);
  console.assert(weightedTotal === 3.53, `Test 4.8 failed: ${weightedTotal} !== 3.53`);
  console.assert(
    strictF.total_score === weightedTotal,
    `Test 4.9 failed: strict ${strictF.total_score} !== weighted ${weightedTotal}`,
  );
  console.log("-> 加重平均・厳密平均の一致確認(6因子)OK");

  console.log("========================================");
  console.log("全てのテストがパスしました。");
}

runTests();
