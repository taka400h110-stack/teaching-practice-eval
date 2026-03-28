// ──────────────────────────────────────────────
// ユーザー・認証
// ──────────────────────────────────────────────
export type UserRole =
  | "student"
  | "teacher"
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
  roles: UserRole[]; // 複数兼任対応
  // 実習生専用フィールド
  student_number?: string;    // 学籍番号
  grade?: number;             // 学年（1-4）
  school_type?: "elementary" | "middle" | "high" | "special";  // 校種
  internship_type?: "intensive" | "distributed";               // 実習形態
  weeks?: number;             // 実習週数
  // 実習生以外のフィールド
  organization?: string;      // 所属機関
  position?: string;          // 役職
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
  id:                     string;
  student_id:             string;
  title:                  string;
  content:                string;
  reflection_text:        string;
  entry_date:             string;
  status:                 JournalStatus;
  week_number:            number;
  ocr_source?:            string;
  ocr_confidence?:        number;
  student_grade?:         number;           // 実習生の学年（1-4）
  // コメント分岐：1-3年→大学教員コメント / 4年→実習先コメント
  univ_teacher_comment?:  string;           // 大学教員コメント（1-3年生用）
  school_mentor_comment?: string;           // 実習先コメント（4年生用）
  teacher_comment?:       string;           // 後方互換（既存データ）
  subject?:               string;
  lesson_goal?:           string;
  students_observation?:  string;
  difficulty?:            string;
  devise?:                string;
  next_action?:           string;
  hour_records?:          HourRecord[];
}

export interface JournalCreateRequest {
  title:           string;
  content:         string;
  reflection_text: string;
  entry_date:      string;
  week_number:     number;
  status:          JournalStatus;
  ocr_source?:     string;
  ocr_confidence?: number;
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
  rdLevel?:  number;
  rdReason?: string;
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
  student_number:    string;   // 学籍番号
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

// ──────────────────────────────────────────────
// ユーザー登録フォーム（学生以外の役割）
// ──────────────────────────────────────────────
export interface UserRegistration {
  email:        string;
  name:         string;
  roles: UserRole[]; // 複数兼任対応
  affiliation?: string;  // 所属機関
  department?:  string;  // 学部・専攻
  position?:    string;  // 職位
  notes?:       string;  // 備考
}

export interface CloudflareBindings {
  DB: any;
  STAT_API_URL?: string;
}
