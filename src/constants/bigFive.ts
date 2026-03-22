export const NAMIKAWA_29_ITEMS = [
  // 外向性 (Extraversion) - 5項目
  { id: 1, factor: "extraversion", label: "話好き", reverse: false },
  { id: 2, factor: "extraversion", label: "陽気な", reverse: false },
  { id: 3, factor: "extraversion", label: "外向的", reverse: false },
  { id: 4, factor: "extraversion", label: "社交的", reverse: false },
  { id: 5, factor: "extraversion", label: "無口な", reverse: true },

  // 情緒不安定性 (Neuroticism) - 5項目
  { id: 6, factor: "neuroticism", label: "不安になりやすい", reverse: false },
  { id: 7, factor: "neuroticism", label: "心配性", reverse: false },
  { id: 8, factor: "neuroticism", label: "弱気になる", reverse: false },
  { id: 9, factor: "neuroticism", label: "緊張しやすい", reverse: false },
  { id: 10, factor: "neuroticism", label: "憂鬱な", reverse: false },

  // 開放性 (Openness) - 6項目
  { id: 11, factor: "openness", label: "独創的な", reverse: false },
  { id: 12, factor: "openness", label: "多才の", reverse: false },
  { id: 13, factor: "openness", label: "進歩的", reverse: false },
  { id: 14, factor: "openness", label: "頭の回転の速い", reverse: false },
  { id: 15, factor: "openness", label: "興味の広い", reverse: false },
  { id: 16, factor: "openness", label: "好奇心が強い", reverse: false },

  // 調和性 (Agreeableness) - 6項目
  { id: 17, factor: "agreeableness", label: "温和な", reverse: false },
  { id: 18, factor: "agreeableness", label: "寛大な", reverse: false },
  { id: 19, factor: "agreeableness", label: "親切な", reverse: false },
  { id: 20, factor: "agreeableness", label: "短気", reverse: true },
  { id: 21, factor: "agreeableness", label: "怒りっぽい", reverse: true },
  { id: 22, factor: "agreeableness", label: "自己中心的", reverse: true },

  // 誠実性 (Conscientiousness) - 7項目
  { id: 23, factor: "conscientiousness", label: "計画性のある", reverse: false },
  { id: 24, factor: "conscientiousness", label: "几帳面な", reverse: false },
  { id: 25, factor: "conscientiousness", label: "いい加減な", reverse: true },
  { id: 26, factor: "conscientiousness", label: "ルーズな", reverse: true },
  { id: 27, factor: "conscientiousness", label: "怠惰な", reverse: true },
  { id: 28, factor: "conscientiousness", label: "成り行きまかせ", reverse: true },
  { id: 29, factor: "conscientiousness", label: "軽率な", reverse: true },
];

export const BIG_FIVE_FACTORS = [
  { key: "extraversion",      label: "外向性",           color: "#1976d2" },
  { key: "neuroticism",       label: "情緒不安定性",     color: "#d32f2f" },
  { key: "openness",          label: "開放性",           color: "#7b1fa2" },
  { key: "agreeableness",     label: "調和性",           color: "#388e3c" },
  { key: "conscientiousness", label: "誠実性",           color: "#f57c00" },
];

export const LIKERT_5_MARKS = [
  { value: 1, label: "全くあてはまらない" },
  { value: 2, label: "あまりあてはまらない" },
  { value: 3, label: "どちらともいえない" },
  { value: 4, label: "ややあてはまる" },
  { value: 5, label: "非常にあてはまる" },
];
