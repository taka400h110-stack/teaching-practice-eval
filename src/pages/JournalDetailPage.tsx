// @ts-nocheck

/**
 * src/pages/JournalDetailPage.tsx
 * 実習日誌詳細 — 日誌本文 / AI評価レーダー / 23項目スコア / 成長曲線 / AIフィードバック
 */
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Collapse, Divider, Grid, Paper, Stack, Typography, IconButton,
  Accordion, AccordionSummary, AccordionDetails, LinearProgress,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Snackbar,
} from "@mui/material";
import ArrowBackIcon      from "@mui/icons-material/ArrowBack";
import EditIcon           from "@mui/icons-material/Edit";
import AssessmentIcon     from "@mui/icons-material/Assessment";
import MenuBookIcon       from "@mui/icons-material/MenuBook";
import PsychologyIcon     from "@mui/icons-material/Psychology";
import CommentIcon        from "@mui/icons-material/Comment";
import SchoolIcon         from "@mui/icons-material/School";
import AccessTimeIcon     from "@mui/icons-material/AccessTime";
import ExpandMoreIcon     from "@mui/icons-material/ExpandMore";
import ExpandLessIcon     from "@mui/icons-material/ExpandLess";
import TrackChangesIcon   from "@mui/icons-material/TrackChanges";
import ShowChartIcon      from "@mui/icons-material/ShowChart";
import SmartToyIcon       from "@mui/icons-material/SmartToy";
import LightbulbIcon      from "@mui/icons-material/Lightbulb";
import StarIcon           from "@mui/icons-material/Star";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine,
} from "recharts";
import SendIcon from "@mui/icons-material/Send";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../api/client";
import type { JournalEntry, JournalStatus, HourRecord, EvaluationResult, GrowthData } from "../types";

// ─────────────────────────────────────────────
// 定数（論文確定版 4因子23項目）
// ─────────────────────────────────────────────
const FACTOR_LABELS = ["児童生徒への指導力", "自己評価力", "学級経営力", "職務を理解して行動する力"] as const;
const FACTOR_COLORS = ["#1976d2", "#388e3c", "#f57c00", "#7b1fa2"] as const;
const FACTOR_KEYS   = ["factor1", "factor2", "factor3", "factor4"] as const;
const FACTOR_ALPHA  = [0.87, 0.87, 0.91, 0.91] as const;

// 23項目ラベル（rubric.tsと同一内容）
const ITEM_LABELS = [
  /* F1  1 */ "特別支援対応力（実践）",
  /* F1  2 */ "外国語児童への指導実践",
  /* F1  3 */ "特別支援対応力（理解）",
  /* F1  4 */ "外国語児童への対応理解",
  /* F1  5 */ "性差・多様性への理解",
  /* F1  6 */ "文化的多様性への理解",
  /* F1  7 */ "教科特性を踏まえた授業設計",
  /* F2  8 */ "体験と成長の接続",
  /* F2  9 */ "指導姿勢の検証能力",
  /* F2 10 */ "模範的姿勢の実践",
  /* F2 11 */ "フィードバック受容力",
  /* F2 12 */ "実践省察と改善責任",
  /* F2 13 */ "専門性向上のための自己評価",
  /* F3 14 */ "生徒指導力",
  /* F3 15 */ "学級管理能力",
  /* F3 16 */ "リーダーシップ発揮",
  /* F3 17 */ "児童の困難支援",
  /* F4 18 */ "同僚の学習支援役割理解",
  /* F4 19 */ "特別責任を有する同僚役割の理解",
  /* F4 20 */ "人間関係・専門的期待への対応",
  /* F4 21 */ "教師役割の多様性理解",
  /* F4 22 */ "教師の権威の意味理解",
  /* F4 23 */ "職業倫理と連帯責任",
];

// 項目→因子インデックスのマッピング
function itemFactorIdx(itemNum: number): number {
  if (itemNum <= 7)  return 0;
  if (itemNum <= 13) return 1;
  if (itemNum <= 17) return 2;
  return 3;
}

// ─────────────────────────────────────────────
// 時限ブロック用ユーティリティ
// ─────────────────────────────────────────────
function parseHourRecords(content: string): HourRecord[] | null {
  try {
    const p = JSON.parse(content);
    if (p.version === 2 && Array.isArray(p.records) && p.records.length > 0) {
      return [...p.records].sort((a: HourRecord, b: HourRecord) => a.order - b.order);
    }
  } catch {}
  return null;
}

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

// ─────────────────────────────────────────────
// スコアバー
// ─────────────────────────────────────────────
function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <LinearProgress
      variant="determinate"
      value={(value / 5) * 100}
      sx={{
        height: 7, borderRadius: 4,
        bgcolor: "grey.200",
        "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 4 },
      }}
    />
  );
}

// ─────────────────────────────────────────────
// スコアチップ
// ─────────────────────────────────────────────
function ScoreChip({ score }: { score: number }) {
  const color = score >= 4 ? "#2e7d32" : score >= 3 ? "#1565c0" : score >= 2 ? "#e65100" : "#c62828";
  const bg    = score >= 4 ? "#e8f5e9" : score >= 3 ? "#e3f2fd" : score >= 2 ? "#fff3e0" : "#ffebee";
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: "50%", bgcolor: bg, border: `2px solid ${color}`, fontWeight: "bold", fontSize: 14, color }}>
      {score.toFixed(1)}
    </Box>
  );
}

// ─────────────────────────────────────────────
// 時限ブロック
// ─────────────────────────────────────────────
function HourBlockView({ rec, index }: { rec: HourRecord; index: number }) {
  const [open, setOpen] = useState(true);
  const accent = blockAccent(rec.time_label);
  const bg     = blockBg(rec.time_label);

  return (
    <Card sx={{ mb: 2, borderLeft: `5px solid ${accent}`, bgcolor: bg }}>
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
        {rec.subject && <Chip label={rec.subject} size="small" color="primary" variant="outlined" sx={{ fontSize: 11, height: 20 }} />}
        <Box sx={{ ml: "auto" }}>
          <IconButton size="small">{open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}</IconButton>
        </Box>
      </Box>
      <Collapse in={open}>
        <CardContent sx={{ pt: 1.5, pb: "12px !important" }}>
          {rec.body
            ? <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.9 }}>{rec.body}</Typography>
            : <Typography variant="body2" color="text.disabled">（記録なし）</Typography>}
        </CardContent>
      </Collapse>
    </Card>
  );
}

// ─────────────────────────────────────────────
// セクションラッパー
// ─────────────────────────────────────────────
const STATUS_CONFIG: Record<JournalStatus, { label: string; color: "default" | "primary" | "success" }> = {
  draft:     { label: "下書き",   color: "default" },
  submitted: { label: "提出済み", color: "primary" },
  evaluated: { label: "評価済み", color: "success" },
};

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

// ─────────────────────────────────────────────
// AI評価パネル（レーダー + 項目スコア + 成長曲線 + フィードバック）
// ─────────────────────────────────────────────
interface EvalPanelProps {
  currentSelfEval: any;
  evalData: EvaluationResult;
  growthData: GrowthData | undefined;
  weekNumber: number;
}

const EvaluationPanel: React.FC<EvalPanelProps> = ({ evalData, growthData, weekNumber, currentSelfEval }) => {
  const fs = evalData.factor_scores;

  // レーダーチャート用データ
  const radarData = FACTOR_LABELS.map((label, i) => ({
    factor: label,
    score:  fs[FACTOR_KEYS[i]],
    fullMark: 5,
    selfScore: currentSelfEval ? currentSelfEval[FACTOR_KEYS[i]] : undefined,
  }));

  // 成長曲線（現在の週まで）
  const growthUntilNow = (growthData?.weekly_scores ?? []).filter((w) => w.week <= weekNumber);

  // 因子別にitem群を分割
  const factorGroups: Record<string, typeof evalData.evaluation_items> = { factor1: [], factor2: [], factor3: [], factor4: [] };
  evalData.evaluation_items.forEach((item) => {
    const key = item.factor as keyof typeof factorGroups;
    if (factorGroups[key]) factorGroups[key].push(item);
  });

  return (
    <Box>
      {/* ─── ① レーダーチャート ─── */}
      <Card sx={{ mb: 2.5, border: "1.5px solid #1976d2" }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <AssessmentIcon sx={{ color: "#1976d2" }} />
            <Typography variant="subtitle1" fontWeight="bold" color="#1565c0">AI評価 — 因子別レーダーチャート</Typography>
            <Box ml="auto">
              <Chip label={`総合: ${evalData.total_score.toFixed(2)} / 5.0`} size="small" color="primary" />
            </Box>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            {/* レーダー */}
            <Grid size={{ xs: 12, md: 6 }}>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <PolarGrid />
                  <PolarAngleAxis
                    dataKey="factor"
                    tick={{ fontSize: 11, fill: "#333" }}
                    tickFormatter={(v: string) => v.length > 8 ? v.slice(0, 8) + "…" : v}
                  />
                  <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={{ fontSize: 9 }} />
                  <Legend verticalAlign="top" height={36}/>
                  <Radar name="AI評価" dataKey="score" stroke="#1976d2" fill="#1976d2" fillOpacity={0.35} />
                  {currentSelfEval && <Radar name="自己評価" dataKey="selfScore" stroke="#fb8c00" fill="#fb8c00" fillOpacity={0.35} />}
                </RadarChart>
              </ResponsiveContainer>
            </Grid>
            {/* 因子別バー */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ pt: 1 }}>
                {FACTOR_KEYS.map((key, i) => (
                  <Box key={key} mb={2}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: FACTOR_COLORS[i], flexShrink: 0 }} />
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: 12 }}>
                          {FACTOR_LABELS[i]}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          (α={FACTOR_ALPHA[i]})
                        </Typography>
                      </Box>
                      <Typography variant="body2" fontWeight="bold" color={FACTOR_COLORS[i]}>
                        {fs[key].toFixed(2)} / 5.0
                      </Typography>
                    </Box>
                    <ScoreBar value={fs[key]} color={FACTOR_COLORS[i]} />
                  </Box>
                ))}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ─── ② 23項目スコア（因子別アコーディオン）─── */}
      <Card sx={{ mb: 2.5 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <StarIcon sx={{ color: "#f57c00" }} />
            <Typography variant="subtitle1" fontWeight="bold">AI評価 — 23項目得点（因子別）</Typography>
          </Box>
          <Divider sx={{ mb: 1.5 }} />
          {FACTOR_KEYS.map((key, fi) => {
            const items = factorGroups[key];
            const avg = evalData.factor_scores ? evalData.factor_scores[key as keyof typeof evalData.factor_scores] : (items.length > 0 ? items.reduce((s, it) => s + (it.score || 0), 0) / items.length : 0);
            return (
              <Accordion key={key} disableGutters sx={{ mb: 1, border: `1px solid ${FACTOR_COLORS[fi]}30`, borderRadius: "8px !important", "&:before": { display: "none" } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: `${FACTOR_COLORS[fi]}08`, borderRadius: 2 }}>
                  <Box display="flex" alignItems="center" gap={1} width="100%">
                    <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: FACTOR_COLORS[fi], flexShrink: 0 }} />
                    <Typography variant="body2" fontWeight={700} color={FACTOR_COLORS[fi]}>
                      因子{["Ⅰ","Ⅱ","Ⅲ","Ⅳ"][fi]}　{FACTOR_LABELS[fi]}
                    </Typography>
                    <Chip label={`平均 ${avg.toFixed(2)}`} size="small" sx={{ ml: "auto", mr: 1, bgcolor: `${FACTOR_COLORS[fi]}20`, color: FACTOR_COLORS[fi], fontWeight: "bold" }} />
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "grey.50" }}>
                        <TableCell sx={{ width: 40, fontWeight: 700, fontSize: 11 }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>評価項目</TableCell>
                        <TableCell sx={{ width: 60, fontWeight: 700, fontSize: 11, textAlign: "center" }}>得点</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>エビデンス・フィードバック</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.map((item) => {
                        const itemLabel = ITEM_LABELS[item.item_number - 1] ?? `項目${item.item_number}`;
                        const scoreColor = FACTOR_COLORS[fi];
                        return (
                          <TableRow key={item.item_number} sx={{ "&:hover": { bgcolor: `${scoreColor}05` } }}>
                            <TableCell sx={{ fontSize: 11, color: "text.secondary", fontWeight: 600 }}>
                              {item.item_number}
                            </TableCell>
                            <TableCell sx={{ fontSize: 12 }}>{itemLabel}</TableCell>
                            <TableCell sx={{ textAlign: "center" }}>
                              <ScoreChip score={item.score} />
                            </TableCell>
                            <TableCell sx={{ fontSize: 11 }}>
                              {item.evidence && (
                                <Box mb={0.5}>
                                  <Typography variant="caption" color="text.secondary" fontWeight={600}>根拠：</Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                                    {item.evidence}
                                  </Typography>
                                </Box>
                              )}
                              {item.feedback && (
                                <Box mb={0.5}>
                                  <Typography variant="caption" color="text.secondary" fontWeight={600}>評価：</Typography>
                                  <Typography variant="caption">{item.feedback}</Typography>
                                </Box>
                              )}
                              {item.next_level_advice && (
                                <Box>
                                  <Typography variant="caption" color="primary" fontWeight={600}>次のステップ：</Typography>
                                  <Typography variant="caption" color="primary">{item.next_level_advice}</Typography>
                                </Box>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </CardContent>
      </Card>

      {/* ─── ③ この日誌までの成長曲線 ─── */}
      {growthUntilNow.length >= 1 && (
        <Card sx={{ mb: 2.5, border: "1.5px solid #388e3c" }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <ShowChartIcon sx={{ color: "#388e3c" }} />
              <Typography variant="subtitle1" fontWeight="bold" color="#2e7d32">
                成長曲線（Week 1 〜 Week {weekNumber}）
              </Typography>
              <Chip
                label={`今週 総合 ${growthUntilNow.slice(-1)[0]?.total.toFixed(2) ?? "—"}`}
                size="small"
                sx={{ ml: "auto", bgcolor: "#e8f5e9", color: "#2e7d32", fontWeight: "bold" }}
              />
            </Box>
            <Divider sx={{ mb: 2 }} />
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={growthUntilNow} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="week" tickFormatter={(v: number) => `W${v}`} tick={{ fontSize: 11 }} />
                <YAxis domain={[1, 5]} tickCount={5} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: number, name: string) => [val.toFixed(2), name]}
                  labelFormatter={(l: number) => `Week ${l}`}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={weekNumber > 0 ? evalData.total_score : undefined} stroke="#888" strokeDasharray="4 2" />
                {FACTOR_KEYS.map((key, i) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={FACTOR_LABELS[i]}
                    stroke={FACTOR_COLORS[i]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
                <Line
                  type="monotone"
                  dataKey="total"
                  name="総合"
                  stroke="#333"
                  strokeWidth={2.5}
                  strokeDasharray="6 2"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, textAlign: "right" }}>
              点線: 現週の総合スコア基準線
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* ─── ④ AIフィードバック（総合コメント） ─── */}
      <Card sx={{ mb: 2.5, border: "1.5px solid #7b1fa2" }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <SmartToyIcon sx={{ color: "#7b1fa2" }} />
            <Typography variant="subtitle1" fontWeight="bold" color="#6a1b9a">AIフィードバック（総合）</Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Paper variant="outlined" sx={{ p: 2.5, bgcolor: "#f3e5f5", borderRadius: 2, mb: 2 }}>
            <Box display="flex" alignItems="flex-start" gap={1}>
              <LightbulbIcon sx={{ color: "#7b1fa2", mt: 0.3, flexShrink: 0 }} />
              <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 2 }}>
                {evalData.overall_comment}
              </Typography>
            </Box>
          </Paper>

          {/* 改善提案サマリ（上位3項目） */}
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 1 }}>
            次のステップ（得点の低い項目より）
          </Typography>
          {evalData.evaluation_items
            .slice()
            .sort((a, b) => (a.score || 0) - (b.score || 0))
            .slice(0, 3)
            .map((item, rank) => {
              const fi = itemFactorIdx(item.item_number);
              return (
                <Paper
                  key={item.item_number}
                  variant="outlined"
                  sx={{ p: 1.5, mb: 1, borderLeft: `4px solid ${FACTOR_COLORS[fi]}`, bgcolor: "white" }}
                >
                  <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                    <Chip
                      label={`${rank + 1}位 項目${item.item_number}`}
                      size="small"
                      sx={{ bgcolor: `${FACTOR_COLORS[fi]}20`, color: FACTOR_COLORS[fi], fontWeight: 700, fontSize: 10 }}
                    />
                    <Typography variant="caption" fontWeight={700}>{ITEM_LABELS[item.item_number - 1]}</Typography>
                    <ScoreChip score={item.score} />
                  </Box>
                  {item.next_level_advice && (
                    <Typography variant="caption" color="primary">
                      → {item.next_level_advice}
                    </Typography>
                  )}
                </Paper>
              );
            })}

          <Box mt={1.5} display="flex" justifyContent="flex-end">
            <Typography variant="caption" color="text.disabled">
              評価項目数: {evalData.evaluated_item_count} / 23　トークン使用量: {evalData.tokens_used?.toLocaleString() ?? "—"}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

// ─────────────────────────────────────────────
// クエリフック
// ─────────────────────────────────────────────
const useJournalQuery = (id: string) => useQuery<JournalEntry>({
  queryKey: ["journal", id],
  queryFn:  () => apiClient.getJournal(id) as Promise<JournalEntry>,
  enabled:  !!id,
});

// ─────────────────────────────────────────────
// メインコンポーネント
// ─────────────────────────────────────────────
const JournalDetailPage: React.FC = () => {
  const { journalId } = useParams<{ journalId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 現在のログインユーザー（ロール判定）
  const currentUser = apiClient.getCurrentUser() as { id: string; name: string; role: string } | null;
  const userRole = currentUser?.role ?? "student";

  const { data: journal, isLoading, isError } = useJournalQuery(journalId ?? "");

  const { data: goals = [] } = useQuery({
    queryKey: ["goals"],
    queryFn: () => apiClient.getGoalHistory()
  });
  
  const currentGoal = journal ? goals.find(g => g.week === journal.week_number) : undefined;

  const { data: evalData } = useQuery<EvaluationResult>({
    queryKey: ["evaluation", journalId],
    queryFn:  () => apiClient.getEvaluation(journalId ?? ""),
    enabled:  !!journalId && journal?.status === "evaluated",
  });

  const { data: selfEvals = [] } = useQuery({
    queryKey: ["selfEvaluations"],
    queryFn: () => apiClient.getSelfEvaluations(),
    enabled: !!journal
  });
  
  const currentSelfEval: any = journal ? selfEvals.find(e => (e as any).week_number === journal.week_number) : undefined;

  const { data: growthData } = useQuery<GrowthData>({
    queryKey: ["growth"],
    queryFn:  () => apiClient.getGrowthData(),
    enabled:  !!journalId,
  });

  
  const [commentText, setCommentText] = useState("");
  const [commentSaved, setCommentSaved] = useState(false);

  useEffect(() => {
    if (journal) {
       const isIntensive = (journal as any).internship_type === "intensive";
       const existing = isIntensive
         ? (journal.school_mentor_comment ?? journal.teacher_comment ?? "")
         : (journal.univ_teacher_comment ?? journal.teacher_comment ?? "");
       setCommentText(existing);
    }
  }, [journal]);

  const commentMutation = useMutation<void, Error, string>({
    mutationFn: async (text: string) => {
      const isIntensive = (journal as any).internship_type === "intensive";
      const field = isIntensive ? "school_mentor_comment" : "univ_teacher_comment";
      await apiClient.updateJournal(journalId!, { [field]: text } as Record<string, unknown>);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["journal", journalId] });
      setCommentSaved(true);
    }
  });
  if (isLoading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
      <CircularProgress />
    </Box>
  );
  if (isError || !journal) return (
    <Box p={3}><Alert severity="error">日誌の取得に失敗しました。</Alert></Box>
  );
  const statusConfig = STATUS_CONFIG[journal.status as JournalStatus] || { label: journal.status || "不明", color: "default" };
  const formattedDate = new Date(journal.entry_date).toLocaleDateString("ja-JP", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });
  const hourRecords = parseHourRecords(journal.content);
  const isNewFormat = hourRecords !== null;

  // ── コメント入力 ──
  // 実習形態ベースでコメント種別を判定
  const internshipType = (journal as any).internship_type;
  const isIntensive = internshipType === "intensive";
  
  // 入力権限判定（実習形態に基づく）
  const canInputComment =
    (userRole === "univ_teacher" && !isIntensive) ||       // 分散実習 → 大学教員
    (userRole === "school_mentor" && isIntensive) ||        // 集中実習 → 校内指導教員
    userRole === "admin";                                   // 管理者は全対応

  // 学生自身もコメントの閲覧が可能
  const canViewComment = canInputComment || userRole === "student";

  const existingComment = isIntensive
    ? (journal?.school_mentor_comment ?? journal?.teacher_comment ?? "")
    : (journal?.univ_teacher_comment ?? journal?.teacher_comment ?? "");

  return (
    <Box maxWidth={960} mx="auto">
      {/* ヘッダーボタン */}
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/journals")} variant="outlined" size="small">
          一覧に戻る
        </Button>
        <Box flex={1} />
        {journal.status !== "evaluated" && (
          <Button
            startIcon={<EditIcon />}
            variant="outlined"
            color="secondary"
            size="small"
            onClick={() => navigate(`/journals/${journal.id}/edit`)}
          >
            編集
          </Button>
        )}
        {journal.status === "evaluated" && (
          <Button
            startIcon={<AssessmentIcon />}
            variant="contained"
            size="small"
            onClick={() => navigate(`/evaluations/${journal.id}`)}
          >
            評価詳細ページへ
          </Button>
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

      {/* ════ 日誌本文 ════ */}
      {isNewFormat ? (
        <Box mb={2}>
          <Box display="flex" alignItems="center" gap={1} mb={1.5}>
            <MenuBookIcon sx={{ color: "text.secondary" }} />
            <Typography variant="subtitle1" fontWeight="bold">時限別記録</Typography>
            <Chip label={`${hourRecords!.length} コマ`} size="small" color="primary" variant="outlined" />
            <Typography variant="caption" color="text.secondary">クリックで折りたたみ</Typography>
          </Box>
          {hourRecords!.map((rec, idx) => <HourBlockView key={rec.id} rec={rec} index={idx} />)}
        </Box>
      ) : (
        <Section icon={<MenuBookIcon />} title="授業記録">
          {/* contentがJSON形式の場合は内部のreflectionを表示、それ以外はそのまま */}
          <BodyText text={(() => {
            try {
              const p = JSON.parse(journal.content);
              // version:2形式だがrecordsが空の場合
              if (p.version === 2) return p.reflection || journal.reflection_text || null;
              return journal.content;
            } catch {
              return journal.content;
            }
          })()} />
        </Section>
      )}

      {!isNewFormat && journal.lesson_goal && (
        <Section icon={<TrackChangesIcon />} title="授業目標" color="primary.main" bgcolor="#E3F2FD" borderColor="primary.light">
          <BodyText text={journal.lesson_goal} />
        </Section>
      )}

      {/* 省察 */}
      <Section icon={<PsychologyIcon />} title="省察・振り返り" color="secondary.main" bgcolor="#F3E5F5" borderColor="#CE93D8">
        <BodyText text={journal.reflection_text} fallback="（省察テキストなし）" />
        {journal.reflection_text && (
          <Typography variant="caption" color="text.disabled" display="block" textAlign="right" mt={1}>
            {journal.reflection_text.length} 文字
          </Typography>
        )}
      </Section>

      {/* 次週への行動計画 */}
      {journal.next_action && (
        <Section icon={<TrackChangesIcon />} title="次週への行動計画" color="#1565C0" bgcolor="#E8EAF6" borderColor="#9FA8DA">
          <BodyText text={journal.next_action} />
        </Section>
      )}

      {/* ────────────────────────────────────────────────────────
          指導コメント入力フォーム（大学教員 / 校内指導教員）
          分散実習 → 大学教員が入力
          集中実習 → 校内指導教員が入力
      ──────────────────────────────────────────────────────── */}
      {canInputComment && (
        <Card sx={{
          mb: 2, border: "1px solid",
          borderColor: isIntensive ? "#FFCC80" : "#90CAF9",
          bgcolor: isIntensive ? "#FFF8E1" : "#E8F4FD",
        }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={1.5}>
              <CommentIcon sx={{ color: isIntensive ? "#E65100" : "#1565C0" }} />
              <Typography variant="subtitle2" fontWeight="bold" color={isIntensive ? "#E65100" : "#1565C0"}>
                {isIntensive ? "実習先コメントを入力（集中実習）" : "大学教員コメントを入力（分散実習）"}
              </Typography>
              <Chip
                label={isIntensive ? "校内指導教員" : "大学教員"}
                size="small"
                sx={{
                  bgcolor: isIntensive ? "#E65100" : "#1565C0",
                  color: "white", fontSize: 10, height: 18,
                }}
              />
            </Box>
            <TextField
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={isIntensive
                ? "実習先での指導内容・評価・助言を記入してください…"
                : "授業観察の所感・改善点・次週への助言を記入してください…"}
              fullWidth multiline minRows={3}
              size="small"
              sx={{ mb: 1.5, bgcolor: "#fff" }}
            />
            <Box display="flex" gap={1} justifyContent="flex-end">
              <Button
                variant="outlined"
                size="small"
                onClick={() => setCommentText(existingComment)}
                disabled={commentMutation.isPending}
              >
                リセット
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<SendIcon />}
                onClick={() => commentMutation.mutate(commentText)}
                disabled={commentMutation.isPending || commentText.trim() === ""}
                sx={{ bgcolor: isIntensive ? "#E65100" : "#1565C0" }}
              >
                コメントを保存
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* ────────────────────────────────────────────────────────
          指導コメント（実習形態で分岐・学生も閲覧可能）
          分散実習 → 大学教員コメント
          集中実習 → 実習先（校内指導教員）コメント
          後方互換: teacher_comment（旧フィールド）も表示
      ──────────────────────────────────────────────────────── */}
      {canViewComment && (
        <Box sx={{ mb: 3 }}>
          {internshipType === "distributed" || (!isIntensive && journal.student_grade && journal.student_grade <= 3) ? (
            /* 分散実習：大学教員コメント */
            (journal.univ_teacher_comment || journal.teacher_comment) && (
              <Section
                icon={<CommentIcon />}
                title="大学教員コメント"
                color="#1565C0"
                bgcolor="#E3F2FD"
                borderColor="#90CAF9"
              >
                <BodyText text={journal.univ_teacher_comment ?? journal.teacher_comment ?? ""} />
              </Section>
            )
          ) : (
            /* 集中実習：実習先（校内指導教員）コメント */
            (journal.school_mentor_comment || journal.teacher_comment) && (
              <Section
                icon={<CommentIcon />}
                title="実習先コメント"
                color="#E65100"
                bgcolor="#FFF3E0"
                borderColor="#FFCC80"
              >
                <BodyText text={journal.school_mentor_comment ?? journal.teacher_comment ?? ""} />
              </Section>
            )
          )}
        </Box>
      )}

      {/* ════ AI評価セクション（評価済み日誌のみ）════ */}
      {journal.status === "evaluated" && evalData ? (
        <Box>
          <Divider sx={{ my: 3 }}>
            <Chip
              icon={<SmartToyIcon />}
              label="AI評価結果"
              sx={{ bgcolor: "#1a237e", color: "white", fontWeight: "bold", px: 1 }}
            />
          </Divider>
          <EvaluationPanel
            evalData={evalData}
            growthData={growthData}
            weekNumber={journal.week_number}
           currentSelfEval={currentSelfEval} />
        </Box>
      ) : journal.status !== "evaluated" ? (
        <Paper
          variant="outlined"
          sx={{ p: 3, textAlign: "center", bgcolor: "grey.50", borderRadius: 2, mt: 2, mb: 3 }}
        >
          <AssessmentIcon sx={{ fontSize: 40, color: "grey.400", mb: 1, display: "block", mx: "auto" }} />
          <Typography variant="body2" color="text.secondary">
            AI評価はまだ実行されていません。提出後に自動評価が行われます。
          </Typography>
        </Paper>
      ) : null}

      {/* コメント保存完了スナック */}
      <Snackbar
        open={commentSaved}
        autoHideDuration={3000}
        onClose={() => setCommentSaved(false)}
        message="コメントを保存しました"
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
};

export default JournalDetailPage;
