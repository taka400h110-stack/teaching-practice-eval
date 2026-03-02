/**
 * src/pages/JournalDetailPage.tsx
 * 日誌詳細 — 時限ブロックは「教科」+「内容」のみ表示
 */
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Collapse, Divider, Paper, Stack, Typography, IconButton,
} from "@mui/material";
import ArrowBackIcon   from "@mui/icons-material/ArrowBack";
import EditIcon        from "@mui/icons-material/Edit";
import AssessmentIcon  from "@mui/icons-material/Assessment";
import MenuBookIcon    from "@mui/icons-material/MenuBook";
import PsychologyIcon  from "@mui/icons-material/Psychology";
import CommentIcon     from "@mui/icons-material/Comment";
import SchoolIcon      from "@mui/icons-material/School";
import AccessTimeIcon  from "@mui/icons-material/AccessTime";
import ExpandMoreIcon  from "@mui/icons-material/ExpandMore";
import ExpandLessIcon  from "@mui/icons-material/ExpandLess";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import { useQuery } from "@tanstack/react-query";
import mockApi from "../api/client";
import type { JournalEntry, JournalStatus, HourRecord } from "../types";

// ── パーサ ──
function parseHourRecords(content: string): HourRecord[] | null {
  if (!content) return null;
  try {
    const p = JSON.parse(content);
    if (p.version === 2 && Array.isArray(p.records) && p.records.length > 0) {
      return [...p.records].sort((a: HourRecord, b: HourRecord) => a.order - b.order);
    }
  } catch {}
  return null;
}

// ── 色 ──
function blockAccent(label: string) {
  if (label.includes("朝")) return "#FF9800";
  if (label.includes("休み")) return "#4CAF50";
  if (label.includes("給食") || label.includes("昼")) return "#E91E63";
  if (label.includes("帰り") || label.includes("清掃")) return "#7B1FA2";
  if (label.includes("放課後")) return "#1976D2";
  return "#455A64";
}
function blockBg(label: string) {
  if (label.includes("朝")) return "#FFF3E0";
  if (label.includes("休み")) return "#E8F5E9";
  if (label.includes("給食") || label.includes("昼")) return "#FCE4EC";
  if (label.includes("帰り") || label.includes("清掃")) return "#EDE7F6";
  if (label.includes("放課後")) return "#E3F2FD";
  return "#F5F5F5";
}

// ── 時限ブロック（教科＋内容のみ）──
function HourBlockView({ rec, index }: { rec: HourRecord; index: number }) {
  const [open, setOpen] = React.useState(true);
  const accent = blockAccent(rec.time_label);
  const bg     = blockBg(rec.time_label);

  return (
    <Card sx={{ mb: 2, borderLeft: `5px solid ${accent}`, bgcolor: bg }}>
      {/* ヘッダー：コマ名・時刻・教科 */}
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1, cursor: "pointer", borderBottom: open ? "1px solid" : "none", borderColor: "divider" }}
        onClick={() => setOpen((v) => !v)}
      >
        <Box sx={{ minWidth: 24, height: 24, borderRadius: "50%", bgcolor: accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
          {index + 1}
        </Box>
        <Typography variant="subtitle2" fontWeight={700} sx={{ color: accent }}>{rec.time_label}</Typography>
        {(rec.time_start || rec.time_end) && (
          <Chip icon={<AccessTimeIcon style={{ fontSize: 12 }} />} label={`${rec.time_start}〜${rec.time_end}`} size="small" variant="outlined" sx={{ fontSize: 11, height: 20 }} />
        )}
        {rec.subject && (
          <Chip label={rec.subject} size="small" color="primary" variant="outlined" sx={{ fontSize: 11, height: 20 }} />
        )}
        <Box sx={{ ml: "auto" }}>
          <IconButton size="small">{open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}</IconButton>
        </Box>
      </Box>

      {/* 内容のみ */}
      <Collapse in={open}>
        <CardContent sx={{ pt: 1.5, pb: "12px !important" }}>
          {rec.body ? (
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.9 }}>{rec.body}</Typography>
          ) : (
            <Typography variant="body2" color="text.disabled">（記録なし）</Typography>
          )}
        </CardContent>
      </Collapse>
    </Card>
  );
}

// ── ステータス ──
const STATUS_CONFIG: Record<JournalStatus, { label: string; color: "default" | "primary" | "success" }> = {
  draft:     { label: "下書き",   color: "default"  },
  submitted: { label: "提出済み", color: "primary"  },
  evaluated: { label: "評価済み", color: "success"  },
};

// ── セクション ──
interface SectionProps { icon: React.ReactNode; title: string; color?: string; bgcolor?: string; borderColor?: string; children: React.ReactNode; }
const Section: React.FC<SectionProps> = ({ icon, title, color = "text.primary", bgcolor = "grey.50", borderColor, children }) => (
  <Card sx={{ mb: 2.5, ...(borderColor ? { border: "1.5px solid", borderColor } : {}) }}>
    <CardContent>
      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
        <Box sx={{ color }}>{icon}</Box>
        <Typography variant="subtitle1" fontWeight="bold" color={color}>{title}</Typography>
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Paper variant="outlined" sx={{ p: 2.5, bgcolor, borderRadius: 2, minHeight: 60 }}>{children}</Paper>
    </CardContent>
  </Card>
);

const BodyText: React.FC<{ text?: string | null; fallback?: string }> = ({ text, fallback = "（記述なし）" }) => (
  <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 2 }}>{text?.trim() || fallback}</Typography>
);

// ── クエリ ──
const useJournalQuery = (id: string) => useQuery<JournalEntry>({
  queryKey: ["journal", id],
  queryFn:  () => mockApi.getJournal(id) as Promise<JournalEntry>,
  enabled:  !!id,
});

// ── メイン ──
const JournalDetailPage: React.FC = () => {
  const { journalId } = useParams<{ journalId: string }>();
  const navigate = useNavigate();
  const { data: journal, isLoading, isError } = useJournalQuery(journalId ?? "");

  if (isLoading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh"><CircularProgress /></Box>;
  if (isError || !journal) return <Box p={3}><Alert severity="error">日誌の取得に失敗しました。</Alert></Box>;

  const statusConfig = STATUS_CONFIG[journal.status];
  const formattedDate = new Date(journal.entry_date).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
  const hourRecords   = parseHourRecords(journal.content);
  const isNewFormat   = hourRecords !== null;

  return (
    <Box p={0} maxWidth={960} mx="auto">
      {/* ヘッダーボタン */}
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/journals")} variant="outlined" size="small">一覧に戻る</Button>
        <Box flex={1} />
        {journal.status !== "evaluated" && (
          <Button startIcon={<EditIcon />} variant="outlined" color="secondary" size="small" onClick={() => navigate(`/journals/${journal.id}/edit`)}>編集</Button>
        )}
        {journal.status === "evaluated" && (
          <Button startIcon={<AssessmentIcon />} variant="contained" size="small" onClick={() => navigate(`/evaluations/${journal.id}`)}>AI評価結果を見る</Button>
        )}
      </Box>

      {/* タイトル・メタ */}
      <Card sx={{ mb: 3, borderLeft: "4px solid", borderColor: "primary.main" }}>
        <CardContent>
          <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={2} mb={1.5}>
            <Typography variant="h5" fontWeight="bold" lineHeight={1.4}>{journal.title}</Typography>
            <Chip label={statusConfig.label} color={statusConfig.color} />
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip size="small" icon={<SchoolIcon />} label={`Week ${journal.week_number}`} color="primary" variant="outlined" />
            {journal.subject && <Chip size="small" label={`📚 ${journal.subject}`} variant="outlined" />}
            <Chip size="small" label={`📅 ${formattedDate}`} variant="outlined" />
          </Stack>
        </CardContent>
      </Card>

      {/* 時限別記録（新形式）*/}
      {isNewFormat && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <MenuBookIcon sx={{ color: "text.secondary" }} />
            <Typography variant="subtitle1" fontWeight="bold">時限別記録</Typography>
            <Chip label={`${hourRecords!.length} コマ`} size="small" color="primary" variant="outlined" />
            <Typography variant="caption" color="text.secondary">クリックで折りたたみ</Typography>
          </Box>
          {hourRecords!.map((rec, idx) => <HourBlockView key={rec.id} rec={rec} index={idx} />)}
        </Box>
      )}

      {/* 授業記録（旧形式）*/}
      {!isNewFormat && (
        <Section icon={<MenuBookIcon />} title="授業記録">
          <BodyText text={journal.content} />
        </Section>
      )}

      {/* 授業目標（旧形式のみ）*/}
      {!isNewFormat && journal.lesson_goal && (
        <Section icon={<TrackChangesIcon />} title="授業目標" color="primary.main" bgcolor="#E3F2FD" borderColor="primary.light">
          <BodyText text={journal.lesson_goal} />
        </Section>
      )}

      {/* 省察 */}
      <Section icon={<PsychologyIcon />} title="省察・振り返り" color="secondary.main" bgcolor="#F3E5F5" borderColor="#CE93D8">
        <BodyText text={journal.reflection_text} fallback="（省察テキストなし）" />
        {journal.reflection_text && (
          <Typography variant="caption" color="text.disabled" display="block" textAlign="right" mt={1}>{journal.reflection_text.length} 文字</Typography>
        )}
      </Section>

      {/* 次週への行動計画 */}
      {journal.next_action && (
        <Section icon={<TrackChangesIcon />} title="次週への行動計画" color="#1565C0" bgcolor="#E8EAF6" borderColor="#9FA8DA">
          <BodyText text={journal.next_action} />
        </Section>
      )}

      {/* 指導教員コメント */}
      {journal.teacher_comment && (
        <Section icon={<CommentIcon />} title="指導教員コメント" color="info.main" bgcolor="#E0F7FA" borderColor="#80DEEA">
          <BodyText text={journal.teacher_comment} />
        </Section>
      )}
    </Box>
  );
};

export default JournalDetailPage;
