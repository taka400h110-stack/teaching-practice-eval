/**
 * src/api/client.ts
 * モックAPIクライアント（将来的に実際のバックエンドに差し替え可能）
 */
import {
  MOCK_JOURNALS, MOCK_EVALUATION_RESULT, MOCK_ALL_EVALUATIONS, MOCK_GROWTH_DATA,
  MOCK_SELF_EVALUATIONS, MOCK_LPS_DATA, MOCK_GOAL_HISTORY,
  MOCK_CHAT_SESSION, MOCK_COHORT_PROFILES, MOCK_HUMAN_EVALUATIONS,
} from "../mocks/mockData";
import type {
  JournalEntry, EvaluationResult, GrowthData, SelfEvaluation,
  LpsWeek, GoalEntry, ChatSession, UserRole, ChatMessage, User,
} from "../types";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// ローカルストレージで日誌を永続化
function getJournals(): JournalEntry[] {
  try {
    const raw = localStorage.getItem("mock_journals");
    if (raw) return JSON.parse(raw) as JournalEntry[];
  } catch {}
  return [...MOCK_JOURNALS];
}
function saveJournals(journals: JournalEntry[]): void {
  localStorage.setItem("mock_journals", JSON.stringify(journals));
}

// 人間評価のローカルストレージ管理
type HumanEvalEntry = {
  evaluator_id: string;
  evaluator_name: string;
  journal_id: string;
  week: number;
  items: Array<{ item_number: number; score: number }>;
};
function getHumanEvals(): HumanEvalEntry[] {
  try {
    const raw = localStorage.getItem("mock_human_evals");
    if (raw) return JSON.parse(raw) as HumanEvalEntry[];
  } catch {}
  return [...MOCK_HUMAN_EVALUATIONS];
}
function saveHumanEvals(evals: HumanEvalEntry[]): void {
  localStorage.setItem("mock_human_evals", JSON.stringify(evals));
}

// 登録ユーザーのローカルストレージ管理
const DEFAULT_REGISTERED_USERS: User[] = [
  { id: "user-001", email: "student@teaching-eval.jp",      name: "山田 太郎",   roles: ["student"],        student_number: "2023A001", grade: 3 },
  { id: "user-002", email: "teacher@teaching-eval.jp",      name: "佐藤 花子",   roles: ["univ_teacher"] },
  { id: "user-003", email: "mentor@teaching-eval.jp",       name: "鈴木 一郎",   roles: ["school_mentor"] },
  { id: "user-004", email: "admin@teaching-eval.jp",        name: "田中 管理者", roles: ["admin"] },
  { id: "user-005", email: "researcher@teaching-eval.jp",   name: "伊藤 研究者", roles: ["researcher"] },
  { id: "user-006", email: "collaborator@teaching-eval.jp", name: "渡辺 協力者", roles: ["collaborator"] },
  { id: "user-007", email: "board@teaching-eval.jp",        name: "中村 委員",   roles: ["board_observer"] },
  { id: "user-008", email: "evaluator@teaching-eval.jp",    name: "小林 評価者", roles: ["evaluator"] },
];
function getRegisteredUsers(): User[] {
  try {
    const raw = localStorage.getItem("mock_registered_users");
    if (raw) return JSON.parse(raw) as User[];
  } catch {}
  return [...DEFAULT_REGISTERED_USERS];
}
function saveRegisteredUsers(users: User[]): void {
  localStorage.setItem("mock_registered_users", JSON.stringify(users));
}

// ローカルストレージで自己評価を永続化
function getSelfEvals(): SelfEvaluation[] {
  try {
    const raw = localStorage.getItem("mock_self_evaluations");
    if (raw) return JSON.parse(raw) as SelfEvaluation[];
  } catch {}
  return [...MOCK_SELF_EVALUATIONS];
}
function saveSelfEvals(evals: SelfEvaluation[]): void {
  localStorage.setItem("mock_self_evaluations", JSON.stringify(evals));
}

// ローカルストレージでゴール履歴を永続化
function getGoals(): GoalEntry[] {
  try {
    const raw = localStorage.getItem("mock_goal_history");
    if (raw) return JSON.parse(raw) as GoalEntry[];
  } catch {}
  return [...MOCK_GOAL_HISTORY];
}
function saveGoals(goals: GoalEntry[]): void {
  localStorage.setItem("mock_goal_history", JSON.stringify(goals));
}

// ローカルストレージでチャットセッションを永続化
function getChatSessions(): Record<string, ChatSession> {
  try {
    const raw = localStorage.getItem("mock_chat_sessions");
    if (raw) return JSON.parse(raw) as Record<string, ChatSession>;
  } catch {}
  return {};
}
function saveChatSessions(sessions: Record<string, ChatSession>): void {
  localStorage.setItem("mock_chat_sessions", JSON.stringify(sessions));
}

// ══════════════════════════════════════════════════════
// デモユーザー定義（全役割・オンボーディング完了済み）
// 全員 firstLogin: false → ログイン即ダッシュボードへ
// ══════════════════════════════════════════════════════
type DemoUserDef = { id: string; firstLogin?: boolean;
  email: string;
  name: string;
  roles: UserRole[];
  student_number?: string;
  grade?: number;
  school_type?: "elementary" | "middle" | "high" | "special";
  internship_type?: "intensive" | "distributed";
  weeks?: number;
  organization?: string;
  position?: string;
};

const DEMO_USERS: Record<string, DemoUserDef> = {
  "student@teaching-eval.jp": {
    id: "user-001", email: "student@teaching-eval.jp", name: "山田 太郎", roles: ["student"], firstLogin: false,
    student_number: "2023A001", grade: 3,
    school_type: "elementary", internship_type: "intensive", weeks: 10,
  },
  "teacher@teaching-eval.jp": {
    id: "user-002", email: "teacher@teaching-eval.jp", name: "佐藤 花子", roles: ["univ_teacher"], firstLogin: false,
    organization: "〇〇大学 教育学部", position: "准教授",
  },
  "mentor@teaching-eval.jp": {
    id: "user-003", email: "mentor@teaching-eval.jp", name: "鈴木 一郎", roles: ["school_mentor"], firstLogin: false,
    organization: "〇〇市立東小学校", position: "担任教諭",
  },
  "admin@teaching-eval.jp": {
    id: "user-004", email: "admin@teaching-eval.jp", name: "田中 管理者", roles: ["admin"], firstLogin: false,
    organization: "〇〇大学 教職センター", position: "センター長",
  },
  "researcher@teaching-eval.jp": {
    id: "user-005", email: "researcher@teaching-eval.jp", name: "伊藤 研究者", roles: ["researcher"], firstLogin: false,
    organization: "〇〇大学大学院 教育研究科", position: "博士課程研究員",
  },
  "collaborator@teaching-eval.jp": {
    id: "user-006", email: "collaborator@teaching-eval.jp", name: "渡辺 協力者", roles: ["collaborator"], firstLogin: false,
    organization: "△△教育センター", position: "研究協力員",
  },
  "board@teaching-eval.jp": {
    id: "user-007", email: "observer@teaching-eval.jp", name: "中村 委員", roles: ["board_observer"], firstLogin: false,
    organization: "〇〇市教育委員会", position: "指導主事",
  },
  "evaluator@teaching-eval.jp": {
    id: "user-008", email: "evaluator@teaching-eval.jp", name: "小林 評価者", roles: ["evaluator"], firstLogin: false,
    organization: "教員養成評価機構", position: "外部評価者",
  },
};

// デモアカウント一覧（LoginPageで表示用）
export const DEMO_ACCOUNT_LIST = [
  {
    email: "student@teaching-eval.jp",      password: "password",
    label: "実習生",       name: "山田 太郎",
    detail: "3年生 / 小学校・集中実習（10週）/ 学籍番号: 2023A001",
    group: "実習関係者",
  },
  {
    email: "teacher@teaching-eval.jp",      password: "password",
    label: "大学教員",     name: "佐藤 花子",
    detail: "〇〇大学 教育学部 / 准教授",
    group: "実習関係者",
  },
  {
    email: "mentor@teaching-eval.jp",       password: "password",
    label: "校内指導教員", name: "鈴木 一郎",
    detail: "〇〇市立東小学校 / 担任教諭",
    group: "実習関係者",
  },
  {
    email: "evaluator@teaching-eval.jp",    password: "password",
    label: "評価者",       name: "小林 評価者",
    detail: "教員養成評価機構 / 外部評価者",
    group: "実習関係者",
  },
  {
    email: "researcher@teaching-eval.jp",   password: "password",
    label: "研究者",       name: "伊藤 研究者",
    detail: "〇〇大学大学院 教育研究科 / 博士課程研究員",
    group: "研究・行政",
  },
  {
    email: "collaborator@teaching-eval.jp", password: "password",
    label: "研究協力者",   name: "渡辺 協力者",
    detail: "△△教育センター / 研究協力員",
    group: "研究・行政",
  },
  {
    email: "board@teaching-eval.jp",        password: "password",
    label: "教育委員会",   name: "中村 委員",
    detail: "〇〇市教育委員会 / 指導主事",
    group: "研究・行政",
  },
  {
    email: "admin@teaching-eval.jp",        password: "password",
    label: "管理者",       name: "田中 管理者",
    detail: "〇〇大学 教職センター / センター長",
    group: "システム",
  },
];

const mockApi = {
  // ── 認証 ──
  login: async (email: string, _password: string) => {
    await delay();
    if (!email.includes("@")) throw new Error("Invalid credentials");

    // 複数のメールアドレス対応: DEMO_USERSのキーや値から探索
    let demo = DEMO_USERS[email];
    if (!demo) {
      const demoUser = Object.values(DEMO_USERS).find(d => 
        d.email && d.email.split(',').map(e => e.trim()).includes(email)
      );
      if (demoUser) {
        demo = demoUser;
      }
    }
    
    const user = demo
      ? { id: demo.id, email, name: demo.name, role: demo.roles[0] }
      : { id: "user-001", email, name: "山田 太郎", roles: ["student"] as UserRole };

    const isFirstLogin = demo?.firstLogin ?? false;
    // デモユーザーのプロフィール情報を user_info に含める
    const fullUser = demo ? {
      ...user,
      student_number: demo.student_number,
      grade:          demo.grade,
      organization:   demo.organization,
      position:       demo.position,
      school_type:    demo.school_type,
      internship_type: demo.internship_type,
      weeks:          demo.weeks,
    } : user;
    localStorage.setItem("user_info", JSON.stringify(fullUser));
    localStorage.setItem("auth_token", "mock-token-001");
    // デモアカウントは全員オンボーディング完了済みとしてマーク
    if (demo) {
      localStorage.setItem(`onboarding_done_${user.id}`, "true");
    }
    const onboardingDone = localStorage.getItem(`onboarding_done_${user.id}`);
    if (!onboardingDone && isFirstLogin) {
      localStorage.setItem("pending_onboarding", "true");
    }
    return { ...fullUser, requiresOnboarding: !onboardingDone && isFirstLogin };
  },
  logout: async () => {
    await delay(100);
    localStorage.removeItem("user_info");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("pending_onboarding");
  },
  getCurrentUser: () => {
    const raw = localStorage.getItem("user_info");
    return raw ? JSON.parse(raw) : null;
  },
  isAuthenticated: () => !!localStorage.getItem("auth_token"),
  requiresOnboarding: () => localStorage.getItem("pending_onboarding") === "true",
  completeOnboarding: (userId: string) => {
    localStorage.setItem(`onboarding_done_${userId}`, "true");
    localStorage.removeItem("pending_onboarding");
  },

  // ── 日誌 ──
  getJournals: async (): Promise<JournalEntry[]> => {
    await delay();
    return getJournals();
  },
  getJournal: async (id: string): Promise<JournalEntry> => {
    await delay();
    const j = getJournals().find((j) => j.id === id);
    if (!j) throw new Error(`Journal ${id} not found`);
    return j;
  },
  createJournal: async (data: Record<string, unknown>): Promise<JournalEntry> => {
    await delay();
    const journals = getJournals();
    const newJ: JournalEntry = {
      id:              `journal-${Date.now()}`,
      student_id:      "user-001",
      title:           (data.title as string) || "新しい日誌",
      content:         (data.content as string) || "",
      reflection_text: (data.reflection_text as string) || "",
      entry_date:      (data.entry_date as string) || new Date().toISOString().split("T")[0],
      status:          (data.status as JournalEntry["status"]) || "draft",
      week_number:     (data.week_number as number) || 1,
    };
    journals.unshift(newJ);
    saveJournals(journals);
    return newJ;
  },
  updateJournal: async (id: string, data: Record<string, unknown>): Promise<JournalEntry> => {
    await delay();
    const journals = getJournals();
    const idx = journals.findIndex((j) => j.id === id);
    if (idx === -1) throw new Error(`Journal ${id} not found`);
    journals[idx] = { ...journals[idx], ...data } as JournalEntry;
    saveJournals(journals);
    return journals[idx];
  },
  deleteJournal: async (id: string): Promise<void> => {
    await delay();
    const journals = getJournals().filter((j) => j.id !== id);
    saveJournals(journals);
  },

  // ── コメント保存（教員・メンター用）──
  saveComment: async (journalId: string, commentType: "univ_teacher_comment" | "school_mentor_comment" | "teacher_comment", comment: string): Promise<JournalEntry> => {
    await delay();
    const journals = getJournals();
    const idx = journals.findIndex((j) => j.id === journalId);
    if (idx === -1) throw new Error(`Journal ${journalId} not found`);
    journals[idx] = { ...journals[idx], [commentType]: comment };
    saveJournals(journals);
    return journals[idx];
  },

  // ── 評価 ──
  getEvaluation: async (journalId: string): Promise<EvaluationResult> => {
    try {
      const response = await fetch(`/api/data/evaluations/${journalId}`);
      if (!response.ok) {
        if (response.status === 404) {
          // モックフォールバック
          const weekMatch = journalId.match(/journal-0*(\d+)/);
          const week = weekMatch ? parseInt(weekMatch[1]) : 4;
          const found = MOCK_ALL_EVALUATIONS.find((e) => e.journal_id === journalId);
          if (found) return found;
          return { ...MOCK_EVALUATION_RESULT, journal_id: journalId, id: `eval-${week}` };
        }
        throw new Error("Failed to fetch evaluation");
      }
      const data = await response.json();
      
      return {
        id: data.evaluation.id,
        journal_id: data.evaluation.journal_id,
        status: "completed",
        overall_comment: data.evaluation.overall_comment || "",
        total_score: data.evaluation.total_score,
        factor_scores: {
          factor1: data.evaluation.factor1_score,
          factor2: data.evaluation.factor2_score,
          factor3: data.evaluation.factor3_score,
          factor4: data.evaluation.factor4_score,
        },
        evaluation_items: data.items.map((item: any) => ({
          item_number: item.item_number,
          factor: `factor${item.item_number <= 7 ? 1 : item.item_number <= 13 ? 2 : item.item_number <= 17 ? 3 : 4}`,
          is_evaluated: !item.is_na,
          score: item.score,
          evidence: item.evidence || "",
          feedback: item.feedback || "",
          next_level_advice: ""
        })),
        evaluated_item_count: data.items.filter((i: any) => !i.is_na).length,
        tokens_used: 0,
        halo_check: !!data.evaluation.halo_effect_detected,
      };
    } catch (err) {
      console.error("API error fetching evaluation:", err);
      // エラー時のフォールバック
      return { ...MOCK_EVALUATION_RESULT, journal_id: journalId, status: "pending" };
    }
  },

  // 全週分の評価結果を取得
  getAllEvaluations: async (): Promise<EvaluationResult[]> => {
    try {
      const res = await fetch("/api/data/evaluations");
      if (!res.ok) throw new Error("Failed to fetch all evaluations");
      const data = await res.json();
      return data.evaluations.map((e: any) => ({
        id: e.id,
        journal_id: e.journal_id,
        status: "completed",
        overall_comment: e.overall_comment || "",
        total_score: e.total_score,
        factor_scores: {
          factor1: e.factor1_score,
          factor2: e.factor2_score,
          factor3: e.factor3_score,
          factor4: e.factor4_score,
        },
        evaluation_items: [], // 簡略化のため省略
        evaluated_item_count: 23,
        tokens_used: 0,
        halo_check: !!e.halo_effect_detected
      }));
    } catch (err) {
      console.error(err);
      return MOCK_ALL_EVALUATIONS;
    }
  },

  // ── 人間評価 ──
  getHumanEvaluations: async (journalId?: string) => {
    if (journalId) {
      try {
        const response = await fetch(`/api/data/human-evals/${journalId}`);
        if (!response.ok) throw new Error("Failed to fetch human evaluations");
        const data = await response.json();
        return data.evaluations;
      } catch (err) {
        console.error("API error fetching human evals:", err);
        return [];
      }
    }
    
    // 全件取得
    try {
      const response = await fetch("/api/data/human-evals");
      if (!response.ok) throw new Error("Failed to fetch all human evaluations");
      const data = await response.json();
      return data.evaluations;
    } catch (err) {
      console.error("API error fetching all human evals:", err);
      return getHumanEvals();
    }
  },
  saveHumanEvaluation: async (
    journalId: string,
    week: number,
    items: Array<{ item_number: number; score: number; is_na?: boolean; comment?: string }>
  ) => {
    const user = JSON.parse(localStorage.getItem("user_info") ?? "{}");
    
    try {
      const response = await fetch("/api/data/human-evals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          journal_id: journalId,
          evaluator_id: user.id ?? "user-008",
          evaluator_name: user.name ?? "評価者",
          items: items,
        }),
      });
      
      if (!response.ok) throw new Error("Failed to save human evaluation");
      const data = await response.json();
      
      // フロントエンドの互換性のためモックと同じ形式を返す
      return {
        evaluator_id: user.id ?? "user-008",
        evaluator_name: user.name ?? "評価者",
        journal_id: journalId,
        week,
        items,
        human_eval_id: data.human_eval_id
      };
    } catch (err) {
      console.error("API error saving human eval:", err);
      throw err;
    }
  },

  // AI評価実行（ステータスを evaluated に更新）
  runEvaluation: async (journalId: string): Promise<EvaluationResult> => {
    try {
      const journals = getJournals();
      const idx = journals.findIndex((j) => j.id === journalId);
      const journal = journals[idx];
      const user = JSON.parse(localStorage.getItem("user_info") ?? "{}");

      // 1. AI評価APIを呼び出す
      const aiRes = await fetch("/api/ai/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          journal_content: journal?.content || "",
          student_name: user.name || "学生",
          week_number: journal?.week_number || 1,
          journal_id: journalId
        })
      });
      
      if (!aiRes.ok) throw new Error("Failed to call AI evaluate");
      const aiData = await aiRes.json();

      // 2. 評価結果を保存する
      const saveRes = await fetch("/api/data/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          journal_id: journalId,
          evaluation: aiData.evaluation,
          model_name: aiData.model,
          prompt_version: aiData.prompt_version,
          temperature: aiData.temperature,
          token_count: aiData.token_count || 0,
          duration_ms: 0
        })
      });
      
      if (!saveRes.ok) throw new Error("Failed to save evaluation");

      // 3. ローカルのステータスを更新する
      if (idx !== -1) {
        journals[idx] = { ...journals[idx], status: "evaluated" };
        saveJournals(journals);
      }

      // 4. 保存した評価結果を取得して返す
      return await api.getEvaluation(journalId);
    } catch (err) {
      console.error("runEvaluation error:", err);
      // エラー時のフォールバック
      return { ...MOCK_EVALUATION_RESULT, journal_id: journalId, status: "failed" };
    }
  },

  // ── 成長データ ──
  getGrowthData: async (): Promise<GrowthData> => {
    await delay();
    return MOCK_GROWTH_DATA;
  },

  // ── 自己評価 ──
  getSelfEvaluations: async (): Promise<SelfEvaluation[]> => {
    await delay();
    return getSelfEvals();
  },
  saveSelfEvaluation: async (data: Omit<SelfEvaluation, "id">): Promise<SelfEvaluation> => {
    await delay();
    const evals = getSelfEvals();
    const newEval: SelfEvaluation = {
      id: `self-eval-${Date.now()}`,
      ...data,
    };
    // 同じ週のデータがあれば更新
    const idx = evals.findIndex((e) => e.week === data.week);
    if (idx !== -1) {
      evals[idx] = newEval;
    } else {
      evals.push(newEval);
      evals.sort((a, b) => a.week - b.week);
    }
    saveSelfEvals(evals);
    return newEval;
  },

  // ── LPS ──
  getLpsData: async (): Promise<LpsWeek[]> => {
    await delay();
    return MOCK_LPS_DATA;
  },

  // ── ゴール履歴 ──
  getGoalHistory: async (): Promise<GoalEntry[]> => {
    await delay();
    return getGoals();
  },
  createGoal: async (data: { week: number; goal_text: string; is_smart: boolean }): Promise<GoalEntry> => {
    await delay();
    const goals = getGoals();
    const newGoal: GoalEntry = {
      id:         `goal-${Date.now()}`,
      week:       data.week,
      goal_text:  data.goal_text,
      is_smart:   data.is_smart,
      achieved:   false,
      created_at: new Date().toISOString(),
    };
    goals.unshift(newGoal);
    saveGoals(goals);
    return newGoal;
  },
  updateGoal: async (id: string, data: Partial<GoalEntry>): Promise<GoalEntry> => {
    await delay();
    const goals = getGoals();
    const idx = goals.findIndex((g) => g.id === id);
    if (idx === -1) throw new Error(`Goal ${id} not found`);
    goals[idx] = { ...goals[idx], ...data };
    saveGoals(goals);
    return goals[idx];
  },

  // ── チャット ──
  // 全チャットセッション一覧（journal-004のデモセッション含む）
  getAllChatSessions: async (): Promise<ChatSession[]> => {
    await delay();
    const sessions = getChatSessions();
    // journal-004 のデモセッションがない場合は追加
    if (!sessions["journal-004"]) {
      sessions["journal-004"] = { ...MOCK_CHAT_SESSION, journal_id: "journal-004" };
    }
    return Object.values(sessions).filter((s) => s.messages.length > 0);
  },
  getChatSession: async (journalId: string): Promise<ChatSession> => {
    await delay();
    const sessions = getChatSessions();
    if (sessions[journalId]) return sessions[journalId];
    // journal-004 はリッチなデモセッション
    if (journalId === "journal-004") return { ...MOCK_CHAT_SESSION, journal_id: journalId };
    // それ以外は初期状態のセッションを返す
    const newSession: ChatSession = {
      id:         `chat-${Date.now()}`,
      journal_id: journalId,
      phase:      "phase0",
      messages:   [
        {
          id:        "init-1",
          role: "assistant",
          content:   "【Phase 0: 出来事の記述】\n今週の実習日誌を読みました。今週特に印象に残った出来事を、できるだけ具体的に教えてください。どんな小さなことでも構いません。",
          timestamp: new Date().toISOString(),
        },
      ],
      created_at: new Date().toISOString(),
    };
    sessions[journalId] = newSession;
    saveChatSessions(sessions);
    return newSession;
  },
  sendChatMessage: async (journalId: string, content: string): Promise<{ session: ChatSession; reply: ChatMessage }> => {
    await delay(800);
    const sessions = getChatSessions();
    const session = sessions[journalId] || await mockApi.getChatSession(journalId);

    const userMsg: ChatMessage = {
      id:        `msg-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    // フェーズに応じた返答を生成
    const phaseReplies: Record<string, string[]> = {
      phase0: [
        "それは具体的な場面ですね。その時、あなたはどんな気持ちでしたか？また、その場面でどんな判断をしましたか？",
        "詳しく教えてくれてありがとうございます。その経験の中で、特に難しかったことは何でしたか？",
      ],
      phase1: [
        "【Phase 1: 省察・分析】\nその判断の背景には、どんな考えがありましたか？もし同じ場面がもう一度あったとしたら、どうしますか？",
        "なぜそう感じたのか、もう少し深く考えてみましょう。その経験はあなたの教育観とどう結びついていますか？",
      ],
      bridge: [
        "【Bridge】\n実習全体を振り返って、今週の経験と他の週の経験に共通することはありますか？",
        "これまでの省察を踏まえて、教師としての自分の強みと課題を整理してみましょう。",
      ],
      phase2: [
        "【Phase 2: 概念化・一般化】\nその経験から、教育に関するどんな原則や考え方を導き出せますか？",
        "✅ 素晴らしい省察です！来週の実践目標をSMART形式で設定してみましょう。\n- Specific（具体的）\n- Measurable（測定可能）\n- Achievable（達成可能）\n- Relevant（関連性）\n- Time-bound（期限あり）",
      ],
    };

    const replies = phaseReplies[session.phase] || phaseReplies.phase0;
    const replyContent = replies[Math.floor(Math.random() * replies.length)];

    const replyMsg: ChatMessage = {
      id:        `msg-${Date.now() + 1}`,
      role: "assistant",
      content:   replyContent,
      timestamp: new Date().toISOString(),
    };

    // フェーズ進行ロジック
    const msgCount = session.messages.length;
    let nextPhase = session.phase;
    if (msgCount >= 3 && session.phase === "phase0") nextPhase = "phase1";
    else if (msgCount >= 7 && session.phase === "phase1") nextPhase = "bridge";
    else if (msgCount >= 9 && session.phase === "bridge") nextPhase = "phase2";
    else if (msgCount >= 13 && session.phase === "phase2") nextPhase = "completed";

    const updatedSession: ChatSession = {
      ...session,
      phase:    nextPhase as ChatSession["phase"],
      messages: [...session.messages, userMsg, replyMsg],
    };
    sessions[journalId] = updatedSession;
    saveChatSessions(sessions);

    return { session: updatedSession, reply: replyMsg };
  },

  // ── コーホート ──
  getCohortProfiles: async () => {
    await delay();
    return MOCK_COHORT_PROFILES;
  },

  // ── ユーザー管理（管理者用）──
  getRegisteredUsers: async (): Promise<User[]> => {
    await delay();
    return getRegisteredUsers();
  },
  registerUser: async (userData: Omit<User, "id"> & { password?: string }): Promise<User> => {
    await delay(500);
    const users = getRegisteredUsers();
    const newUser: User = { ...userData, id: `user-${Date.now()}` };
    users.push(newUser);
    saveRegisteredUsers(users);
    return newUser;
  },
  updateUser: async (id: string, data: Partial<User>): Promise<User> => {
    await delay(400);
    const users = getRegisteredUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error(`User ${id} not found`);
    users[idx] = { ...users[idx], ...data };
    saveRegisteredUsers(users);
    return users[idx];
  },
  deleteUser: async (id: string): Promise<void> => {
    await delay(300);
    const users = getRegisteredUsers().filter((u) => u.id !== id);
    saveRegisteredUsers(users);
  },

  // ── データリセット（デモ用）──
  resetDemoData: () => {
    localStorage.removeItem("mock_journals");
    localStorage.removeItem("mock_self_evaluations");
    localStorage.removeItem("mock_goal_history");
    localStorage.removeItem("mock_chat_sessions");
    localStorage.removeItem("mock_human_evals");
    localStorage.removeItem("mock_registered_users");
  },

  saveBlandAltmanResults: async (data: any) => {
    try {
      const response = await fetch("/api/data/bland-altman-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to save Bland-Altman results");
      return await response.json();
    } catch (err) {
      console.error("API error saving Bland-Altman results:", err);
      throw err;
    }
  },
  
  getSavedReliabilityDetails: async (runId: string) => {
    try {
      const response = await fetch(`/api/data/reliability-results/${runId}`);
      if (!response.ok) throw new Error("Failed to fetch reliability details");
      const data = await response.json();
      return data.details || [];
    } catch (err) {
      console.error("API error fetching reliability details:", err);
      throw err;
    }
  },
  getSavedReliabilityResults: async () => {
    try {
      const response = await fetch("/api/data/reliability-results");
      if (!response.ok) throw new Error("Failed to fetch reliability results");
      const data = await response.json();
      return data.results || [];
    } catch (err) {
      console.error("API error fetching reliability results:", err);
      throw err;
    }
  }
};

export default mockApi;

export const bfiApi = {
  saveResponses: async (userId: string, responses: Record<number, number>) => {
    try {
      const res = await fetch('/api/bfi/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, responses })
      });
      return await res.json();
    } catch (e) {
      console.error(e);
      return { success: false };
    }
  },
  getResponses: async (userId: string) => {
    try {
      const res = await fetch(`/api/bfi/responses/${userId}`);
      const data = await res.json();
      return data.responses || {};
    } catch (e) {
      console.error(e);
      return {};
    }
  }
};
