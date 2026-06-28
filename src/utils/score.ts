/**
 * スコア計算ユーティリティ
 * 6因子40項目ルーブリック（src/constants/rubric.ts）を単一の真実の源とする。
 * 丸め規則（小数第2位で四捨五入）および NULL/NA を除外した厳密な40項目平均を提供する。
 */
import {
  RUBRIC_FACTORS,
  RUBRIC_ITEMS,
  getFactorKeyByItemNum,
  type FactorKey,
} from "../constants/rubric";

/** 各因子の項目数（ルーブリックから導出） */
export const FACTOR_ITEM_COUNTS: Record<FactorKey, number> = RUBRIC_FACTORS.reduce(
  (acc, f) => {
    acc[f.key] = f.itemRange[1] - f.itemRange[0] + 1;
    return acc;
  },
  {} as Record<FactorKey, number>,
);

/** 全項目数（=40） */
export const TOTAL_ITEM_COUNT = RUBRIC_ITEMS.length;

/**
 * 丸め処理: 小数第2位で四捨五入 (例: 3.145 -> 3.15)
 */
export function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * アイテム配列から NULL や NA を除外し、全体の平均スコアおよび各因子スコアを計算する
 * 因子の割り当ては項目番号から getFactorKeyByItemNum で決定する（6因子40項目対応）
 */
export function computeStrictScores(
  items: Array<{ item_number: number; score?: number | null; is_na?: boolean }>,
) {
  const buckets: Record<FactorKey, number[]> = {
    factor1: [], factor2: [], factor3: [], factor4: [], factor5: [], factor6: [],
  };

  items.forEach((item) => {
    if (item.is_na || item.score == null) return;
    const fk = getFactorKeyByItemNum(item.item_number);
    buckets[fk].push(item.score);
  });

  const avg = (arr: number[]) =>
    arr.length ? roundScore(arr.reduce((s, v) => s + v, 0) / arr.length) : null;
  const allScores = ([] as number[]).concat(
    buckets.factor1, buckets.factor2, buckets.factor3,
    buckets.factor4, buckets.factor5, buckets.factor6,
  );

  return {
    total_score: avg(allScores),
    factor1_score: avg(buckets.factor1),
    factor2_score: avg(buckets.factor2),
    factor3_score: avg(buckets.factor3),
    factor4_score: avg(buckets.factor4),
    factor5_score: avg(buckets.factor5),
    factor6_score: avg(buckets.factor6),
    evaluated_item_count: allScores.length,
  };
}

/**
 * （プレビュー/自己評価入力用）因子ごとのスコアしか存在しない場合の40項目加重平均
 * ※ 40項目すべて評価済みとして計算（各因子スコア×項目数 / 40）
 */
export function computeFactorWeightedTotal(
  f1: number,
  f2: number,
  f3: number,
  f4: number,
  f5 = 0,
  f6 = 0,
): number {
  const total =
    (f1 * FACTOR_ITEM_COUNTS.factor1 +
      f2 * FACTOR_ITEM_COUNTS.factor2 +
      f3 * FACTOR_ITEM_COUNTS.factor3 +
      f4 * FACTOR_ITEM_COUNTS.factor4 +
      f5 * FACTOR_ITEM_COUNTS.factor5 +
      f6 * FACTOR_ITEM_COUNTS.factor6) /
    TOTAL_ITEM_COUNT;
  return roundScore(total);
}
