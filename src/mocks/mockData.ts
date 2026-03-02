import type {
  User, JournalEntry, EvaluationResult, GrowthData, WeeklyScore,
  ChatSession, SelfEvaluation, LpsWeek, GoalEntry, StudentProfile,
} from "../types";

// ──────────────────────────────────────────────
// ユーザー
// ──────────────────────────────────────────────
export const MOCK_USER: User = {
  id:    "user-001",
  email: "admin@teaching-eval.jp",
  name:  "山田 太郎",
  role:  "admin",
};

// ──────────────────────────────────────────────
// 日誌一覧（8週分）
// ──────────────────────────────────────────────
function makeJournal(
  id: string,
  week: number,
  status: JournalEntry["status"],
  subject?: string,
): JournalEntry {
  const date = new Date(2026, 3, 7 + (week - 1) * 7).toISOString().split("T")[0];
  const hourRecords = [
    {
      id: `${id}-r1`, order: 0, time_label: "朝の会",
      time_start: "08:15", time_end: "08:30",
      subject: "", lesson_goal: "", difficulty: "", devise: "",
      body: "出席確認・健康観察・今日の連絡事項を伝えた。ウォン君（外国籍）の体調確認も行った。",
    },
    {
      id: `${id}-r2`, order: 1, time_label: "1時限",
      time_start: "08:30", time_end: "09:15",
      subject: subject ?? "算数", lesson_goal: "分数の足し算の理解", difficulty: "", devise: "",
      body: `${subject ?? "算数"}の授業。前時の復習後、新しい単元を導入した。ウォン君が理解に苦しんでいた場面では絵カードを活用して視覚的に説明した。`,
    },
    {
      id: `${id}-r3`, order: 2, time_label: "2時限",
      time_start: "09:20", time_end: "10:05",
      subject: "国語", lesson_goal: "物語の登場人物の気持ちを読み取る", difficulty: "", devise: "",
      body: "音読練習と文章読解を行った。グループ活動で意見交流させ、多様な読み方を共有した。",
    },
    {
      id: `${id}-r4`, order: 3, time_label: "給食・昼休み",
      time_start: "12:00", time_end: "13:20",
      subject: "", lesson_goal: "", difficulty: "", devise: "",
      body: "給食時に児童と会話しながら様子を観察した。A君が友達とトラブルになっていたが、双方の話を聞いて仲裁した。",
    },
  ];
  return {
    id,
    student_id: "user-001",
    title:      `${date} の日誌（第${week}週）`,
    content:    JSON.stringify({ version: 2, records: hourRecords, reflection: "今日の実習を通じて多くのことを学んだ。特に個別支援の重要性を改めて感じた。" }),
    reflection_text: "今日の実習を通じて多くのことを学んだ。特に個別支援の重要性を改めて感じた。",
    entry_date:  date,
    status,
    week_number: week,
    teacher_comment: status === "evaluated" ? "よく工夫されていました。特に絵カードを使った支援は効果的でした。次週も継続してください。" : undefined,
  };
}

export const MOCK_JOURNALS: JournalEntry[] = [
  makeJournal("journal-001", 1, "evaluated", "算数"),
  makeJournal("journal-002", 2, "evaluated", "国語"),
  makeJournal("journal-003", 3, "evaluated", "理科"),
  makeJournal("journal-004", 4, "evaluated", "社会"),
  makeJournal("journal-005", 5, "submitted", "音楽"),
  makeJournal("journal-006", 6, "submitted", "体育"),
  makeJournal("journal-007", 7, "draft",     "図工"),
  makeJournal("journal-008", 8, "draft",     "道徳"),
];

// ──────────────────────────────────────────────
// 23項目の評価データ（詳細版）
// ──────────────────────────────────────────────
const ITEM_DETAIL: Array<{
  factor: string;
  score: number;
  evidence: string;
  feedback: string;
  next_level_advice: string;
}> = [
  // 因子I（1-7）: 指導実践力
  {
    factor: "factor1", score: 3.0,
    evidence: "「ウォン君が理解に苦しんでいた場面では絵カードを活用して視覚的に説明した」",
    feedback: "外国籍児童への視覚的支援が実践できています。日誌に記録されていることが評価できます。",
    next_level_advice: "IEP（個別指導計画）に基づいた事前計画と記録をさらに充実させましょう。",
  },
  {
    factor: "factor1", score: 3.5,
    evidence: "「絵カードを活用して視覚的に説明した。すると理解できたようで笑顔になった。」",
    feedback: "複数の支援手段（絵カード・繰り返し説明）が活用できています。",
    next_level_advice: "調整した内容を文書化し、次の授業計画に活かす習慣をつけましょう。",
  },
  {
    factor: "factor1", score: 2.8,
    evidence: "特別支援の記述が日誌に一部あるが、具体的な理解の深さは確認できない。",
    feedback: "特別支援の必要な児童への配慮意識が芽生えています。",
    next_level_advice: "特別支援教育の基礎理論（UDL等）を学び、授業設計に反映させましょう。",
  },
  {
    factor: "factor1", score: 3.2,
    evidence: "「ウォン君の体調確認も行った」という記述があります。",
    feedback: "外国籍児童への日常的な配慮が実践できています。",
    next_level_advice: "母語での補助資料作成や保護者との連携を検討しましょう。",
  },
  {
    factor: "factor1", score: 2.5,
    evidence: "性差に関する具体的な記述は少ない。",
    feedback: "授業全体を通じた均等な関わりができています。",
    next_level_advice: "ジェンダーに関する無意識のバイアスについて意識的に振り返りましょう。",
  },
  {
    factor: "factor1", score: 3.1,
    evidence: "「グループ活動で意見交流させ、多様な読み方を共有した」",
    feedback: "文化的多様性を活かした活動設計ができています。",
    next_level_advice: "各児童の文化的背景を授業内容に関連付けた教材開発をしましょう。",
  },
  {
    factor: "factor1", score: 3.3,
    evidence: "「前時の復習後、新しい単元を導入した」「学習目標: 分数の足し算の理解」",
    feedback: "教科の特性を踏まえた授業構造が形成されています。",
    next_level_advice: "教材研究をさらに深め、教科固有の認識方法に基づいた発問設計をしましょう。",
  },
  // 因子II（8-13）: 自己評価力
  {
    factor: "factor2", score: 4.0,
    evidence: "「今日の実習を通じて多くのことを学んだ。特に個別支援の重要性を改めて感じた。」",
    feedback: "実習経験を教員としての成長に結び付ける省察ができています。",
    next_level_advice: "省察をさらに深め、教員発達理論（Dreyfusモデル等）と関連付けましょう。",
  },
  {
    factor: "factor2", score: 3.8,
    evidence: "日誌の記述から授業を評価する視点が確認できます。",
    feedback: "授業後に自分の実践を客観的に評価する姿勢があります。",
    next_level_advice: "評価の視点を多角化し、児童の反応データに基づく評価を取り入れましょう。",
  },
  {
    factor: "factor2", score: 3.6,
    evidence: "積極的な関わりと前向きな態度が日誌全体を通じて一貫しています。",
    feedback: "前向きな姿勢で実習に取り組んでいます。",
    next_level_advice: "困難な場面での対応にも同じ積極性を発揮できるよう意識しましょう。",
  },
  {
    factor: "factor2", score: 3.7,
    evidence: "「発問の後に5秒待つ」というフィードバックへの応答が実践されています。",
    feedback: "指導教員のアドバイスを受け止め、実践に反映させる姿勢があります。",
    next_level_advice: "フィードバックを記録し、具体的な改善の証拠として日誌に残しましょう。",
  },
  {
    factor: "factor2", score: 3.5,
    evidence: "省察の質が週を追うごとに深まっています。",
    feedback: "実習を通じた専門的成長への責任感が育っています。",
    next_level_advice: "ポートフォリオとして省察記録を蓄積し、成長を可視化しましょう。",
  },
  {
    factor: "factor2", score: 3.4,
    evidence: "自己の強みと課題を認識した記述があります。",
    feedback: "自己評価力が高まっています。",
    next_level_advice: "SMART目標設定と自己評価を連動させ、継続的な改善サイクルを構築しましょう。",
  },
  // 因子III（14-17）: 学級経営力
  {
    factor: "factor3", score: 3.2,
    evidence: "「A君が友達とトラブルになっていたが、双方の話を聞いて仲裁した」",
    feedback: "生徒指導の基本的な対応ができています。",
    next_level_advice: "予防的アプローチ（関係構築活動等）も取り入れた学級経営を計画しましょう。",
  },
  {
    factor: "factor3", score: 3.0,
    evidence: "安全な学習環境の維持に努めています。",
    feedback: "安全・安心な環境づくりへの意識があります。",
    next_level_advice: "物理的・心理的安全性の両面から学習環境を設計しましょう。",
  },
  {
    factor: "factor3", score: 2.9,
    evidence: "「声を大きくしても効果がなく」という記述があります。",
    feedback: "試行錯誤しながら学級秩序の確立に取り組んでいます。",
    next_level_advice: "視覚的指示・非言語コミュニケーションなど多様な手段を組み合わせましょう。",
  },
  {
    factor: "factor3", score: 3.1,
    evidence: "「グループ活動で意見交流させ、多様な読み方を共有した」",
    feedback: "学習の個別化と集団活動のバランスを意識しています。",
    next_level_advice: "個別の学習スタイルを把握し、選択的な活動を提供しましょう。",
  },
  // 因子IV（18-23）: 役割理解
  {
    factor: "factor4", score: 3.5,
    evidence: "指導教員との連携が日誌に記録されています。",
    feedback: "同僚との協働を意識した行動ができています。",
    next_level_advice: "他の実習生や教員との協働的な学習コミュニティを積極的に構築しましょう。",
  },
  {
    factor: "factor4", score: 3.6,
    evidence: "実習上の責任を自覚した記述が見られます。",
    feedback: "教師としての職責を自覚して行動しています。",
    next_level_advice: "教師の倫理綱領・法的責任についても学びを深めましょう。",
  },
  {
    factor: "factor4", score: 3.3,
    evidence: "「ウォン君が理解に苦しんでいた場面では」という早期発見の記述があります。",
    feedback: "学習困難のサインを早期に察知する感度があります。",
    next_level_advice: "RTI（多層支援システム）の枠組みを学び、組織的な支援に繋げましょう。",
  },
  {
    factor: "factor4", score: 3.4,
    evidence: "「A君が友達とトラブルに」という行動特性への対応記述があります。",
    feedback: "児童の行動特性を理解しようとする姿勢があります。",
    next_level_advice: "行動分析（ABC分析）を学び、より体系的なアプローチを取り入れましょう。",
  },
  {
    factor: "factor4", score: 3.2,
    evidence: "発達段階に応じた指導の意識が見られます。",
    feedback: "児童の発達段階を意識した関わりができています。",
    next_level_advice: "ピアジェ・ヴィゴツキーの発達理論を実践に結び付けましょう。",
  },
  {
    factor: "factor4", score: 3.5,
    evidence: "「グループ活動」「個別支援」と多様な学習形態が活用されています。",
    feedback: "発達に応じた多様な学習方法を実践しています。",
    next_level_advice: "UDL（学びのユニバーサルデザイン）の原則に基づいた授業設計に挑戦しましょう。",
  },
];

// ──────────────────────────────────────────────
// 評価結果
// ──────────────────────────────────────────────
export const MOCK_EVALUATION_RESULT: EvaluationResult = {
  id:          "eval-004",
  journal_id:  "journal-004",
  status:      "completed",
  overall_comment: "全体として安定した実習が続いています。特に外国籍児童（ウォン君）への視覚的支援（絵カード活用）は、インクルーシブ教育の観点から非常に評価できます。自己評価力（因子II）が高く、省察の質も週を追って深まっています。今後は授業目標の明確化と板書計画をさらに意識することで、授業設計力（因子I）の向上が期待できます。学級経営（因子III）についても、トラブル仲裁だけでなく予防的なアプローチを取り入れると良いでしょう。",
  total_score: 3.38,
  factor_scores: { factor1: 3.06, factor2: 3.67, factor3: 3.05, factor4: 3.42 },
  evaluated_item_count: 23,
  tokens_used: 2341,
  halo_check: false,
  evaluation_items: ITEM_DETAIL.map((item, i) => ({
    item_number: i + 1,
    factor:      item.factor,
    is_evaluated: true,
    score:       item.score,
    evidence:    item.evidence,
    feedback:    item.feedback,
    next_level_advice: item.next_level_advice,
  })),
};

// ──────────────────────────────────────────────
// 成長データ
// ──────────────────────────────────────────────
function makeWeeklyScores(
  f1s: number, f2s: number, f3s: number, f4s: number,
  f1e: number, f2e: number, f3e: number, f4e: number,
  weeks = 10,
): WeeklyScore[] {
  return Array.from({ length: weeks }, (_, i) => {
    const t = i / (weeks - 1);
    const f1 = +(f1s + (f1e - f1s) * t).toFixed(2);
    const f2 = +(f2s + (f2e - f2s) * t).toFixed(2);
    const f3 = +(f3s + (f3e - f3s) * t).toFixed(2);
    const f4 = +(f4s + (f4e - f4s) * t).toFixed(2);
    return { week: i + 1, factor1: f1, factor2: f2, factor3: f3, factor4: f4, total: +((f1+f2+f3+f4)/4).toFixed(2) };
  });
}

export const MOCK_GROWTH_DATA: GrowthData = {
  student_id:    "user-001",
  weekly_scores: makeWeeklyScores(2.2, 2.5, 2.1, 2.4, 3.5, 3.8, 3.3, 3.6),
};

// ──────────────────────────────────────────────
// 自己評価
// ──────────────────────────────────────────────
export const MOCK_SELF_EVALUATIONS: SelfEvaluation[] = Array.from({ length: 8 }, (_, i) => ({
  id:      `se-${i + 1}`,
  week:    i + 1,
  factor1: +(2.0 + i * 0.2).toFixed(1),
  factor2: +(2.2 + i * 0.2).toFixed(1),
  factor3: +(1.9 + i * 0.2).toFixed(1),
  factor4: +(2.1 + i * 0.2).toFixed(1),
  total:   +(2.05 + i * 0.2).toFixed(2),
  comment: [
    "今週は授業準備に時間をかけました。",
    "グループ活動の進め方に課題があります。",
    "特別支援の対応に自信がつきました。",
    "発問の工夫を意識しました。",
    "学級経営に少し慣れてきました。",
    "省察の習慣が身についてきました。",
    "指導技術が向上していると感じます。",
    "最終週、総合的に成長を実感できました。",
  ][i],
}));

// ──────────────────────────────────────────────
// LPSデータ
// ──────────────────────────────────────────────
export const MOCK_LPS_DATA: LpsWeek[] = Array.from({ length: 8 }, (_, i) => ({
  week:        i + 1,
  lps:         +(0.45 + i * 0.04).toFixed(2),
  self_eval:   +(2.1 + i * 0.2).toFixed(1),
  ai_eval:     +(2.2 + i * 0.18).toFixed(1),
  growth_rate: +(0.05 + i * 0.01).toFixed(2),
}));

// ──────────────────────────────────────────────
// ゴール履歴
// ──────────────────────────────────────────────
export const MOCK_GOAL_HISTORY: GoalEntry[] = [
  { id: "g-1", week: 1, goal_text: "授業の始めに学習目標を板書で明示する（毎回）",                    is_smart: true,  achieved: true,  created_at: "2026-04-14T10:00:00Z" },
  { id: "g-2", week: 2, goal_text: "特別支援が必要な児童の座席配置を事前に確認し日誌に記録する",       is_smart: true,  achieved: true,  created_at: "2026-04-21T10:00:00Z" },
  { id: "g-3", week: 3, goal_text: "ペアワークを週1回以上取り入れる",                                  is_smart: false, achieved: false, created_at: "2026-04-28T10:00:00Z" },
  { id: "g-4", week: 4, goal_text: "発問の後に5秒待つ習慣をつける（全ての発問で実践）",                 is_smart: true,  achieved: true,  created_at: "2026-05-05T10:00:00Z" },
  { id: "g-5", week: 5, goal_text: "省察の記述量を500文字以上にする",                                  is_smart: true,  achieved: true,  created_at: "2026-05-12T10:00:00Z" },
  { id: "g-6", week: 6, goal_text: "ICTツールを授業に1回以上活用する",                                 is_smart: false, achieved: false, created_at: "2026-05-19T10:00:00Z" },
];

// ──────────────────────────────────────────────
// チャットセッション
// ──────────────────────────────────────────────
export const MOCK_CHAT_SESSION: ChatSession = {
  id:         "chat-001",
  journal_id: "journal-004",
  phase:      "phase1",
  created_at: "2026-05-06T09:00:00Z",
  messages: [
    {
      id: "m1", role: "assistant",
      content: "今週の実習はいかがでしたか？特に印象に残った場面を教えてください。",
      timestamp: "2026-05-06T09:00:00Z",
    },
    {
      id: "m2", role: "user",
      content: "算数の時間にウォン君が理解できていない様子だったので、絵カードを使って説明しました。そしたら理解してくれて笑顔になりました。",
      timestamp: "2026-05-06T09:01:00Z",
    },
    {
      id: "m3", role: "assistant",
      content: "それは素晴らしい対応ですね！なぜ絵カードが効果的だと思いましたか？事前にそういった準備をしていたのですか？",
      timestamp: "2026-05-06T09:01:30Z",
    },
    {
      id: "m4", role: "user",
      content: "事前には準備していませんでした。その場で思いついて、教室の掲示物を使いました。",
      timestamp: "2026-05-06T09:02:00Z",
    },
    {
      id: "m5", role: "assistant",
      content: "機転を利かせての対応、素晴らしいですね。今後は事前に視覚支援ツールを準備しておくと、より確実に対応できます。次週のために、どんな準備ができそうですか？",
      timestamp: "2026-05-06T09:02:30Z",
    },
  ],
};

// ──────────────────────────────────────────────
// コーホートプロファイル（50名分）
// ──────────────────────────────────────────────
const schoolTypes = ["elementary", "middle", "high", "special"] as const;
const internshipTypes = ["intensive", "distributed"] as const;
const maleNames  = ["田中 一郎", "鈴木 次郎", "山本 三郎", "伊藤 四郎", "渡辺 五郎", "加藤 雄介", "近藤 雄一", "長谷川 海", "佐藤 三郎", "中村 智哉"];
const femaleNames= ["佐藤 花子", "高橋 幸子", "中村 恵", "小林 美咲", "吉田 由紀", "山田 葵", "太田 莉子", "佐藤 みのり", "村上 奈々", "岡田 春香"];

export const MOCK_COHORT_PROFILES: StudentProfile[] = Array.from({ length: 50 }, (_, i) => {
  const isMale  = i % 2 === 0;
  const nameArr = isMale ? maleNames : femaleNames;
  const name    = nameArr[i % nameArr.length] + (i >= 20 ? ` (${i})` : "");
  const grade   = 2 + (i % 3);
  const sType   = schoolTypes[i % 4];
  const iType   = internshipTypes[i % 2];
  const weeks   = iType === "intensive" ? 10 : (6 + (i % 3) * 2);
  const f1 = +(2.5 + Math.sin(i) * 0.7).toFixed(2);
  const f2 = +(2.6 + Math.cos(i) * 0.6).toFixed(2);
  const f3 = +(2.4 + Math.sin(i + 1) * 0.7).toFixed(2);
  const f4 = +(2.5 + Math.cos(i + 1) * 0.6).toFixed(2);
  const f1e= +(f1 + 0.8 + Math.sin(i * 2) * 0.3).toFixed(2);
  const f2e= +(f2 + 0.9 + Math.cos(i * 2) * 0.3).toFixed(2);
  const f3e= +(f3 + 0.7 + Math.sin(i * 2 + 1) * 0.3).toFixed(2);
  const f4e= +(f4 + 0.85 + Math.cos(i * 2 + 1) * 0.3).toFixed(2);
  return {
    id:               `student-${String(i + 1).padStart(3, "0")}`,
    name,
    gender:           isMale ? "male" : "female",
    grade,
    school_type:      sType,
    internship_type:  iType,
    weeks,
    school_name:      `〇〇市立${["東", "西", "南", "北", "中央"][i % 5]}${sType === "elementary" ? "小" : sType === "middle" ? "中" : sType === "high" ? "高" : "特別支援"}学校`,
    supervisor:       ["田中 誠一", "佐藤 めぐみ", "山田 浩二", "高橋 雅子", "木村 恵子"][i % 5],
    big_five: {
      extraversion:      +(2.5 + Math.sin(i * 0.7) * 1.2).toFixed(1),
      agreeableness:     +(3.0 + Math.cos(i * 0.7) * 0.9).toFixed(1),
      conscientiousness: +(3.2 + Math.sin(i * 0.5) * 0.7).toFixed(1),
      neuroticism:       +(2.8 + Math.cos(i * 0.5) * 1.0).toFixed(1),
      openness:          +(3.3 + Math.sin(i * 0.9) * 0.8).toFixed(1),
      measured_at:       "2026-04-01",
    },
    final_factor1: f1e,
    final_factor2: f2e,
    final_factor3: f3e,
    final_factor4: f4e,
    final_total:   +((f1e + f2e + f3e + f4e) / 4).toFixed(2),
    growth_delta:  +((f1e - f1 + f2e - f2 + f3e - f3 + f4e - f4) / 4).toFixed(2),
    self_eval_gap: +(Math.abs(Math.sin(i * 1.3)) * 0.5).toFixed(2),
    lps:           +(0.4 + Math.sin(i * 0.6) * 0.3).toFixed(2),
    weekly_scores: makeWeeklyScores(f1, f2, f3, f4, f1e, f2e, f3e, f4e, weeks),
  };
});
