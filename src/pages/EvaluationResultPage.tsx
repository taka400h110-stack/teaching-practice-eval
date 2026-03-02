/**
 * EvaluationResultPage.tsx
 * AI評価結果ページ - 23項目詳細、因子別スコア、recharts レーダーチャート
 */
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Collapse, Divider, Grid, LinearProgress, Paper, Tab, Tabs, Typography,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton,
} from "@mui/material";
import ArrowBackIcon      from "@mui/icons-material/ArrowBack";
import AssessmentIcon     from "@mui/icons-material/Assessment";
import ExpandMoreIcon     from "@mui/icons-material/ExpandMore";
import ExpandLessIcon     from "@mui/icons-material/ExpandLess";
import CheckCircleIcon    from "@mui/icons-material/CheckCircle";
import InfoIcon           from "@mui/icons-material/Info";
import StarIcon           from "@mui/icons-material/Star";
import LightbulbIcon      from "@mui/icons-material/Lightbulb";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine,
} from "recharts";
import { useQuery }       from "@tanstack/react-query";
import mockApi from "../api/client";
import type { EvaluationItem } from "../types";

const FACTOR_LABELS = ["授業設計・実施", "学習支援・指導", "学級経営", "省察・成長"];
const FACTOR_COLORS = ["#1976d2", "#388e3c", "#f57c00", "#7b1fa2"];
const FACTOR_KEYS   = ["factor1", "factor2", "factor3", "factor4"] as const;

// 23項目のラベル
const ITEM_LABELS: string[] = [
  /* F1 1-7  */ "特別支援が必要な児童への適切な対応",
  "母語が異なる児童への対応・指導",
  "特別支援が必要な児童への対応理解",
  "母語が異なる児童への対応理解",
  "性別に関わる心理的・行動的差異の理解",
  "社会的・文化的影響への理解",
  "教科の特性に基づいた授業設計",
  /* F2 8-13 */ "実習経験と教員としての仕事の関連付け",
  "教育活動を評価する能力",
  "積極的な価値・態度の実践",
  "フィードバックの受容と活用",
  "実践を振り返り専門的成長に責任を持つ",
  "自己評価能力の維持",
  /* F3 14-17*/ "学級運営と生徒指導",
  "安全で効果的な学習環境の構築",
  "学習における秩序と社会的に許容される行動の確立",
  "個別対応と集団への関わり",
  /* F4 18-23*/ "同僚としての役割認識",
  "職責の遂行と専門的責任",
  "学習困難の早期発見と対応",
  "行動・学習特性の理解",
  "知的発達段階の理解",
  "発達と学習方法の理解",
];

function ScoreChip({ score }: { score: number | null }) {
  if (score === null) return <Chip label="未評価" size="small" variant="outlined" />;
  const color = score >= 4 ? "success" : score >= 3 ? "primary" : score >= 2 ? "warning" : "error";
  return (
    <Chip
      label={score.toFixed(1)}
      size="small"
      color={color}
      sx={{ fontWeight: "bold", minWidth: 44 }}
    />
  );
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <LinearProgress
      variant="determinate"
      value={(value / 5) * 100}
      sx={{
        height: 10, borderRadius: 5, bgcolor: "grey.200",
        "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 5 },
      }}
    />
  );
}

// 評価項目行
function ItemRow({ item, label, expanded, onToggle }: {
  item: EvaluationItem; label: string; expanded: boolean; onToggle: () => void;
}) {
  return (
    <>
      <TableRow
        sx={{ cursor: "pointer", "&:hover": { bgcolor: "grey.50" } }}
        onClick={onToggle}
      >
        <TableCell sx={{ width: 36, py: 0.8 }}>
          <Typography variant="caption" color="text.secondary">{item.item_number}</Typography>
        </TableCell>
        <TableCell sx={{ py: 0.8 }}>
          <Typography variant="body2">{label}</Typography>
        </TableCell>
        <TableCell sx={{ py: 0.8, textAlign: "center", width: 60 }}>
          <ScoreChip score={item.score} />
        </TableCell>
        <TableCell sx={{ py: 0.8, width: 30 }}>
          <IconButton size="small">{expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}</IconButton>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={4} sx={{ py: 0, px: 2, bgcolor: "grey.50" }}>
            <Collapse in={expanded}>
              <Box sx={{ py: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
                {item.evidence && (
                  <Box>
                    <Typography variant="caption" fontWeight="bold" color="text.secondary">
                      <InfoIcon sx={{ fontSize: 12, verticalAlign: "middle", mr: 0.3 }} />根拠テキスト
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 1, mt: 0.3, bgcolor: "#fff" }}>
                      <Typography variant="body2" color="text.secondary">{item.evidence}</Typography>
                    </Paper>
                  </Box>
                )}
                {item.feedback && (
                  <Box>
                    <Typography variant="caption" fontWeight="bold" color="primary.main">
                      <CheckCircleIcon sx={{ fontSize: 12, verticalAlign: "middle", mr: 0.3 }} />フィードバック
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.3 }}>{item.feedback}</Typography>
                  </Box>
                )}
                {item.next_level_advice && (
                  <Box>
                    <Typography variant="caption" fontWeight="bold" color="warning.main">
                      <LightbulbIcon sx={{ fontSize: 12, verticalAlign: "middle", mr: 0.3 }} />次レベルへのアドバイス
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.3 }} color="warning.dark">{item.next_level_advice}</Typography>
                  </Box>
                )}
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function EvaluationResultPage() {
  const { journalId } = useParams<{ journalId: string }>();
  const navigate      = useNavigate();
  const [tab, setTab] = useState(0);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const { data: result, isLoading, isError } = useQuery({
    queryKey: ["evaluation", journalId],
    queryFn:  () => mockApi.getEvaluation(journalId!),
    enabled:  !!journalId,
  });

  const toggleItem = (n: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });
  };

  if (isLoading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh"><CircularProgress /></Box>;
  if (isError || !result) return <Box p={3}><Alert severity="error">評価結果の取得に失敗しました。</Alert></Box>;

  const factorScores = FACTOR_KEYS.map((fk) => result.factor_scores[fk]);

  // レーダーチャート用データ
  const radarData = FACTOR_LABELS.map((label, i) => ({
    factor: label.slice(0, 6),
    スコア: factorScores[i],
    基準値: 3.0,
  }));

  // 因子別バーチャート用データ
  const barData = FACTOR_LABELS.map((label, i) => ({
    name: label,
    スコア: factorScores[i],
  }));

  // 23項目スコア棒グラフ用データ
  const itemBarData = result.evaluation_items.map((item) => ({
    name: `${item.item_number}`,
    スコア: item.score ?? 0,
    因子: item.factor,
  }));

  return (
    <Box maxWidth={1000} mx="auto">
      {/* ヘッダー */}
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} variant="outlined" size="small">戻る</Button>
        <Typography variant="h5" fontWeight="bold" ml={1}>
          <AssessmentIcon sx={{ verticalAlign: "middle", mr: 0.5 }} />AI評価結果
        </Typography>
        <Chip label={result.status === "completed" ? "評価完了" : result.status} color={result.status === "completed" ? "success" : "default"} />
      </Box>

      {/* サマリカード */}
      <Grid container spacing={2} mb={3}>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card sx={{ textAlign: "center", bgcolor: "#e3f2fd", height: "100%" }}>
            <CardContent>
              <Typography variant="h2" fontWeight="bold" color="primary">
                {result.total_score.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={1}>総合スコア / 5.0</Typography>
              <LinearProgress
                variant="determinate"
                value={(result.total_score / 5) * 100}
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Box mt={1.5}>
                <Typography variant="caption" color="text.secondary">
                  評価項目数: {result.evaluated_item_count}
                </Typography>
                <br />
                <Typography variant="caption" color="text.secondary">
                  トークン: {result.tokens_used.toLocaleString()}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 5 }}>
          <Card sx={{ bgcolor: "#e8f5e9", height: "100%" }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight="bold" mb={1} textAlign="center">因子別レーダー</Typography>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="factor" tick={{ fontSize: 11 }} />
                  <Radar name="スコア" dataKey="スコア" stroke="#1976d2" fill="#1976d2" fillOpacity={0.35} />
                  <Radar name="基準値" dataKey="基準値" stroke="#bdbdbd" fill="#bdbdbd" fillOpacity={0.15} strokeDasharray="4 2" />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ bgcolor: "#f3e5f5", height: "100%" }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight="bold" mb={1.5}>因子別スコア</Typography>
              {FACTOR_KEYS.map((fk, i) => (
                <Box key={fk} mb={1.5}>
                  <Box display="flex" justifyContent="space-between" mb={0.3}>
                    <Typography variant="caption" fontWeight={600} color={FACTOR_COLORS[i]}>{FACTOR_LABELS[i].slice(0, 6)}</Typography>
                    <Typography variant="caption" fontWeight="bold">{result.factor_scores[fk].toFixed(2)}/5.0</Typography>
                  </Box>
                  <ScoreBar value={result.factor_scores[fk]} color={FACTOR_COLORS[i]} />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 総合コメント */}
      <Card sx={{ mb: 3, border: "1.5px solid", borderColor: "primary.light" }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <StarIcon color="primary" />
            <Typography variant="subtitle1" fontWeight="bold">総合コメント</Typography>
          </Box>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: "#E3F2FD", borderRadius: 2 }}>
            <Typography variant="body1" sx={{ lineHeight: 1.9 }}>{result.overall_comment}</Typography>
          </Paper>
        </CardContent>
      </Card>

      {/* タブ */}
      <Card>
        <CardContent>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label="全項目" />
            {FACTOR_LABELS.map((l, i) => (
              <Tab key={l} label={l.slice(0,4)} sx={{ color: FACTOR_COLORS[i], minWidth: 0, fontSize: 12 }} />
            ))}
            <Tab label="グラフ" />
          </Tabs>

          {/* 全項目 + 因子別 */}
          {[null, ...FACTOR_KEYS].map((fk, tabIdx) => {
            if (tab !== tabIdx) return null;
            const items = fk
              ? result.evaluation_items.filter((it) => it.factor === fk)
              : result.evaluation_items;
            const fIdx = FACTOR_KEYS.indexOf(fk as typeof FACTOR_KEYS[number]);

            return (
              <TableContainer key={tabIdx} component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: fIdx >= 0 ? `${FACTOR_COLORS[fIdx]}15` : "grey.100" }}>
                      <TableCell sx={{ width: 36, fontWeight: "bold" }}>#</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>評価項目</TableCell>
                      <TableCell sx={{ width: 60, textAlign: "center", fontWeight: "bold" }}>スコア</TableCell>
                      <TableCell sx={{ width: 30 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item) => (
                      <ItemRow
                        key={item.item_number}
                        item={item}
                        label={ITEM_LABELS[item.item_number - 1] ?? `項目${item.item_number}`}
                        expanded={expandedItems.has(item.item_number)}
                        onToggle={() => toggleItem(item.item_number)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            );
          })}

          {/* グラフタブ */}
          {tab === 5 && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" fontWeight="bold" mb={1}>因子別スコア比較</Typography>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={barData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 5]} ticks={[0,1,2,3,4,5]} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <ReferenceLine x={3} stroke="#e0e0e0" strokeDasharray="4 2" />
                    <Bar dataKey="スコア" fill="#1976d2" />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" fontWeight="bold" mb={1}>23項目スコア分布</Typography>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={itemBarData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} label={{ value: "項目番号", position: "insideBottom", offset: -2, fontSize: 11 }} />
                    <YAxis domain={[0, 5]} ticks={[0,1,2,3,4,5]} />
                    <Tooltip formatter={(v, n) => [v, "スコア"]} labelFormatter={(l) => `項目${l}: ${ITEM_LABELS[+l - 1] ?? ""}`} />
                    <ReferenceLine y={3} stroke="#e0e0e0" strokeDasharray="4 2" />
                    <Bar dataKey="スコア" fill="#1976d2" />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
