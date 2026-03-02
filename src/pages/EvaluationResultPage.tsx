/**
 * EvaluationResultPage.tsx
 * AI評価結果ページ - 23項目詳細、因子別スコア、総合コメント
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
import { useQuery }       from "@tanstack/react-query";
import mockApi from "../api/client";
import type { EvaluationItem } from "../types";

const FACTOR_LABELS = ["授業設計・実施", "学習支援・指導", "学級経営", "省察・成長"];
const FACTOR_COLORS = ["#1976d2", "#388e3c", "#f57c00", "#7b1fa2"];
const FACTOR_KEYS   = ["factor1", "factor2", "factor3", "factor4"] as const;

// 23項目のラベル
const ITEM_LABELS: string[] = [
  /* F1 1-7  */ "学習目標の明確化と板書",
  "教材・教具の準備と活用",
  "発問の質と配置",
  "授業の流れと時間管理",
  "ICT・視覚的資料の活用",
  "個別最適化の工夫",
  "評価活動の組み込み",
  /* F2 8-13 */ "児童・生徒理解と支援",
  "特別支援への配慮",
  "多様な学習形態の活用",
  "言葉かけ・フィードバック",
  "学習意欲の引き出し",
  "つまずきへの即時対応",
  /* F3 14-19*/ "学級規律と生活指導",
  "人間関係の構築支援",
  "安全・安心な環境整備",
  "健康観察と保健対応",
  "学校行事・特別活動",
  "保護者・地域連携",
  /* F4 20-23*/ "授業後の省察の深さ",
  "SMART目標の設定",
  "指導技術の改善行動",
  "継続的成長への意欲",
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

// レーダーチャート（SVG実装）
function RadarChart({ scores, size = 200 }: { scores: number[]; size?: number }) {
  const cx = size / 2, cy = size / 2;
  const r  = size * 0.38;
  const n  = scores.length;
  const points = scores.map((s, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const ratio = s / 5;
    return { x: cx + r * ratio * Math.cos(angle), y: cy + r * ratio * Math.sin(angle) };
  });
  const gridLevels = [1,2,3,4,5];
  const labels = ["授業設計", "学習支援", "学級経営", "省察"];
  const labelRadius = r * 1.22;

  return (
    <svg width={size} height={size} style={{ display: "block", margin: "0 auto" }}>
      {/* グリッド */}
      {gridLevels.map((lv) => {
        const pts = Array.from({ length: n }, (_, i) => {
          const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
          return `${cx + r * (lv/5) * Math.cos(angle)},${cy + r * (lv/5) * Math.sin(angle)}`;
        });
        return <polygon key={lv} points={pts.join(" ")} fill="none" stroke="#e0e0e0" strokeWidth={1} />;
      })}
      {/* 軸 */}
      {Array.from({ length: n }, (_, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        return <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(angle)} y2={cy + r * Math.sin(angle)} stroke="#bdbdbd" strokeWidth={1} />;
      })}
      {/* スコア領域 */}
      <polygon
        points={points.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="rgba(25,118,210,0.25)"
        stroke="#1976d2"
        strokeWidth={2}
      />
      {/* 点 */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill={FACTOR_COLORS[i]} />
      ))}
      {/* ラベル */}
      {labels.map((lb, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        return (
          <text key={i}
            x={cx + labelRadius * Math.cos(angle)}
            y={cy + labelRadius * Math.sin(angle)}
            textAnchor="middle" dominantBaseline="central"
            fontSize={11} fontWeight="bold" fill={FACTOR_COLORS[i]}
          >
            {lb}
          </text>
        );
      })}
    </svg>
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

  const factorScores = [
    result.factor_scores.factor1,
    result.factor_scores.factor2,
    result.factor_scores.factor3,
    result.factor_scores.factor4,
  ];

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
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ textAlign: "center", bgcolor: "#e3f2fd", p: 1 }}>
            <CardContent>
              <Typography variant="h2" fontWeight="bold" color="primary">
                {result.total_score.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">総合スコア / 5.0</Typography>
              <LinearProgress
                variant="determinate"
                value={(result.total_score / 5) * 100}
                sx={{ mt: 1, height: 8, borderRadius: 4 }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ bgcolor: "#e8f5e9" }}>
            <CardContent>
              <Box display="flex" justifyContent="center" mb={1}>
                <RadarChart scores={factorScores} size={180} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ bgcolor: "#f3e5f5" }}>
            <CardContent>
              {FACTOR_KEYS.map((fk, i) => (
                <Box key={fk} mb={1.5}>
                  <Box display="flex" justifyContent="space-between" mb={0.3}>
                    <Typography variant="caption" fontWeight={600} color={FACTOR_COLORS[i]}>{FACTOR_LABELS[i]}</Typography>
                    <Typography variant="caption" fontWeight="bold">{result.factor_scores[fk].toFixed(2)}</Typography>
                  </Box>
                  <ScoreBar value={result.factor_scores[fk]} color={FACTOR_COLORS[i]} />
                </Box>
              ))}
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" color="text.secondary">
                評価項目数: {result.evaluated_item_count} / トークン使用: {result.tokens_used.toLocaleString()}
              </Typography>
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

      {/* 評価項目詳細 */}
      <Card>
        <CardContent>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label="全項目" />
            {FACTOR_LABELS.map((l, i) => (
              <Tab key={l} label={l} sx={{ color: FACTOR_COLORS[i], minWidth: 0 }} />
            ))}
          </Tabs>

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
        </CardContent>
      </Card>
    </Box>
  );
}
