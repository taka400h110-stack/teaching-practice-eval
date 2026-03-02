/**
 * src/api/client.ts
 * モックAPIクライアント（将来的に実際のバックエンドに差し替え可能）
 */
import {
  MOCK_JOURNALS, MOCK_EVALUATION_RESULT, MOCK_GROWTH_DATA,
  MOCK_SELF_EVALUATIONS, MOCK_LPS_DATA, MOCK_GOAL_HISTORY,
  MOCK_CHAT_SESSION, MOCK_COHORT_PROFILES,
} from "../mocks/mockData";
import type {
  JournalEntry, EvaluationResult, GrowthData, SelfEvaluation,
  LpsWeek, GoalEntry, ChatSession,
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

const mockApi = {
  // ── 認証 ──
  login: async (email: string, _password: string) => {
    await delay();
    if (!email.includes("@")) throw new Error("Invalid credentials");
    const user = { id: "user-001", email, name: "山田 太郎", role: "admin" as const };
    localStorage.setItem("user_info", JSON.stringify(user));
    localStorage.setItem("auth_token", "mock-token-001");
    return user;
  },
  logout: async () => {
    await delay(100);
    localStorage.removeItem("user_info");
    localStorage.removeItem("auth_token");
  },
  getCurrentUser: () => {
    const raw = localStorage.getItem("user_info");
    return raw ? JSON.parse(raw) : null;
  },
  isAuthenticated: () => !!localStorage.getItem("auth_token"),

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
    if (idx < 0) throw new Error(`Journal ${id} not found`);
    journals[idx] = { ...journals[idx], ...data } as JournalEntry;
    saveJournals(journals);
    return journals[idx];
  },
  deleteJournal: async (id: string): Promise<void> => {
    await delay();
    const journals = getJournals().filter((j) => j.id !== id);
    saveJournals(journals);
  },

  // ── 評価 ──
  getEvaluation: async (journalId: string): Promise<EvaluationResult> => {
    await delay(500);
    return { ...MOCK_EVALUATION_RESULT, journal_id: journalId };
  },

  // ── 成長データ ──
  getGrowthData: async (): Promise<GrowthData> => {
    await delay();
    return MOCK_GROWTH_DATA;
  },

  // ── 自己評価 ──
  getSelfEvaluations: async (): Promise<SelfEvaluation[]> => {
    await delay();
    return MOCK_SELF_EVALUATIONS;
  },

  // ── LPS ──
  getLpsData: async (): Promise<LpsWeek[]> => {
    await delay();
    return MOCK_LPS_DATA;
  },

  // ── ゴール履歴 ──
  getGoalHistory: async (): Promise<GoalEntry[]> => {
    await delay();
    return MOCK_GOAL_HISTORY;
  },

  // ── チャット ──
  getChatSession: async (journalId: string): Promise<ChatSession> => {
    await delay();
    return { ...MOCK_CHAT_SESSION, journal_id: journalId };
  },

  // ── コーホート ──
  getCohortProfiles: async () => {
    await delay();
    return MOCK_COHORT_PROFILES;
  },
};

export default mockApi;
