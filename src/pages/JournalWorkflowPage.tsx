// @ts-nocheck
/**
 * JournalWorkflowPage.tsx
 * 実習日誌ワークフロー — ① 日誌記入 → ② AI評価確認 → ③ チャット・目標設定
 * 3つのステップをタブ形式でひとまとめにしたページ
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box, Button, Card, CardContent, Chip, CircularProgress,
  Divider, IconButton, Paper, TextField, Typography, Avatar,
  Tab, Tabs, Stepper, Step, StepLabel, StepButton,
  Alert, Snackbar, Tooltip, Collapse, LinearProgress,
  Accordion, AccordionSummary, AccordionDetails,
  Grid, Select, MenuItem, FormControl, InputLabel, Dialog,
  DialogTitle, DialogContent, List, ListItemButton, ListItemText,
  ListItemAvatar,
} from "@mui/material";
// icons
import MenuBookIcon        from "@mui/icons-material/MenuBook";
import AssessmentIcon      from "@mui/icons-material/Assessment";
import ChatIcon            from "@mui/icons-material/Chat";
import SaveIcon            from "@mui/icons-material/Save";
import SendIcon            from "@mui/icons-material/Send";
import ArrowBackIcon       from "@mui/icons-material/ArrowBack";
import HistoryIcon         from "@mui/icons-material/History";
import AddCircleIcon       from "@mui/icons-material/AddCircle";
import DeleteOutlineIcon   from "@mui/icons-material/DeleteOutline";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import DragIndicatorIcon   from "@mui/icons-material/DragIndicator";
import ExpandMoreIcon      from "@mui/icons-material/ExpandMore";
import ExpandLessIcon      from "@mui/icons-material/ExpandLess";
import AccessTimeIcon      from "@mui/icons-material/AccessTime";
import SmartToyIcon        from "@mui/icons-material/SmartToy";
import PersonIcon          from "@mui/icons-material/Person";
import TrackChangesIcon    from "@mui/icons-material/TrackChanges";
import CheckCircleIcon     from "@mui/icons-material/CheckCircle";
import LightbulbIcon       from "@mui/icons-material/Lightbulb";
import AutoAwesomeIcon     from "@mui/icons-material/AutoAwesome";
import RefreshIcon         from "@mui/icons-material/Refresh";
import PsychologyIcon      from "@mui/icons-material/Psychology";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import mockApi from "../api/client";
import type { JournalEntry, JournalCreateRequest, HourRecord, ChatMessage } from "../types";
import {
  REFLECTION_DEPTH_LEVELS,
  RUBRIC_ITEMS,
  getItemsByFactor,
  RUBRIC_FACTORS as _RUBRIC_FACTORS,
} from "../constants/rubric";

// ═══════════════════════════════════════════
// ① 日誌エディタ 共通ユーティリティ
// ═══════════════════════════════════════════
let _id = 0;
const newId = () => `hr-${Date.now()}-${_id++}`;

function makeEmpty(order: number, preset?: Partial<HourRecord>): HourRecord {
  return {
    id: newId(), order,
    time_label: preset?.time_label ?? `${order + 1}時限`,
    time_start: preset?.time_start ?? "",
    time_end:   preset?.time_end ?? "",
    subject:    preset?.subject ?? "",
    lesson_goal: "", body: preset?.body ?? "", difficulty: "", devise: "",
  };
}

function recordsToContent(records: HourRecord[], reflection: string): string {
  return JSON.stringify({ version: 2, records, reflection });
}

function contentToRecords(content: string): { records: HourRecord[]; reflection: string } {
  if (!content) return { records: [makeEmpty(0)], reflection: "" };
  try {
    const p = JSON.parse(content);
    if (p.version === 2 && Array.isArray(p.records)) {
      return { records: [...p.records].sort((a, b) => a.order - b.order), reflection: p.reflection ?? "" };
    }
  } catch {}
  return { records: [makeEmpty(0, { time_label: "授業記録", body: content })], reflection: "" };
}

const PRESETS = [
  { label: "朝の会",        time_start: "08:15", time_end: "08:30" },
  { label: "1時限",         time_start: "08:30", time_end: "09:15" },
  { label: "2時限",         time_start: "09:20", time_end: "10:05" },
  { label: "休み時間",      time_start: "10:05", time_end: "10:25" },
  { label: "3時限",         time_start: "10:25", time_end: "11:10" },
  { label: "4時限",         time_start: "11:15", time_end: "12:00" },
  { label: "給食・昼休み",  time_start: "12:00", time_end: "13:20" },
  { label: "5時限",         time_start: "13:25", time_end: "14:10" },
  { label: "6時限",         time_start: "14:15", time_end: "15:00" },
  { label: "帰りの会・清掃",time_start: "15:05", time_end: "15:30" },
  { label: "放課後",        time_start: "15:30", time_end: "17:00" },
];

function blockBg(label: string) {
  if (label.includes("朝")) return "#FFF3E0";
  if (label.includes("休み")) return "#E8F5E9";
  if (label.includes("給食") || label.includes("昼")) return "#FCE4EC";
  if (label.includes("帰り") || label.includes("清掃")) return "#EDE7F6";
  if (label.includes("放課後")) return "#E3F2FD";
  return "#F5F5F5";
}
function blockAccent(label: string) {
  if (label.includes("朝")) return "#FF9800";
  if (label.includes("休み")) return "#4CAF50";
  if (label.includes("給食") || label.includes("昼")) return "#E91E63";
  if (label.includes("帰り") || label.includes("清掃")) return "#7B1FA2";
  if (label.includes("放課後")) return "#1976D2";
  return "#455A64";
}

// ─── 1ブロック ───
interface BlockProps {
  record: HourRecord; index: number; total: number;
  onChange:    (id: string, field: keyof HourRecord, value: string) => void;
  onDelete:    (id: string) => void;
  onMoveUp:    (id: string) => void;
  onMoveDown:  (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver:  (e: React.DragEvent) => void;
  onDrop:      (e: React.DragEvent, id: string) => void;
  isDraggingOver: boolean;
}

function HourBlock({ record, index, total, onChange, onDelete, onMoveUp, onMoveDown, onDragStart, onDragOver, onDrop, isDraggingOver }: BlockProps) {
  const [expanded, setExpanded] = useState(true);
  const accent = blockAccent(record.time_label);
  const bg     = blockBg(record.time_label);

  return (
    <Box
      draggable
      onDragStart={(e) => onDragStart(e, record.id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, record.id)}
      sx={{ border: isDraggingOver ? `2px dashed ${accent}` : "2px solid transparent", borderRadius: 2, mb: 1.5, transition: "border 0.15s" }}
    >
      <Card sx={{ bgcolor: bg, borderLeft: `5px solid ${accent}`, boxShadow: isDraggingOver ? 4 : 1, cursor: "grab" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1.5, py: 0.8, borderBottom: expanded ? "1px solid" : "none", borderColor: "divider" }}>
          <DragIndicatorIcon sx={{ color: "text.disabled", mr: 0.5, fontSize: 18 }} />
          <Box sx={{ minWidth: 22, height: 22, borderRadius: "50%", bgcolor: accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
            {index + 1}
          </Box>
          <TextField value={record.time_label} onChange={(e) => onChange(record.id, "time_label", e.target.value)}
            size="small" variant="standard" placeholder="コマ名"
            sx={{ width: 100, "& input": { fontWeight: 700, fontSize: 13 } }}
            onClick={(e) => e.stopPropagation()} />
          <AccessTimeIcon sx={{ fontSize: 13, color: "text.secondary", ml: 0.5 }} />
          <TextField value={record.time_start} onChange={(e) => onChange(record.id, "time_start", e.target.value)}
            size="small" variant="standard" type="time"
            sx={{ width: 72, "& input": { fontSize: 12 } }}
            onClick={(e) => e.stopPropagation()} />
          <Typography variant="caption" color="text.secondary">〜</Typography>
          <TextField value={record.time_end} onChange={(e) => onChange(record.id, "time_end", e.target.value)}
            size="small" variant="standard" type="time"
            sx={{ width: 72, "& input": { fontSize: 12 } }}
            onClick={(e) => e.stopPropagation()} />
          <TextField value={record.subject} onChange={(e) => onChange(record.id, "subject", e.target.value)}
            size="small" variant="standard" placeholder="教科・活動"
            sx={{ width: 100, ml: 1, "& input": { fontSize: 12 } }}
            onClick={(e) => e.stopPropagation()} />
          <Box sx={{ ml: "auto", display: "flex", gap: 0.3, alignItems: "center" }}>
            {record.body.length > 0 && (
              <Chip label={`${record.body.length}字`} size="small" sx={{ fontSize: 9, height: 16 }} variant="outlined" />
            )}
            <Tooltip title="上へ"><span>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onMoveUp(record.id); }} disabled={index === 0}>
                <KeyboardArrowUpIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </span></Tooltip>
            <Tooltip title="下へ"><span>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onMoveDown(record.id); }} disabled={index === total - 1}>
                <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </span></Tooltip>
            <IconButton size="small" onClick={() => setExpanded((v) => !v)}>
              {expanded ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
            </IconButton>
            <Tooltip title="削除">
              <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); onDelete(record.id); }}>
                <DeleteOutlineIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Collapse in={expanded}>
          <CardContent sx={{ pt: 1.5, pb: "12px !important" }}>
            <TextField
              value={record.body}
              onChange={(e) => onChange(record.id, "body", e.target.value)}
              placeholder="授業の内容・活動の様子を記録…"
              fullWidth multiline minRows={3} size="small"
              sx={{ bgcolor: "#fff" }}
              helperText={`${record.body.length} 文字`}
            />
          </CardContent>
        </Collapse>
      </Card>
    </Box>
  );
}

// ═══════════════════════════════════════════
// ② AI評価 定数
// ═══════════════════════════════════════════
const FACTOR_LABELS = ["児童生徒への指導力", "自己評価力", "学級経営力", "職務を理解して行動する力"] as const;
const FACTOR_COLORS = ["#1976d2", "#388e3c", "#f57c00", "#7b1fa2"] as const;
const FACTOR_KEYS   = ["factor1", "factor2", "factor3", "factor4"] as const;

// ═══════════════════════════════════════════
// ③ チャット 定数・ユーティリティ
// ═══════════════════════════════════════════
const PHASE_LABELS: Record<string, { label: string; color: string; suggestions: string[] }> = {
  phase0:    { label: "Phase 0: 自由記述",    color: "#607d8b",
    suggestions: ["今日の実習で印象に残ったことは？", "うまくいったことを教えてください", "難しかった場面は？"] },
  phase1:    { label: "Phase 1: 省察深化",    color: "#1976d2",
    suggestions: ["なぜその授業展開を選びましたか？", "児童の反応はどうでしたか？", "改善できる点は何だと思いますか？"] },
  bridge:    { label: "Bridge: 省察→目標",    color: "#f57c00",
    suggestions: ["今日の経験で気づいた自分の課題は？", "次週に向けて改善したいことは？", "ルーブリックのどの因子が課題ですか？"] },
  phase2:    { label: "Phase 2: SMART目標",   color: "#388e3c",
    suggestions: ["SMART目標として具体化しましょう", "達成度の測定方法は？", "いつまでに達成しますか？"] },
  completed: { label: "完了: 目標設定完了",   color: "#9c27b0",
    suggestions: ["目標を保存しましょう", "来週の実習頑張ってください！"] },
};

// ────────────────────────────────────────────
// 省察深さレベル（rubric.ts から統一インポート）
// 2026-03-07: 全4因子・全23項目に共通適用
// ────────────────────────────────────────────
// REFLECTION_DEPTH_LEVELS は rubric.ts からインポート済み

function estimateReflectionDepth(text: string): number {
  const lower = text;
  if (lower.includes("なぜなら") && (lower.includes("社会") || lower.includes("倫理") || lower.includes("価値観"))) return 5;
  if (lower.includes("なぜなら") || lower.includes("なぜ") || lower.includes("理由は")) {
    if (lower.includes("視点") || lower.includes("考え方") || lower.includes("一方")) return 4;
    return 3;
  }
  if (lower.includes("思う") || lower.includes("感じた") || lower.includes("気づいた")) return 2;
  return 1;
}

function generateCoTResponse(userMsg: string, rdLevel: number): string {
  const lower = userMsg;
  if (lower.includes("特別支援") || lower.includes("配慮") || lower.includes("インクルーシブ")) {
    if (rdLevel <= 2) return `ルーブリック F1（児童生徒への指導力）に関連する内容ですね。\n\nその場面で、あなたはなぜその支援方法を選びましたか？児童の背景をどのように把握していましたか？[RD-${rdLevel} → もう少し掘り下げましょう]`;
    return `F1の視点からの深い省察ですね。\n\nその支援の背景にある理念（インクルーシブ教育の原則など）と実践がどう結びついているかを次の目標に反映できますか？[RD-${rdLevel}]`;
  }
  if (lower.includes("授業") || lower.includes("教材") || lower.includes("学習目標") || lower.includes("指導")) {
    if (rdLevel <= 2) return `ルーブリック F2（自己評価力）に関連しますね。\n\nその体験から、あなた自身の指導や姿勢についてどんな気づきがありましたか？[RD-${rdLevel}]`;
    return `F2（自己評価力）の観点から深い省察ができています。\n\nSMART目標として具体化しましょう。「第〇週までに〇〇を実施し、自己評価力の平均〇点以上を目指す」[RD-${rdLevel}]`;
  }
  if (lower.includes("学級") || lower.includes("児童") || lower.includes("生徒") || lower.includes("クラス")) {
    if (rdLevel <= 2) return `ルーブリック F3（学級経営力）の視点ですね。\n\n学級の雰囲気や児童間の関係性について、どのような変化を感じましたか？[RD-${rdLevel}]`;
    return `F3（学級経営力）の深い省察ですね。学級経営の改善に向けた具体的なアクションプランを立てましょう。（項目14-17参照）[RD-${rdLevel}]`;
  }
  if (lower.includes("目標") || lower.includes("改善")) {
    return `良い方向性ですね！SMART基準で目標を整理しましょう：\n\n• Specific（具体的）: 何を改善しますか？\n• Measurable（測定可能）: どのルーブリック項目で何点を目指しますか？\n• Achievable（達成可能）: 実習期間内で現実的ですか？\n• Relevant（関連性）: あなたの課題に直結していますか？\n• Time-bound（期限）: 何週目までにやりますか？`;
  }
  if (rdLevel <= 2) {
    return `ありがとうございます。\n\n「なぜそうなったのか」「どうすれば改善できるか」を、ルーブリックの4因子（F1:指導力・F2:自己評価力・F3:学級経営力・F4:職務理解）の観点から振り返ってみましょう。[現在の省察深さ: RD-${rdLevel}]`;
  }
  return `深い省察ができています（RD-${rdLevel}）。\n\nこの洞察を具体的な行動目標に変換するために、次週のSMART目標として書き出してみましょう。`;
}

function MessageBubble({ msg, rdLevel }: { msg: ChatMessage; rdLevel?: number }) {
  const isBot  = msg.role === "assistant";
  const time   = new Date(msg.timestamp).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  const rdInfo = !isBot && rdLevel ? REFLECTION_DEPTH_LEVELS[rdLevel - 1] : null;
  return (
    <Box display="flex" flexDirection={isBot ? "row" : "row-reverse"} alignItems="flex-end" gap={1} mb={1.5}>
      <Avatar sx={{ width: 28, height: 28, flexShrink: 0, bgcolor: isBot ? "primary.main" : "grey.400" }}>
        {isBot ? <SmartToyIcon sx={{ fontSize: 16 }} /> : <PersonIcon sx={{ fontSize: 16 }} />}
      </Avatar>
      <Box sx={{ maxWidth: "80%" }}>
        {rdInfo && (
          <Chip label={rdInfo.label} size="small"
            sx={{ mb: 0.5, bgcolor: rdInfo.color, fontSize: 9, height: 16, display: "block", width: "fit-content", ml: "auto" }} />
        )}
        <Paper sx={{
          p: 1.5, borderRadius: 2,
          borderBottomLeftRadius: isBot ? 0 : 2, borderBottomRightRadius: isBot ? 2 : 0,
          bgcolor: isBot ? "primary.main" : "grey.100", color: isBot ? "white" : "text.primary", boxShadow: 1,
        }}>
          <Typography variant="body2" sx={{ lineHeight: 1.8, whiteSpace: "pre-wrap", fontSize: 13 }}>{msg.content}</Typography>
        </Paper>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.3, textAlign: isBot ? "left" : "right", fontSize: 10 }}>
          {isBot ? "AI省察サポーター" : "あなた"} · {time}
        </Typography>
      </Box>
    </Box>
  );
}

// ═══════════════════════════════════════════
// ステップ定義
// ═══════════════════════════════════════════
const STEPS = [
  { label: "① 日誌記入",       icon: <MenuBookIcon />,   desc: "一日の活動を時限ごとに記録・振り返り" },
  { label: "② AI評価確認",     icon: <AssessmentIcon />, desc: "AIによるルーブリック評価を確認" },
  { label: "③ 省察・目標設定", icon: <ChatIcon />,       desc: "チャットで省察を深め、次週の目標を立てる" },
];

// ═══════════════════════════════════════════
// メインコンポーネント
// ═══════════════════════════════════════════
export default function JournalWorkflowPage() {
  const user = JSON.parse(localStorage.getItem("user_info") || "{}");
  const navigate      = useNavigate();
  const { journalId } = useParams<{ journalId?: string }>();
  const queryClient_  = useQueryClient();

  // ── 共通 ──
  const [step, setStep] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);

  // ── ① 日誌記入 ──
  const isEditMode = !!journalId;
  const [records,    setRecords]    = useState<HourRecord[]>([makeEmpty(0)]);
  const [reflection, setReflection] = useState("");
  const [entryDate,  setEntryDate]  = useState(new Date().toISOString().split("T")[0]);
  const [weekNumber, setWeekNumber] = useState(1);
  const [saveErrors, setSaveErrors] = useState<{ content?: string; date?: string }>({});
  const [snackOpen,  setSnackOpen]  = useState(false);
  const [snackMsg,   setSnackMsg]   = useState("");
  const [savedJournalId, setSavedJournalId] = useState<string | null>(journalId ?? null);
  const dragIdRef    = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // ── ③ チャット ──
  const [messages,   setMessages]  = useState<ChatMessage[]>([]);
  const [rdHistory,  setRdHistory] = useState<number[]>([]);
  const [chatInput,  setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── データ取得 ──
  const { data: existing, isLoading: loadingJournal } = useQuery<JournalEntry>({
    queryKey: ["journal", journalId],
    queryFn:  () => mockApi.getJournal(journalId!) as Promise<JournalEntry>,
    enabled:  !!journalId,
  });

  // 全日誌一覧（過去日誌選択用）
  const { data: allJournals = [] } = useQuery({
    queryKey: ["journals"],
    queryFn:  () => mockApi.getJournals(),
  });

  const { data: allEvals = [] } = useQuery({
    queryKey: ["allEvaluations"],
    queryFn:  () => mockApi.getAllEvaluations(),
  });

  const { data: chatSession } = useQuery({
    queryKey: ["chat", savedJournalId ?? "journal-004"],
    queryFn:  () => mockApi.getChatSession(savedJournalId ?? "journal-004"),
  });

  // 既存データ復元（URLパラメータで日誌を開いた時）
  useEffect(() => {
    if (!existing) return;
    const { records: recs, reflection: ref } = contentToRecords(existing.content);
    setRecords(recs.length > 0 ? recs : [makeEmpty(0)]);
    setReflection(existing.reflection_text || ref);
    setEntryDate(existing.entry_date);
    setWeekNumber(existing.week_number ?? 1);
    // 評価済みの場合はAI評価タブ、提出済みの場合は日誌タブを表示
    if (existing.status === "evaluated") setStep(1);
    else if (existing.status === "submitted") setStep(0);
  }, [existing]);

  

  // チャット初期メッセージ（journalId切り替え時もリセット）
  useEffect(() => {
    setMessages([]);
    setRdHistory([]);
  }, [savedJournalId]);

  useEffect(() => {
    if (chatSession && messages.length === 0) setMessages(chatSession.messages);
  }, [chatSession]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── ① 日誌：保存 ──
  const saveMutation = useMutation<JournalEntry, Error, JournalCreateRequest>({
    mutationFn: async (payload) => {
      if (isEditMode) return mockApi.updateJournal(journalId!, payload as unknown as Record<string, unknown>) as Promise<JournalEntry>;
      return mockApi.createJournal(payload as unknown as Record<string, unknown>) as Promise<JournalEntry>;
    },
    onSuccess: (data, payload) => {
      void queryClient_.invalidateQueries({ queryKey: ["journals"] });
      setSavedJournalId(data.id);
      const isDraft = payload.status === "draft";
      setSnackMsg(isDraft ? "下書きを保存しました" : "日誌を提出しました ✓");
      setSnackOpen(true);
      if (!isDraft) {
        setTimeout(() => setStep(1), 1000); // 提出後は自動的にAI評価タブへ
      }
    },
  });

  const validate = () => {
    const errs: typeof saveErrors = {};
    const totalBody = records.reduce((s, r) => s + r.body.length, 0);
    if (totalBody < 30) errs.content = "記録本文の合計が30文字以上になるよう記入してください";
    if (!entryDate) errs.date = "日付は必須です";
    setSaveErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = (status: "draft" | "submitted") => {
    if (!validate()) return;
    const content = recordsToContent(records, reflection);
    const totalChars = records.reduce((s, r) => s + r.body.length, 0);
    const subject = records.find((r) => r.subject)?.subject ?? "";
    const title = subject ? `第${weekNumber}週 実習日誌（${subject}）` : `第${weekNumber}週 実習日誌`;
    saveMutation.mutate({ title, content, reflection_text: reflection, entry_date: entryDate, week_number: weekNumber, status } as JournalCreateRequest);
  };

  // ── ① 日誌：ブロック操作 ──
  const updateRecord = useCallback((id: string, field: keyof HourRecord, value: string) => {
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    if (saveErrors.content) setSaveErrors((e) => ({ ...e, content: undefined }));
  }, [saveErrors.content]);

  const addRecord  = (preset?: Partial<HourRecord>) => setRecords((prev) => [...prev, makeEmpty(prev.length, preset)]);
  const deleteRecord = (id: string) => setRecords((prev) => prev.filter((r) => r.id !== id).map((r, i) => ({ ...r, order: i })));
  const moveRecord = (id: string, dir: "up" | "down") => {
    setRecords((prev) => {
      const idx  = prev.findIndex((r) => r.id === id);
      const swap = dir === "up" ? idx - 1 : idx + 1;
      if (idx < 0 || swap < 0 || swap >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next.map((r, i) => ({ ...r, order: i }));
    });
  };
  const handleDragStart = (e: React.DragEvent, id: string) => { dragIdRef.current = id; e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const handleDrop      = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const srcId = dragIdRef.current;
    if (!srcId || srcId === targetId) { setDragOverId(null); return; }
    setRecords((prev) => {
      const si = prev.findIndex((r) => r.id === srcId);
      const ti = prev.findIndex((r) => r.id === targetId);
      if (si < 0 || ti < 0) return prev;
      const next = [...prev];
      [next[si], next[ti]] = [next[ti], next[si]];
      return next.map((r, i) => ({ ...r, order: i }));
    });
    setDragOverId(null);
    dragIdRef.current = null;
  };

  // ── ③ チャット：送信 ──
  const sendMessage = async (text?: string) => {
    const content = text ?? chatInput.trim();
    if (!content || chatLoading) return;
    setChatInput("");
    const rdLevel = estimateReflectionDepth(content);
    setRdHistory((prev) => [...prev, rdLevel]);
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);
    await new Promise((r) => setTimeout(r, 700 + Math.random() * 600));
    const botMsg: ChatMessage = { id: `b-${Date.now()}`, role: "assistant", content: generateCoTResponse(content, rdLevel), timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, botMsg]);
    setChatLoading(false);
  };

  // ── 評価データ ──
  const targetJournalId = savedJournalId ?? "journal-004";
  // 過去日誌を選択してワークフローに読み込む
  const loadPastJournal = (j: JournalEntry) => {
    const { records: recs, reflection: ref } = contentToRecords(j.content);
    setRecords(recs.length > 0 ? recs : [makeEmpty(0)]);
    setReflection(j.reflection_text || ref);
    setEntryDate(j.entry_date);
    setWeekNumber(j.week_number ?? 1);
    setSavedJournalId(j.id);
    setHistoryOpen(false);
    setStep(j.status === "evaluated" ? 1 : 0);
  };

  const evalData = allEvals.find((e) => e.journal_id === targetJournalId) ?? allEvals[0];
  const radarData = evalData ? FACTOR_KEYS.map((k, i) => ({
    factor: FACTOR_LABELS[i],
    score:  evalData.factor_scores[k] ?? 0,
    full:   4,
  })) : [];

  const phase    = chatSession?.phase ?? "phase1";
  const phaseCfg = PHASE_LABELS[phase] ?? PHASE_LABELS.phase1;
  const currentRd = rdHistory.length > 0 ? rdHistory[rdHistory.length - 1] : 0;

  // ── 完成度バッジ ──
  const totalBody   = records.reduce((s, r) => s + r.body.length, 0);
  const hasRefl     = reflection.length >= 20;
  // RQ3b: GA-Evidence and SI-Focus Calculation
  useEffect(() => {
    if (step === 1 && evalData && user?.id && weekNumber > 1) {
      const processRq3b = async () => {
        try {
          // 1. Fetch previous outcomes and goals
          const outcomesRes = await mockApi.getRq3bOutcomes(user.id);
          const outcomes = outcomesRes.data || [];
          const prevOutcome = outcomes.find((o: any) => o.week_number === weekNumber - 1);
          
          if (!prevOutcome) return;
          
          const goals = await mockApi.getGoalHistory();
          const prevGoal = goals.find((g: any) => g.id === prevOutcome.goal_id);
          
          const updateData: any = {
            userId: user.id,
            week_number: weekNumber - 1
          };
          
          // 2. SI-Focus calculation
          if (prevOutcome.focus_item_id) {
            // Find current score for the focus item
            const currentItem = (evalData.evaluation_items || []).find((i: any) => i.item_number === prevOutcome.focus_item_id);
            if (currentItem && currentItem.score != null) {
              updateData.current_score = currentItem.score;
              // previous_score should ideally be fetched from previous week's evaluation
              // For now, if we have previous_score, we just update current_score and calculate delta
              const prevScore = prevOutcome.previous_score || 0; // fallback
              updateData.delta_score = currentItem.score - prevScore;
            }
          }
          
          // 3. GA-Evidence logic (Real AI judgement based on Journal and previous Goal)
          if (prevGoal && prevOutcome.ga_evidence_binary == null) {
            try {
              const authHeader = btoa(JSON.stringify({ id: user.id, role: user.role }));
              const res = await fetch("/api/ai/check-evidence", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authHeader}` },
                body: JSON.stringify({
                  previous_goal: prevGoal.goal_text,
                  // journal_content: evalData.journal_content || records.map((r: any) => r.body).join("\n")
                })
              });
              const evData = await res.json();
              if (evData.success) {
                updateData.ga_evidence_binary = evData.result.evidence_binary;
                updateData.ga_evidence_reason = evData.result.reason;
              }
            } catch (e) {
              console.error("GA-Evidence check failed", e);
            }
          }
          
          // Save only if there's new data
          if (Object.keys(updateData).length > 2) {
            await mockApi.saveRq3bOutcomes(updateData);
          }
          
        } catch (e) {
          console.error("Failed to process RQ3b automated outcomes", e);
        }
      };
      
      processRq3b();
    }
  }, [step, evalData, user, weekNumber]);

  const hasEval     = !!evalData;
  const hasChatMsg  = messages.length >= 2;
  const completions = [totalBody >= 30, hasRefl, hasEval, hasChatMsg];
  const doneCount   = completions.filter(Boolean).length;

  return (
    <Box sx={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column" }}>
      {/* ── トップバー ── */}
      <Box sx={{
        display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.2,
        bgcolor: "white", borderBottom: "1px solid #e0e0e0", flexShrink: 0,
        flexWrap: "wrap",
      }}>
        <IconButton size="small" onClick={() => navigate("/journals")}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <MenuBookIcon sx={{ color: "#1976d2" }} />
        <Typography variant="subtitle1" fontWeight="bold" sx={{ flex: "1 1 160px" }}>
          {savedJournalId
            ? `第${weekNumber}週 実習日誌`
            : "新しい実習日誌"}
        </Typography>

        {/* 過去の日誌を選ぶボタン */}
        <Tooltip title="過去の日誌を選択して確認・続きを書く">
          <Button
            size="small"
            variant="outlined"
            startIcon={<HistoryIcon />}
            onClick={() => setHistoryOpen(true)}
            sx={{ fontSize: 11, flexShrink: 0 }}
          >
            過去の日誌
          </Button>
        </Tooltip>

        <Chip
          label={`進捗 ${doneCount}/4`}
          size="small"
          color={doneCount === 4 ? "success" : doneCount >= 2 ? "warning" : "default"}
          icon={doneCount === 4 ? <CheckCircleIcon /> : undefined}
        />
      </Box>

      {/* ── 過去の日誌選択ダイアログ ── */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, pb: 1 }}>
          <HistoryIcon color="primary" />
          過去の日誌を選択
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            選択するとAI評価・チャット履歴も切り替わります
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {allJournals.length === 0 ? (
            <Box p={3} textAlign="center">
              <Typography color="text.secondary">日誌がまだありません</Typography>
            </Box>
          ) : (
            <List dense>
              {allJournals.map((j) => {
                const statusColors = { draft: "#9e9e9e", submitted: "#1976d2", evaluated: "#388e3c" };
                const statusLabels = { draft: "下書き", submitted: "提出済み", evaluated: "評価済み" };
                const isSelected   = savedJournalId === j.id;
                return (
                  <ListItemButton
                    key={j.id}
                    onClick={() => loadPastJournal(j)}
                    selected={isSelected}
                    sx={{
                      borderLeft: isSelected ? `4px solid #1976d2` : "4px solid transparent",
                      bgcolor: isSelected ? "#e3f2fd" : undefined,
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: statusColors[j.status], fontSize: 12 }}>
                        W{j.week_number}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1 }}>
                            {j.title}
                          </Typography>
                          <Chip
                            label={statusLabels[j.status]}
                            size="small"
                            sx={{ height: 18, fontSize: 10, bgcolor: statusColors[j.status] + "20", color: statusColors[j.status] }}
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {new Date(j.entry_date).toLocaleDateString("ja-JP")} ・
                          {j.status === "evaluated" ? " AI評価あり ✓" :
                           j.status === "submitted" ? " 提出済み" : " 下書き"}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                );
              })}
            </List>
          )}
          <Box sx={{ p: 1.5, borderTop: "1px solid #e0e0e0" }}>
            <Button
              fullWidth variant="outlined" size="small"
              onClick={() => { setHistoryOpen(false); setStep(0); setSavedJournalId(null); setRecords([makeEmpty(0)]); setReflection(""); }}
            >
              ＋ 新しい日誌を作成する
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* ── ステッパー ── */}
      <Box sx={{ px: 2, py: 1, bgcolor: "#f8f9fa", borderBottom: "1px solid #e0e0e0", flexShrink: 0 }}>
        <Stepper nonLinear activeStep={step} sx={{ maxWidth: 700 }}>
          {STEPS.map((s, i) => (
            <Step key={s.label} completed={
              i === 0 ? totalBody >= 30 :
              i === 1 ? hasEval :
              hasChatMsg
            }>
              <StepButton onClick={() => setStep(i)}>
                <Box sx={{ textAlign: "left" }}>
                  <Typography variant="caption" fontWeight="bold" fontSize={11} display="block">{s.label}</Typography>
                  <Typography variant="caption" color="text.secondary" fontSize={9} display={{ xs: "none", sm: "block" }}>{s.desc}</Typography>
                </Box>
              </StepButton>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* ── コンテンツエリア ── */}
      <Box sx={{ flex: 1, overflowY: "auto", p: { xs: 1.5, sm: 2 } }}>

        {/* ════════════════════════════════
            ① 日誌記入タブ
           ════════════════════════════════ */}
        {step === 0 && (
          <Box>
            {/* 日付・週番号バー */}
            <Card sx={{ mb: 2, bgcolor: "#e3f2fd" }}>
              <CardContent sx={{ p: "12px 16px !important" }}>
                <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>日付</Typography>
                    <TextField type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)}
                      size="small" sx={{ width: 150 }}
                      error={!!saveErrors.date} helperText={saveErrors.date} />
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>週</Typography>
                    <TextField select value={weekNumber} onChange={(e) => setWeekNumber(Number(e.target.value))}
                      size="small" sx={{ width: 90 }}
                      SelectProps={{ native: true }}>
                      {[...Array(12)].map((_, i) => (
                        <option key={i+1} value={i+1}>第{i+1}週</option>
                      ))}
                    </TextField>
                  </Box>
                  <Chip
                    label={`記録 ${totalBody}文字 ${totalBody >= 30 ? "✓" : "（30文字以上）"}`}
                    size="small"
                    color={totalBody >= 30 ? "success" : "default"}
                  />
                </Box>
              </CardContent>
            </Card>

            {/* エラー */}
            {saveErrors.content && (
              <Alert severity="error" sx={{ mb: 1.5 }}>{saveErrors.content}</Alert>
            )}

            {/* 時限ブロック */}
            {records.map((r, i) => (
              <HourBlock
                key={r.id} record={r} index={i} total={records.length}
                onChange={updateRecord} onDelete={deleteRecord}
                onMoveUp={(id) => moveRecord(id, "up")} onMoveDown={(id) => moveRecord(id, "down")}
                onDragStart={handleDragStart} onDragOver={(e) => { handleDragOver(e); setDragOverId(r.id); }}
                onDrop={handleDrop} isDraggingOver={dragOverId === r.id}
              />
            ))}

            {/* ブロック追加 */}
            <Card variant="outlined" sx={{ mb: 2, borderStyle: "dashed", bgcolor: "#fafafa" }}>
              <CardContent sx={{ p: "12px !important" }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <AddCircleIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>コマを追加</Typography>
                </Box>
                <Box display="flex" flexWrap="wrap" gap={0.8}>
                  {PRESETS.map((p) => (
                    <Chip key={p.label} label={p.label} size="small" clickable variant="outlined"
                      onClick={() => addRecord(p)}
                      sx={{ fontSize: 11, cursor: "pointer" }} />
                  ))}
                  <Chip label="＋ カスタム" size="small" clickable
                    onClick={() => addRecord()} sx={{ fontSize: 11 }} />
                </Box>
              </CardContent>
            </Card>

            {/* 総合振り返り */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                  📝 今日の総合振り返り
                  <Chip label={reflection.length >= 20 ? "✓ 記入済み" : "20文字以上"} size="small"
                    color={reflection.length >= 20 ? "success" : "default"} sx={{ ml: 1, fontSize: 10 }} />
                </Typography>
                <TextField
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="今日の実習全体の振り返りを書いてください。うまくいったこと、難しかったこと、次回への課題など…"
                  fullWidth multiline minRows={4} size="small"
                  helperText={`${reflection.length} 文字`}
                />
              </CardContent>
            </Card>

            {/* 保存ボタン */}
            <Box display="flex" gap={1.5} justifyContent="flex-end">
              <Button variant="outlined" startIcon={<SaveIcon />}
                onClick={() => handleSave("draft")} disabled={saveMutation.isPending}>
                下書き保存
              </Button>
              <Button variant="contained" startIcon={<SendIcon />}
                onClick={() => handleSave("submitted")} disabled={saveMutation.isPending}
                color="primary">
                {saveMutation.isPending ? <CircularProgress size={18} color="inherit" /> : "提出してAI評価へ →"}
              </Button>
            </Box>
          </Box>
        )}

        {/* ════════════════════════════════
            ② AI評価確認タブ
           ════════════════════════════════ */}
        {step === 1 && (
          <Box>

            {/* ════ 日誌記入内容（常に表示） ════ */}
            <Card sx={{ mb: 2.5, border: "1.5px solid #1976d2" }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                  <MenuBookIcon sx={{ color: "#1976d2" }} />
                  <Typography variant="subtitle1" fontWeight="bold" color="#1565c0">
                    日誌記入内容
                  </Typography>
                  {entryDate && (
                    <Chip
                      label={new Date(entryDate).toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
                      size="small" variant="outlined"
                    />
                  )}
                  <Chip label={`Week ${weekNumber}`} size="small" color="primary" variant="outlined" />
                </Box>
                <Divider sx={{ mb: 1.5 }} />

                {/* 時限別記録 */}
                {records.length > 0 ? (
                  <Box>
                    {records.map((rec, idx) => {
                      const accent =
                        rec.time_label.includes("朝")    ? "#FF9800" :
                        rec.time_label.includes("休み")  ? "#4CAF50" :
                        rec.time_label.includes("給食") || rec.time_label.includes("昼") ? "#E91E63" :
                        rec.time_label.includes("帰り") || rec.time_label.includes("清掃") ? "#7B1FA2" :
                        rec.time_label.includes("放課後") ? "#1976D2" : "#455A64";
                      const bg =
                        rec.time_label.includes("朝")    ? "#FFF3E0" :
                        rec.time_label.includes("休み")  ? "#E8F5E9" :
                        rec.time_label.includes("給食") || rec.time_label.includes("昼") ? "#FCE4EC" :
                        rec.time_label.includes("帰り") || rec.time_label.includes("清掃") ? "#EDE7F6" :
                        rec.time_label.includes("放課後") ? "#E3F2FD" : "#F5F5F5";
                      return (
                        <Box key={rec.id} sx={{ mb: 1.5, borderLeft: `4px solid ${accent}`, bgcolor: bg, borderRadius: "0 8px 8px 0", p: 1.5 }}>
                          {/* ヘッダー行 */}
                          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                            <Box sx={{ minWidth: 22, height: 22, borderRadius: "50%", bgcolor: accent, color: "#fff",
                              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                              {idx + 1}
                            </Box>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ color: accent }}>{rec.time_label}</Typography>
                            {(rec.time_start || rec.time_end) && (
                              <Typography variant="caption" color="text.secondary">
                                {rec.time_start}〜{rec.time_end}
                              </Typography>
                            )}
                            {rec.subject && (
                              <Chip label={rec.subject} size="small" color="primary" variant="outlined" sx={{ fontSize: 10, height: 18 }} />
                            )}
                          </Box>
                          {/* 授業目標 */}
                          {rec.lesson_goal && (
                            <Typography variant="caption" color="text.secondary" display="block" mb={0.5} sx={{ pl: 3.5 }}>
                              🎯 授業目標: {rec.lesson_goal}
                            </Typography>
                          )}
                          {/* 本文 */}
                          {rec.body ? (
                            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.9, pl: 3.5 }}>
                              {rec.body}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.disabled" sx={{ pl: 3.5 }}>（記録なし）</Typography>
                          )}
                          {/* 難しさ・工夫 */}
                          {rec.difficulty && (
                            <Typography variant="caption" color="error.main" display="block" mt={0.5} sx={{ pl: 3.5 }}>
                              😰 難しかったこと: {rec.difficulty}
                            </Typography>
                          )}
                          {rec.devise && (
                            <Typography variant="caption" color="success.main" display="block" mt={0.3} sx={{ pl: 3.5 }}>
                              💡 工夫したこと: {rec.devise}
                            </Typography>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.disabled" sx={{ py: 2, textAlign: "center" }}>
                    日誌の記録がありません
                  </Typography>
                )}

                {/* 総合振り返り */}
                {reflection && (
                  <Box mt={1.5} sx={{ borderLeft: "4px solid #9c27b0", bgcolor: "#F3E5F5", borderRadius: "0 8px 8px 0", p: 1.5 }}>
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <PsychologyIcon sx={{ color: "#9c27b0", fontSize: 18 }} />
                      <Typography variant="subtitle2" fontWeight={700} color="#7b1fa2">
                        総合振り返り
                      </Typography>
                      <Typography variant="caption" color="text.disabled">{reflection.length} 文字</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.9 }}>
                      {reflection}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            {!evalData ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                日誌を提出するとAI評価が生成されます。まず「① 日誌記入」タブで日誌を提出してください。
              </Alert>
            ) : (
              <>
                {/* スコアサマリ */}
                <Grid container spacing={2} mb={2}>
                  {[
                    { label: "総合スコア",  value: evalData.total_score.toFixed(2), color: "#1976d2" },
                    ...FACTOR_KEYS.map((k, i) => ({
                      label: FACTOR_LABELS[i],
                      value: (evalData.factor_scores[k] ?? 0).toFixed(2),
                      color: FACTOR_COLORS[i],
                    })),
                  ].map((s) => (
                    <Grid key={s.label} size={{ xs: 6, sm: 3 }}>
                      <Paper sx={{ p: 1.5, textAlign: "center", bgcolor: "#f8f9fa" }}>
                        <Typography variant="h5" fontWeight="bold" color={s.color}>{s.value}</Typography>
                        <Typography variant="caption" color="text.secondary" fontSize={10}>{s.label}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>

                {/* レーダーチャート */}
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                      <AssessmentIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: "middle" }} />
                      4因子レーダーチャート
                    </Typography>
                    <ResponsiveContainer width="100%" height={240}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="factor" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis domain={[0, 4]} tick={{ fontSize: 10 }} />
                        <Radar name="スコア" dataKey="score" stroke="#1976d2" fill="#1976d2" fillOpacity={0.35} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* AIフィードバック */}
                <Card sx={{ mb: 2, border: "1.5px solid #7b1fa2" }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <SmartToyIcon sx={{ color: "#7b1fa2" }} />
                      <Typography variant="subtitle2" fontWeight="bold" color="#6a1b9a">
                        AIフィードバック（総合）
                      </Typography>
                    </Box>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: "#f3e5f5", borderRadius: 2, mb: 1.5 }}>
                      <Box display="flex" gap={1}>
                        <LightbulbIcon sx={{ color: "#7b1fa2", mt: 0.3, flexShrink: 0 }} />
                        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.9 }}>
                          {evalData.overall_comment}
                        </Typography>
                      </Box>
                    </Paper>
                  </CardContent>
                </Card>

                {/* 因子別詳細 */}
                {FACTOR_KEYS.map((key, fi) => {
                  const items = (evalData.evaluation_items ?? []).filter((it) => it.factor === FACTOR_KEYS[fi]);
                  if (items.length === 0) return null;
                  if (loadingJournal) return <LinearProgress />;

  return (
                    <Accordion key={key} sx={{ mb: 1 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: FACTOR_COLORS[fi] }} />
                          <Typography variant="body2" fontWeight="bold">{FACTOR_LABELS[fi]}</Typography>
                          <Chip label={(evalData.factor_scores[key] ?? 0).toFixed(2)} size="small"
                            sx={{ bgcolor: FACTOR_COLORS[fi], color: "white", fontSize: 10, height: 18, ml: "auto" }} />
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ pt: 0 }}>
                        {items.slice(0, 4).map((it) => (
                          <Box key={it.item_number} sx={{ mb: 1 }}>
                            <Box display="flex" justifyContent="space-between" mb={0.3}>
                              <Typography variant="caption" color="text.secondary">{it.item_number}. {it.feedback?.slice(0, 30) ?? `項目${it.item_number}`}</Typography>
                              <Typography variant="caption" fontWeight="bold">{(it.score ?? 0).toFixed(1)}/4</Typography>
                            </Box>
                            <LinearProgress variant="determinate" value={((it.score ?? 0) / 4) * 100}
                              sx={{ height: 6, borderRadius: 3, bgcolor: "grey.200",
                                "& .MuiLinearProgress-bar": { bgcolor: FACTOR_COLORS[fi] } }} />
                            {it.feedback && (
                              <Typography variant="caption" color="text.secondary" display="block" mt={0.3}>
                                💬 {it.feedback}
                              </Typography>
                            )}
                          </Box>
                        ))}
                      </AccordionDetails>
                    </Accordion>
                  );
                })}

                {/* 次のステップへ */}
                <Box display="flex" justifyContent="flex-end" mt={2}>
                  <Button variant="contained" onClick={() => setStep(2)} endIcon={<ChatIcon />}>
                    省察チャットへ →
                  </Button>
                </Box>
              </>
            )}
          </Box>
        )}

        {/* ════════════════════════════════
            ③ 省察チャット・目標設定タブ
           ════════════════════════════════ */}
        {step === 2 && (
          <Box sx={{ display: "flex", flexDirection: "column", height: "100%", gap: 1.5 }}>
            {/* フェーズ表示 */}
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <Chip label={phaseCfg.label} size="small"
                sx={{ bgcolor: phaseCfg.color, color: "white", fontWeight: "bold" }} />
              {currentRd > 0 && (
                <Box sx={{ flex: 1, minWidth: 160, maxWidth: 300 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    省察深さ: {REFLECTION_DEPTH_LEVELS[currentRd - 1]?.label}
                  </Typography>
                  <LinearProgress variant="determinate" value={(currentRd / 5) * 100}
                    sx={{ height: 5, borderRadius: 3, bgcolor: "grey.200",
                      "& .MuiLinearProgress-bar": { bgcolor: REFLECTION_DEPTH_LEVELS[currentRd - 1]?.color ?? "primary.main" } }} />
                </Box>
              )}
              <Tooltip title="チャットをリセット">
                <IconButton size="small" onClick={() => { setMessages([]); setRdHistory([]); }}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {/* AI評価のサマリーをチャットの補助情報として表示 */}
            {evalData && (
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "#f3f7fb" }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
                  <AutoAwesomeIcon sx={{ fontSize: 12, mr: 0.3, verticalAlign: "middle" }} />
                  今週のAI評価サマリー（参考）
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {FACTOR_KEYS.map((k, i) => (
                    <Chip key={k} label={`${FACTOR_LABELS[i].slice(0, 4)} ${(evalData.factor_scores[k] ?? 0).toFixed(1)}`}
                      size="small" sx={{ bgcolor: FACTOR_COLORS[i] + "20", color: FACTOR_COLORS[i], fontSize: 10, height: 20 }} />
                  ))}
                </Box>
                {evalData.overall_comment && (
                  <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                    💡 {evalData.overall_comment.slice(0, 80)}…
                  </Typography>
                )}
              </Paper>
            )}

            {/* チャット本体 */}
            <Card sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 300 }}>
              {/* メッセージエリア */}
              <Box sx={{ flex: 1, overflowY: "auto", p: 2, minHeight: 200 }}>
                {messages.length === 0 && (
                  <Box textAlign="center" py={3}>
                    <SmartToyIcon sx={{ fontSize: 40, color: "primary.light", mb: 1 }} />
                    <Typography color="text.secondary" variant="body2" mb={0.5}>
                      AI省察サポーターが実習振り返りを支援します
                    </Typography>
                    <Typography color="text.secondary" variant="caption">
                      今日の実習について話しかけてみてください
                    </Typography>
                    {/* 最初の入力ヒント */}
                    {reflection && (
                      <Button size="small" variant="outlined" sx={{ mt: 1.5, display: "block", mx: "auto" }}
                        onClick={() => sendMessage(`今日の振り返り: ${reflection.slice(0, 80)}…`)}>
                        📝 振り返りを貼り付けて始める
                      </Button>
                    )}
                  </Box>
                )}
                {messages.map((msg, idx) => (
                  <MessageBubble key={msg.id} msg={msg}
                    rdLevel={msg.role === "user" ? rdHistory[Math.floor(idx / 2)] : undefined} />
                ))}
                {chatLoading && (
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: "primary.main" }}>
                      <SmartToyIcon sx={{ fontSize: 16 }} />
                    </Avatar>
                    <Paper sx={{ p: 1.5, borderRadius: 2, borderBottomLeftRadius: 0, bgcolor: "primary.main" }}>
                      <CircularProgress size={14} sx={{ color: "white" }} />
                    </Paper>
                  </Box>
                )}
                <div ref={bottomRef} />
              </Box>

              <Divider />

              {/* プロンプト提案チップ */}
              <Box sx={{ px: 1.5, py: 0.8, bgcolor: "grey.50", overflowX: "auto" }}>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                  💡 質問例：
                </Typography>
                <Box display="flex" gap={0.8} sx={{ flexWrap: "nowrap", pb: 0.3 }}>
                  {phaseCfg.suggestions.map((s) => (
                    <Chip key={s} label={s.length > 22 ? s.slice(0, 22) + "…" : s}
                      size="small" clickable variant="outlined" color="primary"
                      onClick={() => sendMessage(s)}
                      sx={{ fontSize: 11, flexShrink: 0 }} />
                  ))}
                </Box>
              </Box>

              {/* 入力エリア */}
              <Box display="flex" gap={1} p={1.5}>
                <TextField
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
                  placeholder="今日の実習について話しましょう…（ルーブリック因子を意識して書くとフィードバックが充実します）"
                  fullWidth size="small" multiline maxRows={3}
                />
                <Button variant="contained" onClick={() => sendMessage()}
                  disabled={!chatInput.trim() || chatLoading} sx={{ minWidth: 48, px: 1.5 }}>
                  <SendIcon />
                </Button>
              </Box>
            </Card>

            {/* 目標設定促進カード */}
            {messages.length >= 4 && (
              <Card sx={{ border: "1.5px solid #388e3c", bgcolor: "#f1f8e9" }}>
                <CardContent sx={{ p: "12px 16px !important" }}>
                  <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                    <TrackChangesIcon sx={{ color: "#388e3c", fontSize: 18 }} />
                    <Typography variant="subtitle2" fontWeight="bold" color="#2e7d32">
                      次週の目標を立てましょう
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    チャットで省察が深まったら、目標履歴ページでSMART目標を記録できます
                  </Typography>
                  <Button size="small" variant="outlined" color="success"
                    startIcon={<TrackChangesIcon />}
                    onClick={async () => {
                      if (messages.length > 0) {
                        const user = JSON.parse(localStorage.getItem("user_info") || "{}");
                        if (user.id) {
                          try {
                            const authHeader = btoa(JSON.stringify({ id: user.id, role: user.role }));
                            const res = await fetch("/api/ai/evaluate-session-rd", {
                              method: "POST",
                              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authHeader}` },
                              body: JSON.stringify({ conversation: messages })
                            });
                            const rdData = await res.json();
                            if (rdData.success) {
                              await mockApi.saveRq3bOutcomes({
                                userId: user.id,
                                week_number: weekNumber,
                                rd_chat_raw_level: rdData.result.rd_level,
                                rd_chat_category: rdData.result.category
                              });
                            }
                          } catch (e) {
                            console.error("Failed to evaluate RD", e);
                          }
                        }
                      }
                      navigate("/goals");
                    }}>
                    チャットを終了して目標を設定する (RD-Chat保存)
                  </Button>
                </CardContent>
              </Card>
            )}
          </Box>
        )}
      </Box>

      {/* ── スナックバー ── */}
      <Snackbar open={snackOpen} autoHideDuration={3000} onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity="success" onClose={() => setSnackOpen(false)}>{snackMsg}</Alert>
      </Snackbar>
    </Box>
  );
}
