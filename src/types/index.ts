// ──────────────────────────────────────────────
// ユーザー・認証
// ──────────────────────────────────────────────
export type UserRole =
  | "student"
  | "univ_teacher"
  | "school_mentor"
  | "board_observer"
  | "researcher"
  | "collaborator"
  | "admin"
  | "evaluator";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// ──────────────────────────────────────────────
// 日誌
// ──────────────────────────────────────────────
export type JournalStatus = "draft" | "submitted" | "evaluated";

export interface HourRecord {
  id:          string;
  order:       number;
  time_label:  string;
  time_start:  string;
  time_end:    string;
  subject:     string;
  lesson_goal: string;
  body:        string;
  difficulty:  string;
  devise:      string;
}

export interface JournalEntry {
  id:                   string;
  student_id:           string;
  title:                string;
  content:              string;
  reflection_text:      string;
  entry_date:           string;
  status:               JournalStatus;
  week_number:          number;
  teacher_comment?:     string;
  subject?:             string;
  lesson_goal?:         string;
  students_observation?: string;
  difficulty?:          string;
  devise?:              string;
  next_action?:         string;
  hour_records?:        HourRecord[];
}

export interface JournalCreateRequest {
  title:           string;
  content:         string;
  reflection_text: string;
  entry_date:      string;
  week_number:     number;
  status:          JournalStatus;
}

export interface JournalListResponse {
  items: JournalEntry[];
  total: number;
  page:  number;
  page_size: number;
}

// ──────────────────────────────────────────────
// 評価
// ──────────────────────────────────────────────
export interface FactorScores {
  factor1: number;
  factor2: number;
  factor3: number;
  factor4: number;
}

export interface EvaluationItem {
  item_number:    number;
  factor:         string;
  is_evaluated:   boolean;
  score:          number | null;
  evidence:       string;
  feedback:       string;
  next_level_advice: string;
}

export interface EvaluationResult {
  id:                    string;
  journal_id:            string;
  status:                "pending" | "completed" | "failed";
  overall_comment:       string;
  total_score:           number;
  factor_scores:         FactorScores;
  evaluation_items:      EvaluationItem[];
  evaluated_item_count:  number;
  tokens_used:           number;
  halo_check:            boolean;
}

// ──────────────────────────────────────────────
// 成長データ
// ──────────────────────────────────────────────
export interface WeeklyScore {
  week:    number;
  factor1: number;
  factor2: number;
  factor3: number;
  factor4: number;
  total:   number;
}

export interface GrowthData {
  student_id:    string;
  weekly_scores: WeeklyScore[];
}

// ──────────────────────────────────────────────
// 自己評価
// ──────────────────────────────────────────────
export interface SelfEvaluation {
  id:        string;
  week:      number;
  factor1:   number;
  factor2:   number;
  factor3:   number;
  factor4:   number;
  total:     number;
  comment?:  string;
}

// ──────────────────────────────────────────────
// チャット
// ──────────────────────────────────────────────
export type ChatPhase = "phase0" | "phase1" | "bridge" | "phase2" | "completed";

export interface ChatMessage {
  id:        string;
  role:      "user" | "assistant";
  content:   string;
  timestamp: string;
}

export interface ChatSession {
  id:          string;
  journal_id:  string;
  phase:       ChatPhase;
  messages:    ChatMessage[];
  created_at:  string;
}

// ──────────────────────────────────────────────
// コーホート（BigFive含む）
// ──────────────────────────────────────────────
export interface BigFiveScores {
  extraversion:      number;
  agreeableness:     number;
  conscientiousness: number;
  neuroticism:       number;
  openness:          number;
  measured_at:       string;
}

export interface StudentProfile {
  id:                string;
  name:              string;
  gender:            "male" | "female" | "other";
  grade:             number;
  school_type:       "elementary" | "middle" | "high" | "special";
  internship_type:   "intensive" | "distributed";
  weeks:             number;
  school_name:       string;
  supervisor:        string;
  big_five:          BigFiveScores;
  final_factor1:     number;
  final_factor2:     number;
  final_factor3:     number;
  final_factor4:     number;
  final_total:       number;
  growth_delta:      number;
  self_eval_gap:     number;
  lps:               number;
  weekly_scores:     WeeklyScore[];
}

// ──────────────────────────────────────────────
// LPSデータ
// ──────────────────────────────────────────────
export interface LpsWeek {
  week:           number;
  lps:            number;
  self_eval:      number;
  ai_eval:        number;
  growth_rate:    number;
}

// ──────────────────────────────────────────────
// ゴール履歴
// ──────────────────────────────────────────────
export interface GoalEntry {
  id:          string;
  week:        number;
  goal_text:   string;
  is_smart:    boolean;
  achieved:    boolean;
  created_at:  string;
}
