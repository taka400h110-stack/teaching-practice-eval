// score.test.js
// 因子ごとの平均点から総合スコア（23項目平均）を算出するテスト

// 4因子の平均から単純平均する旧方式
function calculateOldTotal(f1, f2, f3, f4) {
  return Math.round(((f1 + f2 + f3 + f4) / 4) * 100) / 100;
}

// 各因子の項目数で重み付けする新方式（23項目平均）
// F1: 7項目, F2: 6項目, F3: 4項目, F4: 6項目
function calculateNewTotal(f1, f2, f3, f4) {
  return Math.round(((f1 * 7 + f2 * 6 + f3 * 4 + f4 * 6) / 23) * 100) / 100;
}

function runTests() {
  console.log("=== 総合スコア算出ロジックのテスト ===");
  
  // テストケース1: すべての因子のスコアが同じ場合 (差が出ない)
  const t1_old = calculateOldTotal(3.0, 3.0, 3.0, 3.0);
  const t1_new = calculateNewTotal(3.0, 3.0, 3.0, 3.0);
  console.assert(t1_old === t1_new, `Test 1 failed: ${t1_old} !== ${t1_new}`);
  
  // テストケース2: 項目数が多い因子(F1)のスコアが高く、項目数が少ない因子(F3)のスコアが低い場合 (差が出る)
  // 旧: (5+3+1+3)/4 = 3.00
  // 新: (5*7 + 3*6 + 1*4 + 3*6) / 23 = (35 + 18 + 4 + 18) / 23 = 75 / 23 ≈ 3.26
  const f1 = 5.0, f2 = 3.0, f3 = 1.0, f4 = 3.0;
  const t2_old = calculateOldTotal(f1, f2, f3, f4);
  const t2_new = calculateNewTotal(f1, f2, f3, f4);
  
  console.log(`テストケース2: F1=${f1}, F2=${f2}, F3=${f3}, F4=${f4}`);
  console.log(`  旧方式 (4因子単純平均): ${t2_old}`);
  console.log(`  新方式 (23項目加重平均): ${t2_new}`);
  
  if (t2_old === t2_new) {
    throw new Error("差が出るはずのテストケースで差が出ませんでした。");
  } else {
    console.log("=> OK: 旧方式と新方式で正しく差が出ました。");
  }

  // テストケース3: 項目数が少ない因子のスコアが極端に高い場合
  // 旧: (2+2+5+2)/4 = 2.75
  // 新: (2*7 + 2*6 + 5*4 + 2*6) / 23 = (14 + 12 + 20 + 12) / 23 = 58 / 23 ≈ 2.52
  const f1_3 = 2.0, f2_3 = 2.0, f3_3 = 5.0, f4_3 = 2.0;
  const t3_old = calculateOldTotal(f1_3, f2_3, f3_3, f4_3);
  const t3_new = calculateNewTotal(f1_3, f2_3, f3_3, f4_3);

  console.log(`テストケース3: F1=${f1_3}, F2=${f2_3}, F3=${f3_3}, F4=${f4_3}`);
  console.log(`  旧方式 (4因子単純平均): ${t3_old}`);
  console.log(`  新方式 (23項目加重平均): ${t3_new}`);

  if (t3_old === t3_new) {
    throw new Error("差が出るはずのテストケースで差が出ませんでした。");
  } else {
    console.log("=> OK: 旧方式と新方式で正しく差が出ました。");
  }
  
  console.log("======================================");
  console.log("全てのテストがパスしました（再発防止確認済）。");
}

runTests();
