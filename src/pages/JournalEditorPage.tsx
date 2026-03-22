/**
 * src/pages/JournalEditorPage.tsx
 * 実習日誌 作成・編集ページ
 * 各時限ブロック：教科・活動 ＋ 授業内容・活動内容 のみ表示
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Box, Button, Card, CardContent, CircularProgress,
  TextField, Typography, Alert, Snackbar, Chip,
  IconButton, Tooltip, Collapse,
} from "@mui/material";
import SaveIcon            from "@mui/icons-material/Save";
import SendIcon            from "@mui/icons-material/Send";
import ArrowBackIcon       from "@mui/icons-material/ArrowBack";
import AddCircleIcon       from "@mui/icons-material/AddCircle";
import DeleteOutlineIcon   from "@mui/icons-material/DeleteOutline";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import DragIndicatorIcon   from "@mui/icons-material/DragIndicator";
import ExpandMoreIcon      from "@mui/icons-material/ExpandMore";
import ExpandLessIcon      from "@mui/icons-material/ExpandLess";
import AccessTimeIcon      from "@mui/icons-material/AccessTime";
import TrackChangesIcon    from "@mui/icons-material/TrackChanges";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../api/client";
import type { JournalEntry, JournalCreateRequest, HourRecord } from "../types";

// ── ユーティリティ ──
let _id = 0;
const newId = () => `hr-${Date.now()}-${_id++}`;

function makeEmpty(order: number, preset?: Partial<HourRecord>): HourRecord {
  return {
    id:          newId(),
    order,
    time_label:  preset?.time_label ?? `${order + 1}時限`,
    time_start:  preset?.time_start ?? "",
    time_end:    preset?.time_end ?? "",
    subject:     preset?.subject ?? "",
    lesson_goal: "",
    body:        preset?.body ?? "",
    difficulty:  "",
    devise:      "",
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

// ── ブロック色 ──
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

// ── プリセット ──
const PRESETS = [
  { label: "朝の会",       time_start: "08:15", time_end: "08:30" },
  { label: "1時限",        time_start: "08:30", time_end: "09:15" },
  { label: "2時限",        time_start: "09:20", time_end: "10:05" },
  { label: "休み時間",     time_start: "10:05", time_end: "10:25" },
  { label: "3時限",        time_start: "10:25", time_end: "11:10" },
  { label: "4時限",        time_start: "11:15", time_end: "12:00" },
  { label: "給食・昼休み", time_start: "12:00", time_end: "13:20" },
  { label: "5時限",        time_start: "13:25", time_end: "14:10" },
  { label: "6時限",        time_start: "14:15", time_end: "15:00" },
  { label: "帰りの会・清掃", time_start: "15:05", time_end: "15:30" },
  { label: "放課後",       time_start: "15:30", time_end: "17:00" },
];

// ── 1ブロック ──
interface BlockProps {
  record:    HourRecord;
  index:     number;
  total:     number;
  onChange:  (id: string, field: keyof HourRecord, value: string) => void;
  onDelete:  (id: string) => void;
  onMoveUp:  (id: string) => void;
  onMoveDown:(id: string) => void;
  onDragStart:(e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop:     (e: React.DragEvent, id: string) => void;
  isDraggingOver: boolean;
}

function HourBlock({
  record, index, total,
  onChange, onDelete, onMoveUp, onMoveDown,
  onDragStart, onDragOver, onDrop, isDraggingOver,
}: BlockProps) {
  const [expanded, setExpanded] = useState(true);
  const accent = blockAccent(record.time_label);
  const bg     = blockBg(record.time_label);

  return (
    <Box
      draggable
      onDragStart={(e) => onDragStart(e, record.id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, record.id)}
      sx={{ border: isDraggingOver ? `2px dashed ${accent}` : "2px solid transparent", borderRadius: 2, mb: 2, transition: "border 0.15s" }}
    >
      <Card sx={{ bgcolor: bg, borderLeft: `5px solid ${accent}`, boxShadow: isDraggingOver ? 4 : 1, cursor: "grab" }}>
        {/* ヘッダー */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 2, py: 1, borderBottom: expanded ? "1px solid" : "none", borderColor: "divider" }}>
          <DragIndicatorIcon sx={{ color: "text.disabled", mr: 0.5 }} />
          <Box sx={{ minWidth: 24, height: 24, borderRadius: "50%", bgcolor: accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            {index + 1}
          </Box>
          {/* コマ名 */}
          <TextField
            value={record.time_label}
            onChange={(e) => onChange(record.id, "time_label", e.target.value)}
            size="small" variant="standard" placeholder="コマ名"
            sx={{ width: 110, "& input": { fontWeight: 700, fontSize: 14 } }}
            onClick={(e) => e.stopPropagation()}
          />
          {/* 時刻 */}
          <AccessTimeIcon sx={{ fontSize: 14, color: "text.secondary", ml: 0.5 }} />
          <TextField
            value={record.time_start}
            onChange={(e) => onChange(record.id, "time_start", e.target.value)}
            size="small" variant="standard" type="time"
            sx={{ width: 78, "& input": { fontSize: 13 } }}
            onClick={(e) => e.stopPropagation()}
          />
          <Typography variant="caption" color="text.secondary">〜</Typography>
          <TextField
            value={record.time_end}
            onChange={(e) => onChange(record.id, "time_end", e.target.value)}
            size="small" variant="standard" type="time"
            sx={{ width: 78, "& input": { fontSize: 13 } }}
            onClick={(e) => e.stopPropagation()}
          />
          {/* 教科・活動 */}
          <TextField
            value={record.subject}
            onChange={(e) => onChange(record.id, "subject", e.target.value)}
            size="small" variant="standard" placeholder="教科・活動"
            sx={{ width: 110, ml: 1, "& input": { fontSize: 13 } }}
            onClick={(e) => e.stopPropagation()}
          />
          <Box sx={{ ml: "auto", display: "flex", gap: 0.5, alignItems: "center" }}>
            {record.body.length > 0 && (
              <Chip label={`${record.body.length}字`} size="small" sx={{ fontSize: 10, height: 18 }} variant="outlined" />
            )}
            <Tooltip title="上へ移動"><span>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onMoveUp(record.id); }} disabled={index === 0}>
                <KeyboardArrowUpIcon fontSize="small" />
              </IconButton>
            </span></Tooltip>
            <Tooltip title="下へ移動"><span>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onMoveDown(record.id); }} disabled={index === total - 1}>
                <KeyboardArrowDownIcon fontSize="small" />
              </IconButton>
            </span></Tooltip>
            <IconButton size="small" onClick={() => setExpanded((v) => !v)}>
              {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
            <Tooltip title="削除">
              <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); onDelete(record.id); }}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* 授業・活動内容のみ */}
        <Collapse in={expanded}>
          <CardContent sx={{ pt: 1.5, pb: "12px !important" }}>
            <TextField
              value={record.body}
              onChange={(e) => onChange(record.id, "body", e.target.value)}
              placeholder="授業の内容・活動の様子を記録…"
              fullWidth multiline minRows={3}
              size="small"
              sx={{ bgcolor: "#fff" }}
              helperText={`${record.body.length} 文字`}
            />
          </CardContent>
        </Collapse>
      </Card>
    </Box>
  );
}

// ── メインコンポーネント ──
const JournalEditorPage: React.FC = () => {
  const navigate      = useNavigate();
  const location      = useLocation();
  const { journalId } = useParams<{ journalId: string }>();
  const queryClient_  = useQueryClient();
  const isEditMode    = !!journalId;

  const [records,    setRecords]    = useState<HourRecord[]>([makeEmpty(0)]);
  const [reflection, setReflection] = useState("");
  const [entryDate,  setEntryDate]  = useState(new Date().toISOString().split("T")[0]);
  const [weekNumber, setWeekNumber] = useState(1);
  const [ocrMeta, setOcrMeta] = useState<{ source?: string; confidence?: number }>({});
  const [errors,     setErrors]     = useState<{ content?: string; date?: string }>({});
  const [snackbarOpen,    setSnackbarOpen]    = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const dragIdRef    = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const { data: existing, isLoading } = useQuery<JournalEntry>({
    queryKey: ["journal", journalId],
    queryFn:  () => apiClient.getJournal(journalId!) as Promise<JournalEntry>,
    enabled:  !!journalId,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["goals"],
    queryFn: () => apiClient.getGoalHistory()
  });
  
  const currentGoal = goals.find(g => g.week === weekNumber);

  useEffect(() => {
    if (!existing) return;
    const { records: recs, reflection: ref } = contentToRecords(existing.content);
    setRecords(recs.length > 0 ? recs : [makeEmpty(0)]);
    setReflection(existing.reflection_text || ref);
    setEntryDate(existing.entry_date);
    setWeekNumber(existing.week_number ?? 1);
  }, [existing]);


  useEffect(() => {
    if (isEditMode) return;
    
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get("from") === "ocr") {
      try {
        const ocrDataStr = sessionStorage.getItem("ocr_form_data");
        const ocrRawText = sessionStorage.getItem("ocr_raw_text");
        
        if (ocrDataStr) {
          const formData = JSON.parse(ocrDataStr) as Record<string, string>;
          
          const newRecords: HourRecord[] = [];
          
          const mapping = [
            { field: "block_morning", label: "朝の会" },
            { field: "block_p1", label: "1時限" },
            { field: "block_p2", label: "2時限" },
            { field: "block_p3", label: "3時限" },
            { field: "block_p4", label: "4時限" },
            { field: "block_lunch", label: "給食・昼" },
            { field: "block_p5", label: "5時限" },
            { field: "block_p6", label: "6時限" },
            { field: "block_cleaning", label: "清掃" },
            { field: "block_closing", label: "帰りの会" },
            { field: "block_after", label: "放課後" },
          ];
          
          let order = 0;
          for (const m of mapping) {
            if (formData[m.field]) {
              newRecords.push(makeEmpty(order++, {
                time_label: m.label,
                body: formData[m.field].trim()
              }));
            }
          }
          
          if (newRecords.length > 0) {
            setRecords(newRecords);
          }
          
          if (formData["reflection"]) {
            setReflection(formData["reflection"].trim());
          } else if (ocrRawText && newRecords.length === 0) {
            setReflection(ocrRawText);
          }
          
          const source = sessionStorage.getItem("ocr_source");
          const conf = sessionStorage.getItem("ocr_confidence");
          if (source) {
            setOcrMeta({ source, confidence: conf ? parseFloat(conf) : undefined });
          }
          sessionStorage.removeItem("ocr_form_data");
          sessionStorage.removeItem("ocr_raw_text");
          sessionStorage.removeItem("ocr_source");
          sessionStorage.removeItem("ocr_confidence");
        }
      } catch (e) {
        console.error("Failed to load OCR data", e);
      }
    }
  }, [isEditMode, location.search]);
  const saveMutation = useMutation<JournalEntry, Error, JournalCreateRequest>({
    mutationFn: async (payload) => {
      if (isEditMode) return apiClient.updateJournal(journalId!, payload as unknown as Record<string, unknown>) as Promise<JournalEntry>;
      return apiClient.createJournal(payload as unknown as Record<string, unknown>) as Promise<JournalEntry>;
    },
    onSuccess: (data, payload) => {
      void queryClient_.invalidateQueries({ queryKey: ["journals"] });
      setSnackbarMessage(payload.status === "submitted" ? "日誌を提出しました" : "下書きを保存しました");
      setSnackbarOpen(true);
      if (payload.status === "submitted") {
        setTimeout(() => navigate("/journals"), 1500);
      } else if (!isEditMode && data.id) {
        navigate(`/journals/${data.id}/edit`, { replace: true });
      }
    },
  });

  const validate = () => {
    const errs: typeof errors = {};
    const totalBody = records.reduce((s, r) => s + r.body.length, 0);
    if (totalBody < 30) errs.content = "記録本文の合計が30文字以上になるよう記入してください";
    if (!entryDate) errs.date = "日付は必須です";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const updateRecord = useCallback((id: string, field: keyof HourRecord, value: string) => {
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    if (errors.content) setErrors((e) => ({ ...e, content: undefined }));
  }, [errors.content]);

  const addRecord = (preset?: Partial<HourRecord>) => {
    setRecords((prev) => [...prev, makeEmpty(prev.length, preset)]);
  };
  const deleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id).map((r, i) => ({ ...r, order: i })));
  };
  const moveRecord = (id: string, dir: "up" | "down") => {
    setRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
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
      const [moved] = next.splice(si, 1);
      next.splice(ti, 0, moved);
      return next.map((r, i) => ({ ...r, order: i }));
    });
    dragIdRef.current = null;
    setDragOverId(null);
  };

  const buildPayload = (status: "draft" | "submitted"): JournalCreateRequest => ({
    ...(ocrMeta.source ? { ocr_source: ocrMeta.source, ocr_confidence: ocrMeta.confidence } : {}),
    title:           `${entryDate} の日誌（第${weekNumber}週）`,
    content:         recordsToContent(records, reflection),
    reflection_text: reflection,
    entry_date:      entryDate,
    week_number:     weekNumber,
    status,
  });

  const totalBody = records.reduce((s, r) => s + r.body.length, 0);
  const isSaving  = saveMutation.isPending;

  if (isEditMode && isLoading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh"><CircularProgress /></Box>;

  return (
    <Box p={0} maxWidth={900} mx="auto">
      {/* ヘッダー */}
      <Box display="flex" alignItems="center" gap={1} mb={2} flexWrap="wrap">
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/journals")} variant="outlined" size="small">一覧に戻る</Button>
        <Typography variant="h5" fontWeight="bold" ml={1}>{isEditMode ? "日誌を編集" : "今日の実習日誌"}</Typography>
        <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
          <Button variant="outlined" startIcon={<SaveIcon />} onClick={() => { if (validate()) saveMutation.mutate(buildPayload("draft")); }} disabled={isSaving}>下書き保存</Button>
          <Button variant="contained" startIcon={<SendIcon />} onClick={() => { if (validate()) saveMutation.mutate(buildPayload("submitted")); }} disabled={isSaving} color="primary">提出する</Button>
        </Box>
      </Box>

      {/* 週次サイクル案内（論文3 RQ3 フロー） */}
      {!isEditMode && (
        <Box
          sx={{
            mb: 2.5, p: 1.5, borderRadius: 2,
            bgcolor: "#E3F2FD", border: "1px solid #90CAF9",
            display: "flex", alignItems: "center", gap: 1.5,
          }}
        >
          <AccessTimeIcon sx={{ color: "#1976d2", fontSize: 20 }} />
          <Box>
            <Typography variant="caption" fontWeight="bold" color="#1565C0">
              週次サイクル: ① 日誌作成（今ここ）→ ② AI評価確認 → ③ チャットBot省察 → ④ 自己評価
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              時限ごとに教科・活動と授業内容を記録し、最後に省察を記述して提出してください。
            </Typography>
          </Box>
        </Box>
      )}

      {saveMutation.isError && <Alert severity="error" sx={{ mb: 2 }}>保存中にエラーが発生しました。</Alert>}

      {/* 基本情報 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight="bold" mb={1.5} color="text.secondary">基本情報</Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <TextField label="実施日" type="date" value={entryDate} onChange={(e) => { setEntryDate(e.target.value); setErrors((ev) => ({ ...ev, date: undefined })); }}
              error={!!errors.date} helperText={errors.date} size="small" slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 180 }} />
            <TextField label="実習週" type="number" value={weekNumber} onChange={(e) => setWeekNumber(Math.max(1, Number(e.target.value)))}
              size="small" slotProps={{ input: { inputProps: { min: 1, max: 15 } } }} sx={{ width: 110 }} />
          </Box>
        </CardContent>
      </Card>

      {/* 時限別記録 */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <Typography variant="subtitle1" fontWeight="bold">時限別記録</Typography>
          <Chip label={`合計 ${totalBody} 文字 / ${records.length} コマ`} size="small" color={totalBody >= 30 ? "success" : "default"} variant="outlined" />
          <Typography variant="caption" color="text.secondary">ドラッグまたは ↑↓ で順番変更</Typography>
        </Box>
        {errors.content && <Alert severity="error" sx={{ mb: 2 }}>{errors.content}</Alert>}

        {records.map((rec, idx) => (
          <HourBlock
            key={rec.id} record={rec} index={idx} total={records.length}
            onChange={updateRecord} onDelete={deleteRecord}
            onMoveUp={(id) => moveRecord(id, "up")} onMoveDown={(id) => moveRecord(id, "down")}
            onDragStart={handleDragStart}
            onDragOver={(e) => { handleDragOver(e); setDragOverId(rec.id); }}
            onDrop={(e, id) => { handleDrop(e, id); setDragOverId(null); }}
            isDraggingOver={dragOverId === rec.id}
          />
        ))}

        {/* コマ追加 */}
        <Card sx={{ p: 1.5, bgcolor: "grey.50", border: "2px dashed", borderColor: "grey.300" }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mb: 1, display: "block" }}>＋ コマを追加</Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8 }}>
            {PRESETS.map((p) => (
              <Chip key={p.label} label={p.label} size="small" clickable
                onClick={() => addRecord({ time_label: p.label, time_start: p.time_start, time_end: p.time_end })}
                variant="outlined"
                sx={{ bgcolor: blockBg(p.label), borderColor: blockAccent(p.label), color: blockAccent(p.label), fontWeight: 600, "&:hover": { bgcolor: blockAccent(p.label), color: "#fff" } }}
              />
            ))}
            <Chip label="＋ 空白コマ" size="small" clickable
              onClick={() => addRecord({ time_label: `${records.length + 1}時限` })}
              icon={<AddCircleIcon style={{ fontSize: 14 }} />} color="primary" variant="outlined"
            />
          </Box>
        </Card>
      </Box>

      {/* 省察 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="bold" mb={0.5}>省察・振り返り</Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
            今日の実習全体を通じた気づき・学び・次回への課題
          </Typography>
          <TextField
            value={reflection} onChange={(e) => setReflection(e.target.value)}
            placeholder="今日の実習を振り返り、気づいたこと・学んだこと・改善したいことを記述してください…"
            fullWidth multiline minRows={5} size="small"
            helperText={`${reflection.length} 文字`}
          />
        </CardContent>
      </Card>

      <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage} anchorOrigin={{ vertical: "bottom", horizontal: "center" }} />
    </Box>
  );
};

export default JournalEditorPage;
