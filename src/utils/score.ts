/**
 * スコア計算ユーティリティ
 * 丸め規則（小数第2位で四捨五入）および NULL/NA を除外した厳密な23項目平均を提供する
 */

export const FACTOR_ITEM_COUNTS = {
  factor1: 7, // 1~7
  factor2: 6, // 8~13
  factor3: 4, // 14~17
  factor4: 6, // 18~23
};

/**
 * 丸め処理: 小数第2位で四捨五入 (例: 3.145 -> 3.15)
 */
export function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * アイテム配列から NULL や NA を除外し、全体の平均スコアおよび各因子スコアを計算する
 */
export function computeStrictScores(items: Array<{ item_number: number; score?: number | null; is_na?: boolean }>) {
  const scores = { f1: [] as number[], f2: [] as number[], f3: [] as number[], f4: [] as number[] };

  items.forEach((item) => {
    if (item.is_na || item.score == null) return;
    if (item.item_number <= 7) scores.f1.push(item.score);
    else if (item.item_number <= 13) scores.f2.push(item.score);
    else if (item.item_number <= 17) scores.f3.push(item.score);
    else scores.f4.push(item.score);
  });

  const avg = (arr: number[]) => arr.length ? roundScore(arr.reduce((s, v) => s + v, 0) / arr.length) : null;
  const allScores = [...scores.f1, ...scores.f2, ...scores.f3, ...scores.f4];

  return {
    total_score: avg(allScores),
    factor1_score: avg(scores.f1),
    factor2_score: avg(scores.f2),
    factor3_score: avg(scores.f3),
    factor4_score: avg(scores.f4),
    evaluated_item_count: allScores.length,
  };
}

/**
 * （プレビュー/自己評価入力用）因子ごとのスコアしか存在しない場合の23項目加重平均
 * ※ 23項目すべて評価済みとして計算
 */
export function computeFactorWeightedTotal(f1: number, f2: number, f3: number, f4: number): number {
  const total = (f1 * FACTOR_ITEM_COUNTS.factor1 + 
                 f2 * FACTOR_ITEM_COUNTS.factor2 + 
                 f3 * FACTOR_ITEM_COUNTS.factor3 + 
                 f4 * FACTOR_ITEM_COUNTS.factor4) / 23;
  return roundScore(total);
}
