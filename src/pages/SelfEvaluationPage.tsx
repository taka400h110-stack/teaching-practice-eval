/**
 * SelfEvaluationPage.tsx
 * 自己評価入力・履歴ページ
 */
import React, { useState } from "react";
import {
  Box, Button, Card, CardContent, Chip, Divider, Grid, Paper,
  Slider, Typography, Alert, Snackbar, LinearProgress,
} from "@mui/material";
import SelfImprovementIcon from "@mui/icons-material/SelfImprovement";
import SaveIcon            from "@mui/icons-material/Save";
import HistoryIcon         from "@mui/icons-material/History";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import mockApi from "../api/client";
import type { SelfEvaluation } from "../types";

const FACTOR_LABELS = ["児童生徒への指導力", "自己評価力", "学級経営力", "職務を理解して行動する力"];
const FACTOR_COLORS = ["#1976d2", "#388e3c", "#f57c00", "#7b1fa2"];
const FACTOR_KEYS   = ["factor1", "factor2", "factor3", "factor4"] as const;

const SCORE_MARKS = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5" },
];

const LEVEL_DESC: Record<number, string> = {
  1: "まだ意識できていない",
  2: "意識し始めている",
  3: "ある程度実践できている",
  4: "安定して実践できている",
  5: "高いレベルで実践できている",
};

function ScoreSlider({
  label, value, color, onChange,
}: { label: string; value: number; color: string; onChange: (v: number) => void }) {
  return (
    <Box mb={2.5}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
        <Typography variant="subtitle2" fontWeight="bold" color={color}>{label}</Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Chip label={value.toFixed(1)} size="small" sx={{ bgcolor: color, color: "white", fontWeight: "bold", minWidth: 44 }} />
          <Typography variant="caption" color="text.secondary">{LEVEL_DESC[Math.round(value)]}</Typography>
        </Box>
      </Box>
      <Slider
        value={value}
        onChange={(_, v) => onChange(v as number)}
        min={1} max={5} step={0.5}
        marks={SCORE_MARKS}
        valueLabelDisplay="auto"
        sx={{
          color,
          "& .MuiSlider-markLabel": { fontSize: 11 },
          "& .MuiSlider-thumb": { width: 18, height: 18 },
        }}
      />
    </Box>
  );
}

function MiniRadar({ scores, size = 120 }: { scores: number[]; size?: number }) {
  const cx = size / 2, cy = size / 2;
  const r  = size * 0.36;
  const n  = scores.length;
  const points = scores.map((s, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const ratio = s / 5;
    return { x: cx + r * ratio * Math.cos(angle), y: cy + r * ratio * Math.sin(angle) };
  });
  const gridLevels = [1,2,3,4,5];

  return (
    <svg width={size} height={size}>
      {gridLevels.map((lv) => {
        const pts = Array.from({ length: n }, (_, i) => {
          const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
          return `${cx + r * (lv/5) * Math.cos(angle)},${cy + r * (lv/5) * Math.sin(angle)}`;
        });
        return <polygon key={lv} points={pts.join(" ")} fill="none" stroke="#e0e0e0" strokeWidth={1} />;
      })}
      {Array.from({ length: n }, (_, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        return <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(angle)} y2={cy + r * Math.sin(angle)} stroke="#ccc" strokeWidth={1} />;
      })}
      <polygon
        points={points.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="rgba(25,118,210,0.25)" stroke="#1976d2" strokeWidth={1.5}
      />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={FACTOR_COLORS[i]} />
      ))}
    </svg>
  );
}

export default function SelfEvaluationPage() {
  const [scores, setScores] = useState<Record<string, number>>({
    factor1: 3.0, factor2: 3.0, factor3: 3.0, factor4: 3.0,
  });
  const [snack, setSnack] = useState(false);

  const { data: history = [] } = useQuery({
    queryKey: ["selfEvals"],
    queryFn:  () => mockApi.getSelfEvaluations(),
  });
  const { data: aiGrowth } = useQuery({
    queryKey: ["growth"],
    queryFn:  () => mockApi.getGrowthData(),
  });

  const aiLatest = aiGrowth?.weekly_scores.slice(-1)[0];
  const total = Math.round(((scores.factor1 * 7 + scores.factor2 * 6 + scores.factor3 * 4 + scores.factor4 * 6) / 23) * 100) / 100;
  const historyLatest: SelfEvaluation | undefined = history[history.length - 1];

  const queryClient = useQueryClient();
  const saveMutation = useMutation({
    mutationFn: () => mockApi.saveSelfEvaluation({
      week:    historyLatest ? historyLatest.week + 1 : 1,
      factor1: scores.factor1,
      factor2: scores.factor2,
      factor3: scores.factor3,
      factor4: scores.factor4,
      total,
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["selfEvals"] });
      setSnack(true);
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        <SelfImprovementIcon sx={{ verticalAlign: "middle", mr: 0.5 }} />
        自己評価
      </Typography>

      <Grid container spacing={2}>
        {/* 入力フォーム */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="subtitle1" fontWeight="bold">今週の自己評価入力</Typography>
                <Chip label={`総合 ${total}`} color="primary" sx={{ fontWeight: "bold" }} />
              </Box>
              <Divider sx={{ mb: 2 }} />

              {FACTOR_KEYS.map((fk, i) => (
                <ScoreSlider
                  key={fk}
                  label={FACTOR_LABELS[i]}
                  value={scores[fk]}
                  color={FACTOR_COLORS[i]}
                  onChange={(v) => setScores((prev) => ({ ...prev, [fk]: v }))}
                />
              ))}

              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                fullWidth
                sx={{ mt: 1 }}
              >
                自己評価を記録する
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* サマリ・比較 */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight="bold" mb={1.5}>現在のスコア</Typography>
              <Box display="flex" alignItems="center" gap={2}>
                <MiniRadar scores={FACTOR_KEYS.map((fk) => scores[fk])} />
                <Box sx={{ flex: 1 }}>
                  {FACTOR_KEYS.map((fk, i) => (
                    <Box key={fk} mb={1}>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="caption" color={FACTOR_COLORS[i]} fontWeight={600}>
                          {FACTOR_LABELS[i].slice(0, 5)}
                        </Typography>
                        <Typography variant="caption" fontWeight="bold">{scores[fk].toFixed(1)}</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(scores[fk] / 5) * 100}
                        sx={{ height: 6, borderRadius: 3, bgcolor: "grey.200",
                          "& .MuiLinearProgress-bar": { bgcolor: FACTOR_COLORS[i] } }}
                      />
                    </Box>
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* AI評価との比較 */}
          {aiLatest && (
            <Card sx={{ mb: 2, border: "1.5px solid #e3f2fd" }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight="bold" mb={1.5}>
                  AI評価との比較（Week {aiLatest.week}）
                </Typography>
                {FACTOR_KEYS.map((fk, i) => {
                  const aiScore   = aiLatest[fk];
                  const selfScore = scores[fk];
                  const diff      = +(selfScore - aiScore).toFixed(2);
                  return (
                    <Box key={fk} mb={1}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color={FACTOR_COLORS[i]}>{FACTOR_LABELS[i].slice(0, 5)}</Typography>
                        <Box display="flex" gap={0.5} alignItems="center">
                          <Chip label={`自己 ${selfScore.toFixed(1)}`} size="small" variant="outlined" sx={{ fontSize: 10, height: 18 }} />
                          <Chip label={`AI ${aiScore.toFixed(2)}`}     size="small" sx={{ fontSize: 10, height: 18, bgcolor: FACTOR_COLORS[i], color: "white" }} />
                          <Typography variant="caption" fontWeight="bold" color={diff > 0 ? "success.main" : diff < 0 ? "error.main" : "text.secondary"}>
                            {diff > 0 ? "+" : ""}{diff}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* 履歴 */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" mb={2}>
                <HistoryIcon sx={{ verticalAlign: "middle", mr: 0.5, fontSize: 18 }} />
                自己評価履歴
              </Typography>
              <Box sx={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e0e0e0" }}>
                      <th style={{ textAlign: "left", padding: "6px 8px", color: "#666" }}>Week</th>
                      {FACTOR_LABELS.map((l, i) => (
                        <th key={l} style={{ textAlign: "center", padding: "6px 8px", color: FACTOR_COLORS[i] }}>{l.slice(0, 4)}</th>
                      ))}
                      <th style={{ textAlign: "center", padding: "6px 8px", color: "#1565C0", fontWeight: "bold" }}>総合</th>
                      {aiLatest && <th style={{ textAlign: "center", padding: "6px 8px", color: "#666" }}>AI評価</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((se: SelfEvaluation, idx) => {
                      const aiScore = aiGrowth?.weekly_scores.find((w) => w.week === se.week);
                      return (
                        <tr key={se.id} style={{ borderBottom: "1px solid #f0f0f0", background: idx % 2 === 0 ? "#fafafa" : "#fff" }}>
                          <td style={{ padding: "6px 8px" }}>Week {se.week}</td>
                          {FACTOR_KEYS.map((fk, i) => (
                            <td key={fk} style={{ textAlign: "center", padding: "6px 8px", color: FACTOR_COLORS[i] }}>{se[fk].toFixed(1)}</td>
                          ))}
                          <td style={{ textAlign: "center", padding: "6px 8px", fontWeight: "bold", color: "#1565C0" }}>{se.total.toFixed(2)}</td>
                          {aiLatest && (
                            <td style={{ textAlign: "center", padding: "6px 8px", color: "#666" }}>
                              {aiScore ? aiScore.total.toFixed(2) : "—"}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar open={snack} autoHideDuration={3000} onClose={() => setSnack(false)}
        message="自己評価を記録しました" anchorOrigin={{ vertical: "bottom", horizontal: "center" }} />
    </Box>
  );
}
