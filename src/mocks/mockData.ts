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
// 日誌一覧（10週分）
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
      body: "出席確認・健康観察・今日の連絡事項を伝えた。",
    },
    {
      id: `${id}-r2`, order: 1, time_label: "1時限",
      time_start: "08:30", time_end: "09:15",
      subject: subject ?? "算数", lesson_goal: "", difficulty: "", devise: "",
      body: `${subject ?? "算数"}の授業。前時の復習後、新しい単元を導入した。`,
    },
    {
      id: `${id}-r3`, order: 2, time_label: "2時限",
      time_start: "09:20", time_end: "10:05",
      subject: "国語", lesson_goal: "", difficulty: "", devise: "",
      body: "音読練習と文章読解を行った。",
    },
    {
      id: `${id}-r4`, order: 3, time_label: "給食・昼休み",
      time_start: "12:00", time_end: "13:20",
      subject: "", lesson_goal: "", difficulty: "", devise: "",
      body: "給食時に児童と会話しながら様子を観察した。",
    },
  ];
  return {
    id,
    student_id: "user-001",
    title:      `${date} の日誌（第${week}週）`,
    content:    JSON.stringify({ version: 2, records: hourRecords, reflection: "今日の実習を通じて多くのことを学んだ。" }),
    reflection_text: "今日の実習を通じて多くのことを学んだ。",
    entry_date:  date,
    status,
    week_number: week,
    teacher_comment: status === "evaluated" ? "よく工夫されていました。次週も継続してください。" : undefined,
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
// 評価結果
// ──────────────────────────────────────────────
export const MOCK_EVALUATION_RESULT: EvaluationResult = {
  id:          "eval-004",
  journal_id:  "journal-004",
  status:      "completed",
  overall_comment: "学級経営面での改善が見られます。特に特別支援が必要な児童への配慮が充実してきました。次週は授業目標の明確化をさらに意識してください。",
  total_score: 3.38,
  factor_scores: { factor1: 3.1, factor2: 3.7, factor3: 3.2, factor4: 3.5 },
  evaluated_item_count: 23,
  tokens_used: 2341,
  halo_check: false,
  evaluation_items: Array.from({ length: 23 }, (_, i) => ({
    item_number: i + 1,
    factor:      i < 7 ? "factor1" : i < 13 ? "factor2" : i < 17 ? "factor3" : "factor4",
    is_evaluated: true,
    score:       2 + Math.round(Math.random() * 2 * 10) / 10,
    evidence:    "日誌本文より抜粋された根拠テキスト。",
    feedback:    "この点についてさらに意識的に取り組むと良いでしょう。",
    next_level_advice: "次のレベルに到達するためには、具体的な手立てを日誌に記録してください。",
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
}));

// ──────────────────────────────────────────────
// LPSデータ
// ──────────────────────────────────────────────
export const MOCK_LPS_DATA: LpsWeek[] = Array.from({ length: 8 }, (_, i) => ({
  week:        i + 1,
  lps:         +(0.45 + i * 0.04).toFixed(2),
  self_eval:   +(2.1 + i * 0.2).toFixed(1),
  ai_eval:     +(2.2 + i * 0.2).toFixed(1),
  growth_rate: +(0.05 + i * 0.01).toFixed(2),
}));

// ──────────────────────────────────────────────
// ゴール履歴
// ──────────────────────────────────────────────
export const MOCK_GOAL_HISTORY: GoalEntry[] = [
  { id: "g-1", week: 1, goal_text: "授業の始めに学習目標を板書で明示する",         is_smart: true,  achieved: true,  created_at: "2026-04-14T10:00:00Z" },
  { id: "g-2", week: 2, goal_text: "特別支援が必要な児童の座席配置を事前に確認する", is_smart: true,  achieved: true,  created_at: "2026-04-21T10:00:00Z" },
  { id: "g-3", week: 3, goal_text: "ペアワークを週1回以上取り入れる",             is_smart: false, achieved: false, created_at: "2026-04-28T10:00:00Z" },
  { id: "g-4", week: 4, goal_text: "発問の後に5秒待つ習慣をつける",               is_smart: true,  achieved: true,  created_at: "2026-05-05T10:00:00Z" },
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
    { id: "m1", role: "assistant", content: "今週の実習はいかがでしたか？特に印象に残った場面を教えてください。", timestamp: "2026-05-06T09:00:00Z" },
    { id: "m2", role: "user",      content: "算数の時間にウォン君が理解できていない様子だったので、絵カードを使って説明しました。", timestamp: "2026-05-06T09:01:00Z" },
    { id: "m3", role: "assistant", content: "それは素晴らしい対応ですね。なぜ絵カードが効果的だと思いましたか？", timestamp: "2026-05-06T09:01:30Z" },
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
