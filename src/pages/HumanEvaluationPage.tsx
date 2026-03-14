/**
 * HumanEvaluationPage.tsx
 * 人間評価入力ページ
 * 2026-03-07: rubric.ts 統一 – 全23項目のRD水準ガイドを評価スライダーに表示
 */
import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box, Button, Card, CardContent, Chip, Slider, Typography,
  Alert, Snackbar, Divider, Tooltip, Collapse, IconButton, Paper, Tab, Tabs,
  CircularProgress,
} from "@mui/material";
import ArrowBackIcon   from "@mui/icons-material/ArrowBack";
import SaveIcon        from "@mui/icons-material/Save";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ExpandMoreIcon  from "@mui/icons-material/ExpandMore";
import ExpandLessIcon  from "@mui/icons-material/ExpandLess";
import VisibilityIcon  from "@mui/icons-material/Visibility";
import { useQuery, useMutation } from "@tanstack/react-query";
import mockApi from "../api/client";
import {
  RUBRIC_ITEMS,
  RUBRIC_FACTORS,
  REFLECTION_DEPTH_LEVELS,
  getItemsByFactor,
  getRdByScore,
} from "../constants/rubric";

// 因子別カラーマップ（rubric.ts と同期）
const FACTOR_COLOR: Record<string, string> = {
  factor1: "#1976d2",
  factor2: "#388e3c",
  factor3: "#f57c00",
  factor4: "#7b1fa2",
};

// 評価値 → RD水準チップ
function RdIndicator({ score }: { score: number }) {
  const rd = getRdByScore(score);


  return (
    <Tooltip title={rd.desc} arrow>
      <Chip
        label={`${rd.rd} ${rd.label}`}
        size="small"
        sx={{
          bgcolor: rd.color,
          color: "#fff",
          fontWeight: "bold",
          fontSize: 10,
          height: 20,
          cursor: "help",
        }}
      />
    </Tooltip>
  );
}

export default function HumanEvaluationPage() {
  const navigate = useNavigate();
  const { journalId } = useParams<{ journalId?: string }>();

  const [scores, setScores] = useState<Record<number, number>>(
    Object.fromEntries(RUBRIC_ITEMS.map((item) => [item.num, 3]))
  );
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [tab, setTab] = useState(0);
  const [snackOpen, setSnackOpen] = useState(false);

  const { data: journal, isLoading, isError } = useQuery({
    queryKey: ["journal", journalId],
    queryFn:  () => mockApi.getJournal(journalId!),
    enabled:  !!journalId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => { await new Promise((r) => setTimeout(r, 600)); return scores; },
    onSuccess:  () => { setSnackOpen(true); },
  });

  if (!journalId) {
    return (
      <Box maxWidth={920} mx="auto" p={3}>
        <Alert severity="warning">ジャーナルIDが指定されていません。評価一覧ページから選択してください。</Alert>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !journal) {
    return (
      <Box maxWidth={920} mx="auto" p={3}>
        <Alert severity="error">日誌の取得に失敗しました。一覧に戻って再度お試しください。</Alert>
      </Box>
    );
  }

  const factorAvg = (factorKey: string) => {
    const items = RUBRIC_ITEMS.filter((i) => i.factor === factorKey);
    const validScores = items.map(i => scores[i.num]).filter(s => s != null) as number[];
    if (validScores.length === 0) return "0.00";
    return Math.round((validScores.reduce((s, v) => s + v, 0) / validScores.length) * 100) / 100;
  };
    const validTotalScores = RUBRIC_ITEMS.map(i => scores[i.num]).filter(s => s != null) as number[];
  const totalAvg = validTotalScores.length > 0 
    ? (Math.round((validTotalScores.reduce((s, v) => s + v, 0) / validTotalScores.length) * 100) / 100).toFixed(2)
    : "0.00";

  // 日誌本文の展開 (バージョン2対応)
  let parsedRecords: any[] = [];
  let parsedReflection = "";
  if (journal?.content) {
    try {
      const p = JSON.parse(journal.content);
      if (p.version === 2) {
        parsedRecords = p.records || [];
        parsedReflection = p.reflection || "";
      }
    } catch {
      parsedReflection = journal.content;
    }
  }

  return (
    <Box maxWidth={920} mx="auto">
      {/* ヘッダー */}
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} variant="outlined" size="small">
          戻る
        </Button>
        <Typography variant="h5" fontWeight="bold" ml={1}>人間評価入力</Typography>
        {journal && <Chip label={journal.title} size="small" variant="outlined" sx={{ ml: 1 }} />}
        <Box sx={{ ml: "auto" }}>
          <Button variant="contained" startIcon={<SaveIcon />}
            onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            評価を保存
          </Button>
        </Box>
      </Box>

      {/* 日誌内容表示（ブラインド評価） */}
      {journal && (
        <Card sx={{ mb: 3, borderLeft: "4px solid #9c27b0" }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <VisibilityIcon color="secondary" />
              <Typography variant="subtitle1" fontWeight="bold">実習日誌内容（ブラインド表示）</Typography>
              <Chip label="AI評価・他者コメント非表示" size="small" color="secondary" variant="outlined" />
            </Box>
            
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
              <Tab label="省察（リフレクション）" />
              <Tab label="事実記録（授業・活動）" />
            </Tabs>
            
            {tab === 0 && (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: "#fafafa", minHeight: 100 }}>
                <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
                  {parsedReflection || journal.reflection_text || "（省察の記述がありません）"}
                </Typography>
              </Paper>
            )}
            
            {tab === 1 && (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: "#fafafa", minHeight: 100 }}>
                {parsedRecords.length > 0 ? parsedRecords.map((r: any, i: number) => (
                  <Box key={i} mb={2}>
                    <Typography variant="subtitle2" color="primary" fontWeight="bold">[{r.time_label}] {r.subject}</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{r.body}</Typography>
                  </Box>
                )) : (
                  <Typography variant="body2" color="text.secondary">記録がありません</Typography>
                )}
              </Paper>
            )}
          </CardContent>
        </Card>
      )}

      {/* RD水準ガイド */}
      <Card sx={{ mb: 3, bgcolor: "#f8f9fa", border: "1px solid #dee2e6" }}>
        <CardContent sx={{ pb: "12px !important" }}>
          <Typography variant="subtitle2" fontWeight="bold" mb={1.5}>
            <InfoOutlinedIcon sx={{ fontSize: 16, verticalAlign: "middle", mr: 0.5 }} />
            評価基準：Hatton &amp; Smith（1995）省察深度（RD）水準 ― 全4因子・全23項目共通
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {REFLECTION_DEPTH_LEVELS.map((rd) => (
              <Tooltip key={rd.rd} title={rd.desc} arrow>
                <Chip
                  label={`${rd.score}: ${rd.rd} ${rd.label}`}
                  size="small"
                  sx={{ bgcolor: rd.color, color: "#fff", fontWeight: "bold", fontSize: 11, cursor: "help" }}
                />
              </Tooltip>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* 評価サマリ */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="bold" mb={2}>評価サマリ</Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 1 }}>
            {RUBRIC_FACTORS.map((f) => (
              <Box key={f.key} sx={{
                flex: "1 1 100px", textAlign: "center", p: 1.5, borderRadius: 2,
                bgcolor: f.color + "15", border: `2px solid ${f.color}`,
              }}>
                <Typography variant="caption" color="text.secondary">{f.roman} {f.label}</Typography>
                <Typography variant="h5" fontWeight="bold" sx={{ color: f.color }}>
                  {factorAvg(f.key)}
                </Typography>
                <RdIndicator score={Math.round(parseFloat(factorAvg(f.key)))} />
              </Box>
            ))}
            <Box sx={{
              flex: "1 1 100px", textAlign: "center", p: 1.5, borderRadius: 2,
              bgcolor: "grey.100", border: "2px solid #333",
            }}>
              <Typography variant="caption" color="text.secondary">総合平均</Typography>
              <Typography variant="h5" fontWeight="bold">{totalAvg}</Typography>
              <RdIndicator score={Math.round(parseFloat(totalAvg))} />
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 23項目評価（因子別） */}
      {RUBRIC_FACTORS.map((factor) => {
        const factorItems = getItemsByFactor(factor.key);
        return (
          <Card key={factor.key} sx={{ mb: 3, borderLeft: `4px solid ${factor.color}` }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ color: factor.color }}>
                  第{factor.roman}因子：{factor.label}
                </Typography>
                <Chip label={`α=.${String(Math.round(factor.alpha * 100)).padStart(2, "0")}`}
                  size="small" sx={{ fontSize: 10 }} />
                <Chip label={`${factorItems.length}項目`} size="small" variant="outlined" sx={{ fontSize: 10 }} />
              </Box>

              {factorItems.map((item) => {
                const currentScore = scores[item.num] ?? 3;
                const rd = getRdByScore(currentScore);
                const isExpanded = expandedItem === item.num;
                const behaviors = item.behaviors;

                return (
                  <Box key={item.num} sx={{ mb: 2.5 }}>
                    {/* 項目ヘッダー */}
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={0.5}>
                      <Box display="flex" alignItems="center" gap={1} flex={1}>
                        <Chip label={`項目${item.num}`} size="small" variant="outlined"
                          sx={{ fontSize: 10, minWidth: 44 }} />
                        <Box>
                          <Typography variant="body2" fontWeight="medium">{item.label}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                            λ={item.lambda}
                          </Typography>
                        </Box>
                      </Box>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Chip
                          label={currentScore}
                          size="small"
                          color={currentScore >= 4 ? "success" : currentScore >= 3 ? "primary" : currentScore >= 2 ? "warning" : "error"}
                          sx={{ fontWeight: "bold", minWidth: 32 }}
                        />
                        <RdIndicator score={currentScore} />
                        <Tooltip title="行動指標を表示">
                          <IconButton size="small" onClick={() => setExpandedItem(isExpanded ? null : item.num)}>
                            {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    {/* スライダー */}
                    <Slider
                      value={currentScore}
                      onChange={(_, v) => setScores((prev) => ({ ...prev, [item.num]: v as number }))}
                      min={1} max={5} step={1}
                      marks={REFLECTION_DEPTH_LEVELS.map((r) => ({
                        value: r.score,
                        label: (
                          <Typography
                            component="span"
                            sx={{ fontSize: 9, color: r.color, fontWeight: "bold" }}
                          >
                            {r.rd}
                          </Typography>
                        ),
                      }))}
                      sx={{
                        color: factor.color, py: 0.5,
                        "& .MuiSlider-track": { bgcolor: rd.color },
                        "& .MuiSlider-thumb": { bgcolor: rd.color },
                      }}
                    />

                    {/* 行動指標展開パネル */}
                    <Collapse in={isExpanded}>
                      <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, bgcolor: "#fafafa" }}>
                        <Typography variant="caption" fontWeight="bold" color="text.secondary" mb={1} display="block">
                          📋 行動指標（日誌記述の評価基準）― {item.text}
                        </Typography>
                        {behaviors.slice().reverse().map((beh) => {
                          const isSelected = beh.score === currentScore;
                          const brd = getRdByScore(beh.score);
                          return (
                            <Box
                              key={beh.score}
                              sx={{
                                display: "flex", gap: 1, mb: 0.8, p: 0.8,
                                borderRadius: 1, cursor: "pointer",
                                bgcolor: isSelected ? brd.color + "22" : "transparent",
                                border: isSelected ? `1px solid ${brd.color}` : "1px solid transparent",
                                "&:hover": { bgcolor: brd.color + "11" },
                              }}
                              onClick={() => setScores((prev) => ({ ...prev, [item.num]: beh.score }))}
                            >
                              <Chip
                                label={`${beh.score} ${beh.rd}`}
                                size="small"
                                sx={{
                                  bgcolor: brd.color, color: "#fff",
                                  fontWeight: "bold", fontSize: 10, minWidth: 68, flexShrink: 0,
                                }}
                              />
                              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                                {beh.indicator}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Paper>
                    </Collapse>

                    <Divider sx={{ mt: 1.5 }} />
                  </Box>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {/* 保存ボタン（下部） */}
      <Box display="flex" justifyContent="flex-end" mt={2} mb={4}>
        <Button variant="contained" size="large" startIcon={<SaveIcon />}
          onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          評価を保存
        </Button>
      </Box>

      <Snackbar open={snackOpen} autoHideDuration={3000} onClose={() => setSnackOpen(false)}
        message="評価を保存しました" anchorOrigin={{ vertical: "bottom", horizontal: "center" }} />
    </Box>
  );
}
