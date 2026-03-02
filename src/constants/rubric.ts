/**
 * rubric.ts
 * 4因子23項目ルーブリック 確定版（2026-03-01）
 * 出典：論文投稿用.docx EFAパターン行列・プロマックス回転・最尤法
 * α全体=.95、CFA: CFI=.94, RMSEA=.06
 *
 * ⚠️ 因子構成（確定版）
 *   Ⅰ 児童生徒への指導力  項目1–7   (7項目, α=.87)
 *   Ⅱ 自己評価力          項目8–13  (6項目, α=.87)
 *   Ⅲ 学級経営力          項目14–17 (4項目, α=.91)
 *   Ⅳ 職務を理解して行動する力  項目18–23 (6項目, α=.91)
 */

// ─────────────────────────────────────────────
// 因子定義
// ─────────────────────────────────────────────
export const RUBRIC_FACTORS = [
  {
    key:   "factor1" as const,
    roman: "Ⅰ",
    label: "児童生徒への指導力",
    alpha: 0.87,
    color: "#1976d2",
    itemRange: [1, 7],
    definition: "多様な背景（障害・言語・性別・文化）を持つ児童生徒を理解し、実態に応じた授業設計と個別対応ができる力",
  },
  {
    key:   "factor2" as const,
    roman: "Ⅱ",
    label: "自己評価力",
    alpha: 0.87,
    color: "#388e3c",
    itemRange: [8, 13],
    definition: "実習体験を教師としての成長と結びつけ、省察・改善・自己評価を継続的に行うことができる力",
  },
  {
    key:   "factor3" as const,
    roman: "Ⅲ",
    label: "学級経営力",
    alpha: 0.91,
    color: "#f57c00",
    itemRange: [14, 17],
    definition: "学級全体の安全・秩序・協力関係を維持し、リーダーシップを発揮して児童の困難を支援できる力",
  },
  {
    key:   "factor4" as const,
    roman: "Ⅳ",
    label: "職務を理解して行動する力",
    alpha: 0.91,
    color: "#7b1fa2",
    itemRange: [18, 23],
    definition: "教師の役割・職務倫理・同僚関係・組織運営を理解し、専門職として適切に行動できる力",
  },
] as const;

export type FactorKey = typeof RUBRIC_FACTORS[number]["key"];

// ─────────────────────────────────────────────
// 全23項目定義
// ─────────────────────────────────────────────
export const RUBRIC_ITEMS = [
  // 因子Ⅰ 児童生徒への指導力（項目1–7）
  { num: 1,  factor: "factor1" as FactorKey, lambda: 0.95, label: "特別支援対応力（実践）",   text: "特別な支援を必要とする児童（身体障害を有する者を含む）に対して、見通しをもって適切な対応ができること" },
  { num: 2,  factor: "factor1" as FactorKey, lambda: 0.85, label: "外国語児童への指導実践",   text: "自国の言語が母語でない児童に対して、適切な対応や指導ができること" },
  { num: 3,  factor: "factor1" as FactorKey, lambda: 0.81, label: "特別支援対応力（理解）",   text: "特別な支援を必要とする児童（身体障害を有する者を含む）に対して、どのような対応をすればよいかを理解していること" },
  { num: 4,  factor: "factor1" as FactorKey, lambda: 0.64, label: "外国語児童への対応理解",   text: "自国の言語が母語でない児童に対して、どのような対応をすればよいかを理解していること" },
  { num: 5,  factor: "factor1" as FactorKey, lambda: 0.58, label: "性差・多様性への理解",     text: "児童の「性別」による心理・行動の違いの重要性を正しく理解していること" },
  { num: 6,  factor: "factor1" as FactorKey, lambda: 0.45, label: "文化的多様性への理解",     text: "児童の発達と健康は、様々な社会的、宗教的、民族的、文化的、言語的影響を受けることを理解していること" },
  { num: 7,  factor: "factor1" as FactorKey, lambda: 0.44, label: "教科特性を踏まえた授業設計", text: "各教科等の特性を踏まえ、児童の実態に即した授業づくりができること" },

  // 因子Ⅱ 自己評価力（項目8–13）
  { num: 8,  factor: "factor2" as FactorKey, lambda: 0.94, label: "体験と成長の接続",         text: "実習生の体験から得た知識が、教師の仕事や教師としての発達にいかに関係するかを理解できること" },
  { num: 9,  factor: "factor2" as FactorKey, lambda: 0.81, label: "指導姿勢の検証能力",       text: "授業と学習に関して語り、教育活動の発展に関する興味と関心を示し、自分自身の指導や姿勢を検証する能力を備えていること" },
  { num: 10, factor: "factor2" as FactorKey, lambda: 0.72, label: "模範的姿勢の実践",         text: "児童に対して期待している肯定的な価値観、態度、および行動を実践して見せること" },
  { num: 11, factor: "factor2" as FactorKey, lambda: 0.62, label: "フィードバック受容力",     text: "アドバイスとフィードバックに基づき行動し、指導と助言を受け入れること" },
  { num: 12, factor: "factor2" as FactorKey, lambda: 0.61, label: "実践省察と改善責任",       text: "自分自身の実践を反省し、改善し、専門的ニーズの発達を認識し、それを実現することに責任を持つこと" },
  { num: 13, factor: "factor2" as FactorKey, lambda: 0.52, label: "専門性向上のための自己評価", text: "教師としての専門性を向上させるために反省、自己省察することも含めて、自分自身を評価する力を有すること" },

  // 因子Ⅲ 学級経営力（項目14–17）
  { num: 14, factor: "factor3" as FactorKey, lambda: 0.91, label: "生徒指導力",               text: "クラス運営に伴う生徒指導に関する力を有すること" },
  { num: 15, factor: "factor3" as FactorKey, lambda: 0.87, label: "学級管理能力",             text: "クラス運営に伴う管理能力を有すること" },
  { num: 16, factor: "factor3" as FactorKey, lambda: 0.83, label: "リーダーシップ発揮",       text: "権威ある存在として教室内でクラス運営に伴うリーダーシップを発揮することができること" },
  { num: 17, factor: "factor3" as FactorKey, lambda: 0.77, label: "児童の困難支援",           text: "学校や授業における児童の困難や葛藤の解決を支援することができること" },

  // 因子Ⅳ 職務を理解して行動する力（項目18–23）
  { num: 18, factor: "factor4" as FactorKey, lambda: 1.03, label: "同僚の学習支援役割理解",   text: "共に働いている同僚が、学習のサポートに適切に参加し、彼らが果たすことを期待されている役割を理解していること" },
  { num: 19, factor: "factor4" as FactorKey, lambda: 0.98, label: "特別責任を有する同僚役割の理解", text: "特別な責任を有する同僚の役割を知ること" },
  { num: 20, factor: "factor4" as FactorKey, lambda: 0.50, label: "人間関係・専門的期待への対応", text: "教師の仕事に関連する人間関係及び専門的な面においての期待を分析し対応すること" },
  { num: 21, factor: "factor4" as FactorKey, lambda: 0.46, label: "教師役割の多様性理解",     text: "教師の役割を遂行するための多様な方法を知り、その根拠を理解すること" },
  { num: 22, factor: "factor4" as FactorKey, lambda: 0.42, label: "教師の権威の意味理解",     text: "授業とクラスの社会生活における教師の権威の意味について理解すること" },
  { num: 23, factor: "factor4" as FactorKey, lambda: 0.41, label: "職業倫理と連帯責任",       text: "職業の方針と実践に留意し、その実践においては連帯責任を有すること" },
] as const;

// ─────────────────────────────────────────────
// 省察深さレベル（Hatton & Smith, 1995）
// 因子Ⅱ（自己評価力）の採点基準と対応
// ─────────────────────────────────────────────
export const REFLECTION_DEPTH_LEVELS = [
  { score: 1, rd: "RD0", label: "省察なし",        desc: "当該側面への記述・省察が日誌に見られない",                                 color: "#bdbdbd" },
  { score: 2, rd: "RD1", label: "記述的書き込み",  desc: "出来事・事実の列挙にとどまり、省察的要素がない",                          color: "#90caf9" },
  { score: 3, rd: "RD2", label: "記述的省察",      desc: "感情・気づき・印象を言語化するが、原因分析・代替案は限定的",              color: "#81c784" },
  { score: 4, rd: "RD3", label: "対話的省察",      desc: "実践の原因・背景を多角的に分析し、代替案・改善策を具体的に検討する",      color: "#ffb74d" },
  { score: 5, rd: "RD4", label: "批判的省察",      desc: "教育的信念・社会的文脈・倫理的観点と実践を結びつけ、信念の根拠を問い直す", color: "#ce93d8" },
] as const;

// ─────────────────────────────────────────────
// 週次フロー（論文 3.4.1 準拠）
// ─────────────────────────────────────────────
export const WEEKLY_FLOW_STEPS = [
  {
    step: 1,
    label: "日誌作成・提出",
    detail: "実習の振り返りを記述して提出",
    icon: "📝",
    color: "#1976d2",
  },
  {
    step: 2,
    label: "AI自動評価（CoT-A）",
    detail: "GPT-4が23項目×5段階でルーブリック評価＋コメント生成",
    icon: "🤖",
    color: "#388e3c",
  },
  {
    step: 3,
    label: "統合チャットBot",
    detail: "Phase0（前週目標確認）→Phase1（省察深化）→Bridge→Phase2（SMART目標確定）",
    icon: "💬",
    color: "#f57c00",
    phases: [
      { id: "phase0", label: "Phase0", desc: "前週目標の達成確認（GA-Self）" },
      { id: "phase1", label: "Phase1", desc: "振り返り深化（最大2-3問、RD-Chat判定）" },
      { id: "bridge", label: "Bridge", desc: "気づき→目標への接続" },
      { id: "phase2", label: "Phase2", desc: "SMART目標の確定・保存" },
    ],
  },
  {
    step: 4,
    label: "次週の実践",
    detail: "目標に基づく実践行動",
    icon: "🎯",
    color: "#7b1fa2",
  },
  {
    step: 5,
    label: "次回日誌に結果を記述",
    detail: "評価・省察サイクルへ回帰",
    icon: "🔄",
    color: "#1976d2",
  },
] as const;

// ─────────────────────────────────────────────
// ユーティリティ関数
// ─────────────────────────────────────────────

/** 因子キーから因子オブジェクトを取得 */
export function getFactorByKey(key: FactorKey) {
  return RUBRIC_FACTORS.find((f) => f.key === key)!;
}

/** 項目番号から属する因子キーを取得 */
export function getFactorKeyByItemNum(num: number): FactorKey {
  for (const f of RUBRIC_FACTORS) {
    if (num >= f.itemRange[0] && num <= f.itemRange[1]) return f.key;
  }
  return "factor1";
}

/** 因子キーに属する項目一覧を取得 */
export function getItemsByFactor(key: FactorKey) {
  return RUBRIC_ITEMS.filter((item) => item.factor === key);
}

/** 統計情報 */
export const RUBRIC_STATS = {
  totalItems: 23,
  alphaOverall: 0.95,
  cfa: { cfi: 0.94, rmsea: 0.06, srmr: 0.06, gfi: 0.83 },
  factorCorrelations: {
    "Ⅰ-Ⅱ": 0.56, "Ⅰ-Ⅲ": 0.71, "Ⅰ-Ⅳ": 0.58,
    "Ⅱ-Ⅲ": 0.66, "Ⅱ-Ⅳ": 0.67,
    "Ⅲ-Ⅳ": 0.65,
  },
} as const;
