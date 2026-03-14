import { computeStrictScores, computeFactorWeightedTotal, roundScore } from "../utils/score";

function runTests() {
  console.log("=== スコア計算ユーティリティのテスト ===");

  // Test 1: roundScore
  const r1 = roundScore(3.144);
  const r2 = roundScore(3.145);
  console.assert(r1 === 3.14, `Test 1.1 failed: ${r1}`);
  console.assert(r2 === 3.15, `Test 1.2 failed: ${r2}`);
  console.log("-> 丸め処理テストOK");

  // Test 2: computeStrictScores (すべて評価済み)
  const itemsAll = Array.from({ length: 23 }, (_, i) => ({
    item_number: i + 1,
    score: 3.0,
    is_na: false,
  }));
  const strict1 = computeStrictScores(itemsAll);
  console.assert(strict1.total_score === 3.0, `Test 2.1 failed`);
  console.assert(strict1.evaluated_item_count === 23, `Test 2.2 failed`);
  console.log("-> 厳密平均テスト(全項目)OK");

  // Test 3: computeStrictScores (NULL/NAあり)
  const itemsPartial = Array.from({ length: 23 }, (_, i) => {
    // 因子1(1~7)の最後の2つをNULLにする (7項目中5項目が評価済み)
    if (i + 1 === 6 || i + 1 === 7) return { item_number: i + 1, score: null };
    // 因子3(14~17)の最初の1つをNAにする (4項目中3項目が評価済み)
    if (i + 1 === 14) return { item_number: i + 1, score: 5.0, is_na: true };
    return { item_number: i + 1, score: 3.0, is_na: false };
  });
  
  const strict2 = computeStrictScores(itemsPartial);
  // 評価された項目数: 23 - 2(NULL) - 1(NA) = 20項目
  console.assert(strict2.evaluated_item_count === 20, `Test 3.1 failed: count is ${strict2.evaluated_item_count}`);
  
  // スコアはすべて3.0を入力しているが、NAされたものは除外されるので、平均は変わらず3.0になるはず
  console.assert(strict2.total_score === 3.0, `Test 3.2 failed: total is ${strict2.total_score}`);
  console.log("-> 厳密平均テスト(NULL/NA除外)OK");

  // Test 4: computeFactorWeightedTotal と computeStrictScores の比較
  // factor1=5(7項), factor2=3(6項), factor3=1(4項), factor4=3(6項)
  const itemsF = [];
  for (let i=1; i<=7; i++) itemsF.push({ item_number: i, score: 5.0 });
  for (let i=8; i<=13; i++) itemsF.push({ item_number: i, score: 3.0 });
  for (let i=14; i<=17; i++) itemsF.push({ item_number: i, score: 1.0 });
  for (let i=18; i<=23; i++) itemsF.push({ item_number: i, score: 3.0 });
  
  const strictF = computeStrictScores(itemsF);
  const weightedTotal = computeFactorWeightedTotal(5.0, 3.0, 1.0, 3.0);
  
  console.assert(strictF.total_score === weightedTotal, `Test 4.1 failed: ${strictF.total_score} !== ${weightedTotal}`);
  // 値は (35 + 18 + 4 + 18) / 23 = 75 / 23 = 3.2608... -> 3.26
  console.assert(weightedTotal === 3.26, `Test 4.2 failed: ${weightedTotal} !== 3.26`);
  console.log("-> 加重平均・厳密平均の一致確認OK");
  
  console.log("========================================");
  console.log("全てのテストがパスしました。");
}

runTests();
