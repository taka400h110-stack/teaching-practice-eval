/**
 * 事前事後アンケート 項目マスタ（Googleフォーム「最新版アンケート」準拠）
 *
 * 出典:
 *   - 批判的思考態度 (CTA): 平山るみ・楠見孝(2004) 批判的思考態度尺度（4下位因子18項目）
 *   - 省察的思考 (RTQ): Kember et al.(2000) RTQ（4下位因子16項目、HABは逆転）教育実習文脈へ翻案
 *   - 生成AI活用の批判的吟味 (AICT): 研究者作成（4下位因子12項目）
 *
 * compliance_level: original(原尺度準拠) / adapted(翻案) / custom(独自)
 * response_type: likert5 / single / short / free / display / confirm
 * phase: pre(実習前のみ) / post(実習後のみ) / both(両時点)
 *
 * この定数は survey_items テーブルのシード元であり、CSV取込時のマッピング/バリデーションにも用いる。
 */

export type SurveyResponseType =
  | "likert5"
  | "single"
  | "short"
  | "free"
  | "display"
  | "confirm";

export type SurveyPhase = "pre" | "post" | "both";
export type ComplianceLevel = "original" | "adapted" | "custom";

export interface SurveyItemDef {
  item_id: string;
  category: string;
  scale: string | null; // CTA / RTQ / AICT / META / FREE / CONSENT
  subfactor: string | null;
  question: string;
  response_type: SurveyResponseType;
  required: boolean;
  phase: SurveyPhase;
  source: string | null;
  compliance_level: ComplianceLevel | null;
  reverse: boolean;
  numeric: boolean;
  min_value: number | null;
  max_value: number | null;
  note: string | null;
}

const CTA_SRC = "平山・楠見(2004) 批判的思考態度尺度";
const RTQ_SRC_BASE = "Kember et al.(2000) RTQ";
const AICT_SRC = "研究者作成(AI批判的活用に関する項目群)";

// リッカート5件法の共通設定を付与するヘルパ
function likert(
  item_id: string,
  category: string,
  scale: string,
  subfactor: string,
  question: string,
  source: string,
  compliance: ComplianceLevel,
  reverse = false,
  note: string | null = null,
): SurveyItemDef {
  return {
    item_id,
    category,
    scale,
    subfactor,
    question,
    response_type: "likert5",
    required: true,
    phase: "both",
    source,
    compliance_level: compliance,
    reverse,
    numeric: true,
    min_value: 1,
    max_value: 5,
    note,
  };
}

export const SURVEY_ITEMS: SurveyItemDef[] = [
  // ── 0. 説明・同意 ──────────────────────────────────────────
  {
    item_id: "CONSENT_TEXT",
    category: "0. 説明・同意",
    scale: "CONSENT",
    subfactor: null,
    question:
      "本研究は「教育実習の学びを支援するシステムの開発と適用～生成AIを用いて～」に関する調査です。回答は任意であり、参加・不参加、途中辞退による不利益は一切ありません。",
    response_type: "display",
    required: false,
    phase: "both",
    source: "研究計画書 §倫理的配慮",
    compliance_level: null,
    reverse: false,
    numeric: false,
    min_value: null,
    max_value: null,
    note: "Googleフォームの冒頭に固定表示",
  },
  {
    item_id: "CONSENT_AGREE",
    category: "0. 説明・同意",
    scale: "CONSENT",
    subfactor: null,
    question: "上記の説明を読み、本研究への協力に同意します。",
    response_type: "single",
    required: true,
    phase: "both",
    source: null,
    compliance_level: null,
    reverse: false,
    numeric: false,
    min_value: null,
    max_value: null,
    note: "「同意しない」の場合は以降スキップして送信終了",
  },

  // ── 1. 実施時点 ────────────────────────────────────────────
  {
    item_id: "PHASE",
    category: "1. 実施時点",
    scale: "META",
    subfactor: null,
    question: "回答時点を選択してください。",
    response_type: "single",
    required: true,
    phase: "both",
    source: "研究計画書 §調査時期",
    compliance_level: null,
    reverse: false,
    numeric: false,
    min_value: null,
    max_value: null,
    note: "実習前／実習後の2時点",
  },

  // ── 2. 基本情報 ────────────────────────────────────────────
  {
    item_id: "RESEARCH_ID",
    category: "2. 基本情報",
    scale: "META",
    subfactor: null,
    question: "研究ID（事前に配布されたIDを入力してください）",
    response_type: "short",
    required: true,
    phase: "both",
    source: "研究計画書 §匿名化",
    compliance_level: null,
    reverse: false,
    numeric: false,
    min_value: null,
    max_value: null,
    note: "氏名・学籍番号は取得しない。研究IDのみで事前事後を対応付ける",
  },
  {
    item_id: "GRADE",
    category: "2. 基本情報",
    scale: "META",
    subfactor: null,
    question: "学年",
    response_type: "single",
    required: true,
    phase: "pre",
    source: "研究計画書 §調査協力者",
    compliance_level: null,
    reverse: false,
    numeric: false,
    min_value: null,
    max_value: null,
    note: "大学2年生／大学3年生のみ",
  },
  {
    item_id: "SCHOOL_TYPE",
    category: "2. 基本情報",
    scale: "META",
    subfactor: null,
    question: "教育実習校種",
    response_type: "single",
    required: true,
    phase: "pre",
    source: null,
    compliance_level: null,
    reverse: false,
    numeric: false,
    min_value: null,
    max_value: null,
    note: null,
  },
  {
    item_id: "AI_EXPERIENCE",
    category: "2. 基本情報",
    scale: "META",
    subfactor: null,
    question: "これまでの生成AIの利用経験",
    response_type: "single",
    required: true,
    phase: "pre",
    source: null,
    compliance_level: null,
    reverse: false,
    numeric: false,
    min_value: null,
    max_value: null,
    note: null,
  },

  // ── 3. 批判的思考態度 (CTA) 平山・楠見(2004) 18項目 ──────────
  likert("CTA_LOG_01", "3. 批判的思考態度", "CTA", "論理的思考への自覚", "複雑な問題について順序立てて考えることが得意だ", CTA_SRC, "original"),
  likert("CTA_LOG_02", "3. 批判的思考態度", "CTA", "論理的思考への自覚", "考えをまとめることが得意だ", CTA_SRC, "original"),
  likert("CTA_LOG_03", "3. 批判的思考態度", "CTA", "論理的思考への自覚", "物事を分析的にとらえる方だ", CTA_SRC, "original"),
  likert("CTA_LOG_04", "3. 批判的思考態度", "CTA", "論理的思考への自覚", "厳密に、細かいところまで考えることが多い", CTA_SRC, "original"),
  likert("CTA_LOG_05", "3. 批判的思考態度", "CTA", "論理的思考への自覚", "道筋を立てて物事を考える", CTA_SRC, "original"),
  likert("CTA_INQ_01", "3. 批判的思考態度", "CTA", "探究心", "いろいろな考え方の人と接して自分の考え方を広げたい", CTA_SRC, "original"),
  likert("CTA_INQ_02", "3. 批判的思考態度", "CTA", "探究心", "生涯にわたり新しいことを学びつづけたいと思う", CTA_SRC, "original"),
  likert("CTA_INQ_03", "3. 批判的思考態度", "CTA", "探究心", "いろいろなことに知的好奇心を持つ方だ", CTA_SRC, "original"),
  likert("CTA_INQ_04", "3. 批判的思考態度", "CTA", "探究心", "外国の異なる文化について、より多くのことを学びたい", CTA_SRC, "original"),
  likert("CTA_INQ_05", "3. 批判的思考態度", "CTA", "探究心", "わからないことがあると質問したり調べたくなる", CTA_SRC, "original"),
  likert("CTA_OBJ_01", "3. 批判的思考態度", "CTA", "客観性", "いつも偏りのない判断をしようとする", CTA_SRC, "original"),
  likert("CTA_OBJ_02", "3. 批判的思考態度", "CTA", "客観性", "物事を決めるときは客観的な態度を心がける", CTA_SRC, "original"),
  likert("CTA_OBJ_03", "3. 批判的思考態度", "CTA", "客観性", "自分の意見と異なる意見も、ちゃんと理解しようとする", CTA_SRC, "original"),
  likert("CTA_OBJ_04", "3. 批判的思考態度", "CTA", "客観性", "自分と異なる考えの人にも、その根拠を聞くようにする", CTA_SRC, "original"),
  likert("CTA_EVI_01", "3. 批判的思考態度", "CTA", "証拠の重視", "判断をくだす際は、確かな証拠の有無にこだわる", CTA_SRC, "original"),
  likert("CTA_EVI_02", "3. 批判的思考態度", "CTA", "証拠の重視", "なんでも、少し疑ってみる方がいいと思う", CTA_SRC, "original"),
  likert("CTA_EVI_03", "3. 批判的思考態度", "CTA", "証拠の重視", "結論をくだす前に、様々な情報を集めるようにする", CTA_SRC, "original"),
  likert("CTA_EVI_04", "3. 批判的思考態度", "CTA", "証拠の重視", "主張の根拠となる事実や理由を確認しないと納得できない", CTA_SRC, "original"),

  // ── 4. 省察的思考 (RTQ) Kember et al.(2000) 16項目、HABは逆転 ─
  likert("RTQ_HAB_01", "4. 省察的思考", "RTQ", "習慣的行為", "教育実習では、あまり考えずにこれまで慣れた方法で行動することが多い", `${RTQ_SRC_BASE} (Habitual Action)`, "adapted", true, "教育実習文脈へ翻案／逆転項目"),
  likert("RTQ_HAB_02", "4. 省察的思考", "RTQ", "習慣的行為", "教育実習の場面では、自分でよく考えなくても手順に沿って行動できる", `${RTQ_SRC_BASE} (Habitual Action)`, "adapted", true, "逆転項目"),
  likert("RTQ_HAB_03", "4. 省察的思考", "RTQ", "習慣的行為", "実習中の行動の多くは、深く考えるまでもなく自動的に行っている", `${RTQ_SRC_BASE} (Habitual Action)`, "adapted", true, "逆転項目"),
  likert("RTQ_HAB_04", "4. 省察的思考", "RTQ", "習慣的行為", "実習で新しい状況に出会っても、これまでのやり方で対応することが多い", `${RTQ_SRC_BASE} (Habitual Action)`, "adapted", true, "逆転項目"),
  likert("RTQ_UND_01", "4. 省察的思考", "RTQ", "理解", "教育実習で扱う内容について、自分なりに意味を理解しようとしている", `${RTQ_SRC_BASE} (Understanding)`, "adapted"),
  likert("RTQ_UND_02", "4. 省察的思考", "RTQ", "理解", "実習で経験したことの背景や意味を、自分の言葉で説明できるようにしている", `${RTQ_SRC_BASE} (Understanding)`, "adapted"),
  likert("RTQ_UND_03", "4. 省察的思考", "RTQ", "理解", "実習で学んだ考え方を、他の場面にも当てはめて理解しようとする", `${RTQ_SRC_BASE} (Understanding)`, "adapted"),
  likert("RTQ_UND_04", "4. 省察的思考", "RTQ", "理解", "実習中は、単なる暗記ではなく意味の理解を重視している", `${RTQ_SRC_BASE} (Understanding)`, "adapted"),
  likert("RTQ_REF_01", "4. 省察的思考", "RTQ", "省察", "実習後に自分の行動を振り返り、良かった点や改善すべき点を考える", `${RTQ_SRC_BASE} (Reflection)`, "adapted"),
  likert("RTQ_REF_02", "4. 省察的思考", "RTQ", "省察", "実習の経験を通して、これまでの自分の考え方を見直すことがある", `${RTQ_SRC_BASE} (Reflection)`, "adapted"),
  likert("RTQ_REF_03", "4. 省察的思考", "RTQ", "省察", "実習でうまくいかなかった場面について、その原因を自分なりに考える", `${RTQ_SRC_BASE} (Reflection)`, "adapted"),
  likert("RTQ_REF_04", "4. 省察的思考", "RTQ", "省察", "実習を振り返る中で、自分の教師としての課題に気づくことがある", `${RTQ_SRC_BASE} (Reflection)`, "adapted"),
  likert("RTQ_CRI_01", "4. 省察的思考", "RTQ", "批判的省察", "実習を通して、自分がこれまで正しいと思っていた指導観を問い直すことがある", `${RTQ_SRC_BASE} (Critical Reflection)`, "adapted"),
  likert("RTQ_CRI_02", "4. 省察的思考", "RTQ", "批判的省察", "実習の経験を通して、教職に対する自分の見方が変わることがある", `${RTQ_SRC_BASE} (Critical Reflection)`, "adapted"),
  likert("RTQ_CRI_03", "4. 省察的思考", "RTQ", "批判的省察", "実習を通して、自分の子ども観・学習観を根本から見直すことがある", `${RTQ_SRC_BASE} (Critical Reflection)`, "adapted"),
  likert("RTQ_CRI_04", "4. 省察的思考", "RTQ", "批判的省察", "実習の経験によって、自分の教育に対する信念が変化したと感じる", `${RTQ_SRC_BASE} (Critical Reflection)`, "adapted"),

  // ── 5. AI活用の批判的吟味 (AICT) 研究者作成 12項目 ───────────
  likert("AICT_TRU_01", "5. AI活用の批判的吟味", "AICT", "信頼性の吟味", "生成AIの回答をそのまま信じず、内容が正しいか自分で確かめようとする", AICT_SRC, "custom"),
  likert("AICT_TRU_02", "5. AI活用の批判的吟味", "AICT", "信頼性の吟味", "生成AIの回答の根拠や理由を確認するようにしている", AICT_SRC, "custom"),
  likert("AICT_TRU_03", "5. AI活用の批判的吟味", "AICT", "信頼性の吟味", "生成AIが間違った情報を出す可能性があることを意識して使う", AICT_SRC, "custom"),
  likert("AICT_MUL_01", "5. AI活用の批判的吟味", "AICT", "多角的検討", "生成AIの回答を、複数の視点から検討しようとする", AICT_SRC, "custom"),
  likert("AICT_MUL_02", "5. AI活用の批判的吟味", "AICT", "多角的検討", "生成AIの回答を、教育書や指導教員の助言など他の情報源と照らし合わせる", AICT_SRC, "custom"),
  likert("AICT_MUL_03", "5. AI活用の批判的吟味", "AICT", "多角的検討", "生成AIとは異なる立場からも実習の場面を考えようとする", AICT_SRC, "custom"),
  likert("AICT_JUD_01", "5. AI活用の批判的吟味", "AICT", "自らの判断保持", "生成AIの回答に流されず、自分なりの判断を保つようにしている", AICT_SRC, "custom"),
  likert("AICT_JUD_02", "5. AI活用の批判的吟味", "AICT", "自らの判断保持", "生成AIの助言を採用するか否かは、自分で考えて決める", AICT_SRC, "custom"),
  likert("AICT_JUD_03", "5. AI活用の批判的吟味", "AICT", "自らの判断保持", "生成AIの回答よりも、目の前の子どもや実習校の状況に合うかを重視する", AICT_SRC, "custom"),
  likert("AICT_UPD_01", "5. AI活用の批判的吟味", "AICT", "対話からの学びと更新", "生成AIとの対話から得た気づきを、自分の考えに取り入れて更新している", AICT_SRC, "custom"),
  likert("AICT_UPD_02", "5. AI活用の批判的吟味", "AICT", "対話からの学びと更新", "生成AIとの対話を通して、自分の実習での目標や課題を具体化できる", AICT_SRC, "custom"),
  likert("AICT_UPD_03", "5. AI活用の批判的吟味", "AICT", "対話からの学びと更新", "生成AIとのやりとりを踏まえて、次回の実習に向けた行動を具体的に考えられる", AICT_SRC, "custom"),

  // ── 6. 自由記述 ────────────────────────────────────────────
  {
    item_id: "FREE_01_PRE",
    category: "6. 自由記述",
    scale: "FREE",
    subfactor: null,
    question: "教育実習に向けて、生成AIの活用に期待していることや不安に感じていることがあれば、自由に記入してください。",
    response_type: "free",
    required: false,
    phase: "pre",
    source: null,
    compliance_level: null,
    reverse: false,
    numeric: false,
    min_value: null,
    max_value: null,
    note: "個人特定情報を書かない旨の注意書き",
  },
  {
    item_id: "FREE_02_POST",
    category: "6. 自由記述",
    scale: "FREE",
    subfactor: null,
    question: "教育実習で生成AIを活用して振り返り・対話を行い、次回の目標を立てる中で、印象に残った経験や気づきがあれば自由に記入してください。",
    response_type: "free",
    required: false,
    phase: "post",
    source: null,
    compliance_level: null,
    reverse: false,
    numeric: false,
    min_value: null,
    max_value: null,
    note: "個人特定情報を書かない旨の注意書き",
  },
  {
    item_id: "FREE_03_POST",
    category: "6. 自由記述",
    scale: "FREE",
    subfactor: null,
    question: "生成AI支援システムを利用して感じた良かった点・改善してほしい点があれば、自由に記入してください。",
    response_type: "free",
    required: false,
    phase: "post",
    source: null,
    compliance_level: null,
    reverse: false,
    numeric: false,
    min_value: null,
    max_value: null,
    note: "システム改善に活用",
  },

  // ── 7. 送信確認 ────────────────────────────────────────────
  {
    item_id: "SUBMIT_CONFIRM",
    category: "7. 送信確認",
    scale: "META",
    subfactor: null,
    question: "回答内容を確認のうえ、送信してよろしいですか。",
    response_type: "confirm",
    required: true,
    phase: "both",
    source: null,
    compliance_level: null,
    reverse: false,
    numeric: false,
    min_value: null,
    max_value: null,
    note: null,
  },
];

/** リッカート等の分析対象（数値化対象）項目のみ */
export const SURVEY_NUMERIC_ITEMS = SURVEY_ITEMS.filter((i) => i.numeric);

/** 尺度別の項目マップ（下位因子集計用） */
export const SURVEY_SCALES = ["CTA", "RTQ", "AICT"] as const;
export type SurveyScaleKey = (typeof SURVEY_SCALES)[number];

export const SURVEY_SCALE_LABELS: Record<SurveyScaleKey, string> = {
  CTA: "批判的思考態度",
  RTQ: "省察的思考",
  AICT: "生成AI活用の批判的吟味",
};

/** item_id -> 定義 の索引 */
export const SURVEY_ITEM_INDEX: Record<string, SurveyItemDef> = SURVEY_ITEMS.reduce(
  (acc, item) => {
    acc[item.item_id] = item;
    return acc;
  },
  {} as Record<string, SurveyItemDef>,
);
