
export async function apiFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token');
  const headers = {
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem("user_info");
    localStorage.removeItem("auth_token");
    window.location.href = '/login';
    throw new Error("Unauthorized or token expired");
  }
  return res;
}

/**
 * src/api/client.ts
 * モックAPIクライアント（将来的に実際のバックエンドに差し替え可能）
 */

import type { CleanupMetricsResponse } from "../types/adminMetrics";
import type { CleanupFailureAlertResponse, CleanupFailureAlertResponseWithAck, AlertHistoryRow } from "../types/adminAlerts";
import type {
  JournalEntry, EvaluationResult, GrowthData, SelfEvaluation,
  LpsWeek, GoalEntry, ChatSession, UserRole, ChatMessage, User,
} from "../types";


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

const apiClient = {
  // ── 認証 ──
  login: async (email: string, password: string) => {
    if (!email.includes("@")) throw new Error("Invalid credentials");
    
    const res = await apiFetch("/api/data/auth/login", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    
    if (!res.ok) throw new Error("User not found or invalid credentials");
    const data = await res.json() as any;
    const user = data.user;
    if (data.token) localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(user));
    
    localStorage.setItem("user_info", JSON.stringify(user));
    localStorage.setItem("auth_token", data.token);
    
    return { ...user, requiresOnboarding: false };
  },
  logout: async () => {
    
    localStorage.removeItem("user_info");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("pending_onboarding");
  },
  getCurrentUser: () => {
    try {
      const raw = localStorage.getItem("user_info");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // userがネストしている場合の対応
      return parsed.user ? parsed.user : parsed;
    } catch (e) {
      console.error("Failed to parse user_info:", e);
      return null;
    }
  },
  
  isAuthenticated: () => {
    const token = localStorage.getItem("auth_token");
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_info");
        return false;
      }
      return true;
    } catch(e) {
      return false;
    }
  },

  requiresOnboarding: () => false,
  completeOnboarding: (userId: string) => {
    localStorage.setItem(`onboarding_done_${userId}`, "true");
    localStorage.removeItem("pending_onboarding");
  },

  // ── 日誌 ──
  getJournals: async (): Promise<JournalEntry[]> => {
    const user = JSON.parse(localStorage.getItem("user_info") || "{}");
    const role = user.role || "student";
    let url = "/api/data/journals";
    if (role === "student") {
      url += "?student_id=" + user.id;
    }
    const res = await apiFetch(url);
    if (!res.ok) throw new Error("Failed to fetch journals");
    const data = await res.json() as any;
    console.log("[apiClient.getJournals] raw response:", data);
    return Array.isArray(data.journals) ? data.journals : (Array.isArray(data) ? data : []);
  },
  getJournal: async (id: string): Promise<JournalEntry> => {
    const res = await apiFetch(`/api/data/journals/${id}`, { headers: {  } });
    if (!res.ok) throw new Error(`Journal ${id} not found`);
    const data = await res.json() as any;
    return data.journal || data;
  },
  createJournal: async (data: Record<string, unknown>): Promise<JournalEntry> => {
    const user = JSON.parse(localStorage.getItem("user_info") || "{}");
    const payload = {
      ...data,
      student_id: user.id || "user-001",
      entry_date: new Date().toISOString(),
      status: "draft"
    };
    const res = await apiFetch("/api/data/journals", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Failed to create journal");
    return await res.json();
  },
  updateJournal: async (id: string, data: Record<string, unknown>): Promise<JournalEntry> => {
    const res = await apiFetch(`/api/data/journals/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to update journal");
    return await res.json();
  },
  deleteJournal: async (id: string): Promise<void> => {
    const res = await apiFetch(`/api/data/journals/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${localStorage.getItem('auth_token')}` } });
    if (!res.ok) throw new Error("Failed to delete journal");
  },

  

  // ── 評価 ──
  getEvaluation: async (journalId: string): Promise<EvaluationResult> => {
    try {
      const res = await apiFetch(`/api/data/evaluations/${journalId}`, { headers: {  } });
      if (!res.ok) throw new Error("Failed to fetch evaluation");
      const data = await res.json() as any;
      return {
        id: data.id,
        journal_id: data.journal_id,
        status: "completed",
        // overall_score: data.total_score,
        factor_scores: {
          factor1: data.factor1_score,
          factor2: data.factor2_score,
          factor3: data.factor3_score,
          factor4: data.factor4_score
        },
        evaluation_items: JSON.parse((data as any).items_json || "[]").map((i: any) => ({
          item_number: i.item_number || i.item,
          score: i.score,
          evidence: i.evidence,
          feedback: i.feedback
        })),
        overall_comment: data.overall_comment || "",
        total_score: data.total_score || 0,
        evaluated_item_count: data.evaluated_item_count || 0,
        tokens_used: data.tokens_used || 0,
        halo_check: data.halo_check || false
      };
    } catch { throw new Error("Evaluation not found"); }
  },

  // 全週分の評価結果を取得
  getAllEvaluations: async (): Promise<EvaluationResult[]> => {
    try {
      const res = await apiFetch("/api/data/evaluations", { headers: {  } });
      if (!res.ok) throw new Error("Failed to fetch all evaluations");
      const data = await res.json() as any;
      return data.evaluations.map((e: any) => ({
        id: e.id,
        journal_id: e.journal_id,
        status: "completed",
         
        factor_scores: {
          factor1: e.factor1_score,
          factor2: e.factor2_score,
          factor3: e.factor3_score,
          factor4: e.factor4_score
        },
        evaluation_items: JSON.parse(e.items_json || "[]").map((i: any) => ({
          item_number: i.item_number || i.item,
          score: i.score,
          evidence: i.evidence,
          feedback: i.feedback
        })),
        overall_comment: e.overall_comment || "",
        total_score: e.total_score || 0,
        evaluated_item_count: e.evaluated_item_count || 0,
        tokens_used: e.tokens_used || 0,
        halo_check: e.halo_check || false
      }));
    } catch {
      return [];
    }
  },

  // ── 人間評価 ──
  getHumanEvaluations: async (journalId?: string) => {
    if (journalId) {
      try {
        const response = await apiFetch(`/api/data/human-evals/${journalId}`, { headers: {  } });
        if (!response.ok) throw new Error("Failed to fetch human evaluations");
        const data = (await response.json()) as any;
        return data.evaluations || [];
      } catch (err) {
        console.error("API error fetching human evals:", err);
        return [];
      }
    }
    
    // 全件取得
    try {
      const response = await apiFetch("/api/data/human-evals", { headers: {  } });
      if (!response.ok) throw new Error("Failed to fetch all human evaluations");
      const data = (await response.json()) as any;
      return data.evaluations || [];
    } catch (err) {
      console.error("API error fetching all human evals:", err);
      return [];
    }
  },
  saveHumanEvaluation: async (
    journalId: string,
    week: number,
    items: Array<{ item_number: number; score: number; is_na?: boolean; comment?: string }>
  ) => {
    const user = JSON.parse(localStorage.getItem("user_info") ?? "{}");
    try {
      const response = await apiFetch("/api/data/human-evals", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journal_id: journalId,
          evaluator_id: user.id || "evaluator-01",
          evaluator_name: user.name || "評価者",
          items
        })
      });
      if (!response.ok) throw new Error("Failed to save human evaluation");
      return await response.json();
    } catch (err) {
      console.error(err);
      throw err;
    }
  },

  // AI評価実行（ステータスを evaluated に更新）
  runEvaluation: async (journalId: string): Promise<EvaluationResult> => {
    try {
      const journals = ([] as any[]);
      const idx = journals.findIndex((j) => j.id === journalId);
      const journal = journals[idx];
      const user = JSON.parse(localStorage.getItem("user_info") ?? "{}");

      // 1. AI評価APIを呼び出す
      const aiRes = await apiFetch("/api/ai/evaluate", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          journal_content: journal?.content || "",
          student_name: user.name || "学生",
          week_number: journal?.week_number || 1,
          journal_id: journalId
        })
      });
      
      if (!aiRes.ok) throw new Error("Failed to call AI evaluate");
      const aiData: any = await aiRes.json();

      // 2. 評価結果を保存する
      const saveRes = await apiFetch("/api/data/evaluations", { method: "POST", headers: { "Content-Type": "application/json" },
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
        journals[idx] = { ...journals[idx], status: "completed" };
        ;
      }

      // 4. 保存した評価結果を取得して返す
      return await apiClient.getEvaluation(journalId);
    } catch (err) {
      console.error("runEvaluation error:", err);
      // エラー時のフォールバック
      throw new Error("Evaluation failed");
    }
  },

  // ── 成長データ ──
  getGrowthData: async (): Promise<GrowthData> => {
    const user = JSON.parse(localStorage.getItem("user_info") || "{}");
    const userId = user.id || "user-001";
    try {
      const res = await apiFetch(`/api/data/growth/${userId}`, { headers: {  } });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json() as any;
      return {
        student_id: data.student_id,
        weekly_scores: data.weekly_scores.map((w: any) => ({
          week: w.week_number,
          factor1: w.factor1,
          factor2: w.factor2,
          factor3: w.factor3,
          factor4: w.factor4,
          total: w.total,
          ai_total: w.ai_total,
          journal_id: w.journal_id
        }))
      };
    } catch {
      return { student_id: "", weekly_scores: [] };
    }
  },

  // ── 自己評価 ──
  getSelfEvaluations: async (): Promise<SelfEvaluation[]> => {
    const user = JSON.parse(localStorage.getItem("user_info") || "{}");
    const userId = user.id || "user-001";
    try {
      const res = await apiFetch(`/api/data/self-evals/${userId}`, { headers: {  } });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json() as any;
      return data.self_evaluations.map((e: any) => ({
        id: e.id,
        week: e.week_number,
        date: e.created_at,
        factor1: e.factor1_score,
        factor2: e.factor2_score,
        factor3: e.factor3_score,
        factor4: e.factor4_score,
        total: e.total_score,
        comment: e.comment
      }));
    } catch {
      return ([] as any[]);
    }
  },
  saveSelfEvaluation: async (data: Omit<SelfEvaluation, "id">): Promise<SelfEvaluation> => {
    try {
      const res = await apiFetch('/api/data/self-evals', {
        method: 'POST',
        headers: { "Authorization": `Bearer ${localStorage.getItem("auth_token")}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: 'user-001',
          week_number: data.week,
          factor1: data.factor1,
          factor2: data.factor2,
          factor3: data.factor3,
          factor4: data.factor4,
                    comment: data.comment
        })
      });
      if (res.ok) {
        return { id: 'ok', ...data } as SelfEvaluation;
      }
    } catch {}
    
throw new Error("Failed to save self evaluation");
  },

  

  // ── ゴール履歴 ──
  getGoalHistory: async (): Promise<GoalEntry[]> => {
    const user = JSON.parse(localStorage.getItem("user_info") || "{}");
    const userId = user.id || "user-001";
    const res = await apiFetch(`/api/data/goals/${userId}`, { headers: {  } });
    if (!res.ok) throw new Error("Failed to fetch goals");
    const data = await res.json() as any;
    return data.goals || [];
  },
  createGoal: async (data: { week: number; goal_text: string; is_smart: boolean }): Promise<GoalEntry> => {
    const user = JSON.parse(localStorage.getItem("user_info") || "{}");
    const res = await apiFetch("/api/data/goals", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: user.id || "user-001",
        week_number: data.week,
        goal_text: data.goal_text,
        is_smart: data.is_smart
      })
    });
    if (!res.ok) throw new Error("Failed to create goal");
    return await res.json();
  },
  updateGoal: async (id: string, data: Partial<GoalEntry>): Promise<GoalEntry> => {
    const res = await apiFetch(`/api/data/goals/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to update goal");
    return await res.json();
  },

  // ── チャット ──
  // 全チャットセッション一覧
  getAllChatSessions: async (): Promise<ChatSession[]> => {
    try {
      const user = apiClient.getCurrentUser();
      if (!user || !user.id) return [];
      
      const res = await apiFetch(`/api/data/chat-sessions?student_id=${user.id}`);
      if (!res.ok) return [];
      const data = await res.json() as any;
      return data.sessions || [];
    } catch {
      return [];
    }
  },
  getChatSession: async (journalId: string): Promise<ChatSession> => {
    const res = await apiFetch(`/api/data/chat-sessions/${journalId}`, { headers: {  } });
    if (!res.ok) {
      if (res.status === 404) {
        return { id: "new", journal_id: journalId, phase: "phase1", messages: [], created_at: new Date().toISOString() };
      }
      throw new Error("Failed to fetch chat session");
    }
    return await res.json();
  },
  sendChatMessage: async (journalId: string, content: string): Promise<{ session: ChatSession; reply: ChatMessage }> => {
    // Note: ChatBotPage directly fetches from OpenAI in standard flow, this mock fallback won't be heavily used
    return { session: { id: "new", journal_id: journalId, phase: "phase1", messages: [], created_at: new Date().toISOString() }, reply: { id: "r", role: "assistant", content: "dummy", timestamp: new Date().toISOString() } };
  },

  // ── コーホート ──
  getCohortProfiles: async (): Promise<any[]> => {
    const user = JSON.parse(localStorage.getItem("user_info") || "{}");
    const role = user.role || "researcher";
    try {
      const res = await apiFetch('/api/data/cohorts', { headers: {  } });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json() as any;
      return data.cohorts || [];
    } catch { return []; }
  },

  // ── ユーザー管理（管理者用）──
  getRegisteredUsers: async (): Promise<User[]> => {
    try {
      const res = await apiFetch('/api/data/users', { headers: {  } });
      if (!res.ok) return [];
      const data = await res.json() as any;
      return data.users || [];
    } catch {
      return [];
    }
  },
  createUser: async (user: Omit<User, "id">): Promise<User> => {
    const res = await apiFetch("/api/data/users", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user)
    });
    if (!res.ok) throw new Error("Failed to create user");
    const data = await res.json() as any;
    return data.user;
  },
  updateUser: async (id: string, data: Partial<User>): Promise<User> => {
    const res = await apiFetch(`/api/data/users/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to update user");
    const resData = (await res.json()) as any;
    return resData.user;
  },
  deleteUser: async (id: string): Promise<void> => {
    const res = await apiFetch(`/api/data/users/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${localStorage.getItem('auth_token')}` } });
    if (!res.ok) throw new Error("Failed to delete user");
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
      const response = await apiFetch("/api/data/bland-altman-results", { method: "POST", headers: { "Content-Type": "application/json" },
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
      const response = await apiFetch(`/api/data/reliability-results/${runId}`, { headers: {  } });
      if (!response.ok) throw new Error("Failed to fetch reliability details");
      const data: any = await response.json();
      return data.details || [];
    } catch (err) {
      console.error("API error fetching reliability details:", err);
      throw err;
    }
  },
  
  // RQ3b APIs
  saveRq3bOutcomes: async (outcomes: any) => {
    const user = JSON.parse(localStorage.getItem("user_info") || "{}");
    const authHeader = btoa(JSON.stringify({ id: user.id, role: user.role }));
    try {
      const response = await apiFetch('/api/data/rq3b/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authHeader}`
        },
        body: JSON.stringify(outcomes),
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to save RQ3b outcomes:', error);
      return { success: false, error };
    }
  },
  
  getRq3bOutcomes: async (userId: string) => {
    const user = JSON.parse(localStorage.getItem("user_info") || "{}");
    const authHeader = btoa(JSON.stringify({ id: user.id, role: user.role }));
    try {
      const response = await apiFetch(`/api/data/rq3b/responses/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authHeader}`
        }
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to get RQ3b outcomes:', error);
      return { success: false, error };
    }
  },

  getSavedReliabilityResults: async () => {
    try {
      const response = await apiFetch("/api/data/reliability-results", { headers: {  } });
      if (!response.ok) throw new Error("Failed to fetch reliability results");
      const data: any = await response.json();
      return data.results || [];
    } catch (err) {
      console.error("API error fetching reliability results:", err);
      throw err;
    }
  },

  // SCAT API
  getScatProjects: async () => {
    const res = await apiFetch('/api/data/scat/projects', { headers: {  } });
    if (!res.ok) throw new Error('Failed to fetch projects');
    return res.json();
  },
  createScatProject: async (title: string, description: string, created_by: string) => {
    const res = await apiFetch('/api/data/scat/projects', {
      method: 'POST',
      headers: { "Authorization": `Bearer ${localStorage.getItem("auth_token")}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, created_by })
    });
    if (!res.ok) throw new Error('Failed to create project');
    return res.json();
  },
  getScatSegments: async (projectId: string) => {
    const res = await apiFetch(`/api/data/scat/projects/${projectId}/segments`, { headers: {  } });
    if (!res.ok) throw new Error('Failed to fetch segments');
    return res.json();
  },
  createScatSegments: async (projectId: string, segments: any[]) => {
    const res = await apiFetch('/api/data/scat/segments', {
      method: 'POST',
      headers: { "Authorization": `Bearer ${localStorage.getItem("auth_token")}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, segments })
    });
    if (!res.ok) throw new Error('Failed to save segments');
    return res.json();
  },
  getScatCodes: async (projectId: string) => {
    const res = await apiFetch(`/api/data/scat/projects/${projectId}/codes`, { headers: {  } });
    if (!res.ok) throw new Error('Failed to fetch codes');
    return res.json();
  },
  saveScatCode: async (codeData: any) => {
    const res = await apiFetch('/api/data/scat/codes', {
      method: 'POST',
      headers: { "Authorization": `Bearer ${localStorage.getItem("auth_token")}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(codeData)
    });
    if (!res.ok) throw new Error('Failed to save code');
    return res.json();
  }
};

export default apiClient;

export const bfiApi = {
  
  saveResponses: async (userId: string, responses: Record<number, number>) => {
    
    const user = JSON.parse(localStorage.getItem("user_info") || "{}");
    const authHeader = btoa(JSON.stringify({ id: user.id, role: user.role }));
    try {
      const res = await apiFetch('/api/data/bfi/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authHeader}`
        },
        body: JSON.stringify({ userId, responses })
      });
      return await res.json();
    } catch (e) {
      console.error(e);
      return { success: false };
    }
  },
  getResponses: async (userId: string) => {
    
    const user = JSON.parse(localStorage.getItem("user_info") || "{}");
    const authHeader = btoa(JSON.stringify({ id: user.id, role: user.role }));
    try {
      const res = await apiFetch(`/api/data/bfi/responses/${userId}`, {
        headers: {
          'Authorization': `Bearer ${authHeader}`
        }
      });
      const data: any = await res.json();
      return data.responses || {};
    } catch (e) {
      console.error(e);
      return {};
    }
  }
};

export async function getCleanupMetrics(range: "7d" | "30d"): Promise<CleanupMetricsResponse> {
  const res = await apiFetch(`/api/admin/metrics/cleanup?range=${range}`);
  if (!res.ok) throw new Error("Failed to fetch cleanup metrics");
  return res.json();
}

export async function getCleanupFailureAlert(): Promise<CleanupFailureAlertResponseWithAck> {
  const res = await apiFetch(`/api/admin/alerts/cleanup-failure`);
  if (!res.ok) throw new Error("Failed to fetch cleanup failure alert");
  return res.json();
}

export async function dismissCleanupFailureAlert(fingerprint: string): Promise<{ ok: boolean }> {
  const res = await apiFetch(`/api/admin/alerts/cleanup-failure/dismiss`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fingerprint }),
  });
  if (!res.ok) throw new Error("Failed to dismiss alert");
  return res.json();
}

export async function getCleanupAlertHistory(query: any): Promise<any> {
  const params = new URLSearchParams();
  if (query) {
    if (query.range) params.append('range', query.range);
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.eventTypes) params.append('eventTypes', query.eventTypes);
    if (query.severities) params.append('severities', query.severities);
    if (query.channels) params.append('channels', query.channels);
    if (query.outcomes) params.append('outcomes', query.outcomes);
    if (query.reasonQuery) params.append('reasonQuery', query.reasonQuery);
    if (query.fingerprintPrefix) params.append('fingerprintPrefix', query.fingerprintPrefix);
    if (query.actorUserId) params.append('actorUserId', query.actorUserId);
    if (query.sort) params.append('sort', query.sort);
    if (query.cursor) params.append('cursor', query.cursor);
    if (query.dateFrom) params.append('dateFrom', query.dateFrom);
    if (query.dateTo) params.append('dateTo', query.dateTo);
  } else {
    params.append('range', '30d');
    params.append('limit', '50');
  }

  const res = await apiFetch(`/api/admin/alerts/history?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch alert history");
  const data = await res.json() as any;
  
  if (!data.items) {
    return {
      items: data.history || [],
      pageInfo: { nextCursor: null, hasNextPage: false },
      summary: { totalMatched: 0, notifySent: 0, notifySuppressed: 0, dismissed: 0, alertGenerated: 0, failedCount: 0 },
      filtersApplied: {}
    };
  }
  return data;
}

export async function acknowledgeCleanupFailureAlert(fingerprint: string, status: "acknowledged" | "investigating" | "resolved", note?: string): Promise<any> {
  const res = await apiFetch(`/api/admin/alerts/cleanup-failure/acknowledge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fingerprint, status, note }),
  });
  if (!res.ok) {
    throw new Error(`Failed to acknowledge cleanup alert: ${res.status}`);
  }
  return res.json();
}
