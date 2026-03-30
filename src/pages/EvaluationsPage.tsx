// @ts-nocheck

import React, { useState, useEffect } from "react";
import {
  Box, Typography, Card, CardContent, Chip, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, LinearProgress, IconButton, Tooltip, TextField, MenuItem,
} from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PersonIcon from "@mui/icons-material/Person";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  FormControl, FormLabel, RadioGroup, FormControlLabel, Radio,
  Divider,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../api/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  ResponsiveContainer, Legend,
} from "recharts";

const STATUS_MAP = {
  pending:   { label: "評価中",   color: "warning" as const },
  completed: { label: "完了",     color: "success" as const },
  failed:    { label: "失敗",     color: "error"   as const },
};

const FACTOR_LABELS = ["指導技術", "自己評価", "学級経営", "学習者理解"];

export default function EvaluationsPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("all");
  const user = apiClient.getCurrentUser();
  const isEvaluator = user?.role === "evaluator";

  // 評価者アンケート用State
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyForm, setSurveyForm] = useState({ univExp: "", hasSchoolExp: "", mentorCount: "" });

  React.useEffect(() => {
    if (isEvaluator) {
      const isCompleted = localStorage.getItem("evaluator_survey_completed");
      if (!isCompleted) {
        setShowSurvey(true);
      }
    }
  }, [isEvaluator]);

  const handleSurveySubmit = () => {
    if (!surveyForm.univExp || !surveyForm.hasSchoolExp) return;
    if (surveyForm.hasSchoolExp === "yes" && !surveyForm.mentorCount) return;
    
    localStorage.setItem("evaluator_survey_completed", "true");
    setShowSurvey(false);
  };

  const { data: journals = [], isLoading } = useQuery({
    queryKey: ["journals"],
    queryFn: () => apiClient.getJournals(),
  });

  const { data: humanEvals = [] } = useQuery({ queryKey: ["humanEvaluations"], queryFn: () => apiClient.getHumanEvaluations() });
  const { data: allEvals = [] } = useQuery({
    queryKey: ["allEvaluations"],
    queryFn: () => apiClient.getAllEvaluations(),
  });

  // 評価対象は submitted / evaluated ステータスの日誌
  const safeJournals = Array.isArray(journals) ? journals : [];
  console.log("[EvaluationsPage] journals:", journals, "safeJournals:", safeJournals);
  let evalJournals = safeJournals.filter((j) =>
    j.status !== "draft" &&
    (statusFilter === "all" || j.status === statusFilter)
  );
  if (isEvaluator) {
    evalJournals = evalJournals.slice(0, 30);
  }

  // MOCK_ALL_EVALUATIONSから実際のスコアを取得
  const evalResults = evalJournals.map((j) => {
    const evalResult = allEvals.find((e) => e.journal_id === j.id);
    return {
      journalId: j.id,
      title:     j.title,
      date:      j.entry_date,
      week:      j.week_number,
      status: isEvaluator ? (humanEvals.some(he => he.journal_id === j.id) ? "completed" : "pending") : (j.status === "evaluated" ? "completed" : "pending"),
      total:     evalResult ? evalResult.total_score : null,
      f1: evalResult ? evalResult.factor_scores.factor1 : null,
      f2: evalResult ? evalResult.factor_scores.factor2 : null,
      f3: evalResult ? evalResult.factor_scores.factor3 : null,
      f4: evalResult ? evalResult.factor_scores.factor4 : null,
    };
  });

  const completed = evalResults.filter((r) => r.status === "completed");

  // 推移データ
  const trendData = completed.map((r) => ({
    week: `第${r.week}週`,
    total: r.total,
    f1: r.f1,
    f2: r.f2,
    f3: r.f3,
    f4: r.f4,
  }));

  if (isLoading) return <LinearProgress />;

  return (
    <Box>
      {/* ヘッダー */}
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <AssessmentIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>評価一覧</Typography>
        <Chip label={`${evalResults.length}件`} size="small" color="primary" />
      </Box>

      {/* サマリー */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: "総評価件数",   value: evalResults.length },
          { label: "評価完了",     value: completed.length },
          { label: "評価待ち",     value: evalResults.filter((r) => r.status === "pending").length },
          { label: "平均スコア",   value: completed.length
              ? +(completed.reduce((s, r) => s + (r.total ?? 0), 0) / completed.length).toFixed(2)
              : "–" },
        ].map((s) => (
          <Grid key={s.label} size={{ xs: 6, sm: 3 }}>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#f3f7fb" }}>
              <Typography variant="h5" fontWeight={700} color="primary">{s.value}</Typography>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {isEvaluator && (
        <Card variant="outlined" sx={{ mb: 3, bgcolor: "#e3f2fd" }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              評価タスク進捗（複数名平均分析用データ）
            </Typography>
            <Box display="flex" alignItems="center" gap={2}>
              <Box flex={1}>
                <LinearProgress variant="determinate" value={(completed.length / 30) * 100} sx={{ height: 10, borderRadius: 5 }} />
              </Box>
              <Typography variant="body2" fontWeight="bold">
                {completed.length} / 30 件
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* 推移チャート */}
      {trendData.length > 0 && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              評価スコア推移
            </Typography>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis domain={[0, 4]} />
                <RechartTooltip />
                <Legend />
                <Bar dataKey="f1" fill="#1976d2" name={FACTOR_LABELS[0]} />
                <Bar dataKey="f2" fill="#43a047" name={FACTOR_LABELS[1]} />
                <Bar dataKey="f3" fill="#fb8c00" name={FACTOR_LABELS[2]} />
                <Bar dataKey="f4" fill="#8e24aa" name={FACTOR_LABELS[3]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* フィルター */}
      <Box display="flex" gap={2} mb={2} alignItems="center">
        <TextField select label="ステータス" size="small" value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)} sx={{ width: 140 }}>
          <MenuItem value="all">全て</MenuItem>
          <MenuItem value="submitted">提出済み</MenuItem>
          <MenuItem value="evaluated">評価完了</MenuItem>
        </TextField>
      </Box>

      {/* 評価一覧テーブル */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#e3f2fd" }}>
              {["週", "日付", "タイトル", "ステータス", "総合", "F1", "F2", "F3", "F4", "操作"].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {evalResults.map((r) => (
              <TableRow key={r.journalId} hover>
                <TableCell>{r.week}</TableCell>
                <TableCell>{r.date}</TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ maxWidth: 200 }} noWrap>{r.title}</Typography>
                </TableCell>
                <TableCell>
                  <Chip label={STATUS_MAP[r.status as keyof typeof STATUS_MAP].label}
                    size="small" color={STATUS_MAP[r.status as keyof typeof STATUS_MAP].color}
                  />
                </TableCell>
                <TableCell><b>{r.total ?? "–"}</b></TableCell>
                <TableCell>{r.f1 ?? "–"}</TableCell>
                <TableCell>{r.f2 ?? "–"}</TableCell>
                <TableCell>{r.f3 ?? "–"}</TableCell>
                <TableCell>{r.f4 ?? "–"}</TableCell>
                <TableCell>
                  <Box display="flex" gap={0.5}>
                    <Tooltip title="評価詳細を見る">
                      <IconButton size="small"
                        onClick={() => navigate(`/evaluations/${r.journalId}`)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="人間評価を入力">
                      <IconButton size="small"
                        onClick={() => navigate(`/evaluations/${r.journalId}/human`)}>
                        <PersonIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 評価者用 初回アンケートダイアログ */}
      <Dialog open={showSurvey} disableEscapeKeyDown fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: "bold" }}>評価者 事前アンケート</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" paragraph>
            評価タスクを開始する前に、以下の属性についてお答えください。（分析時の属性データとしてのみ使用します）
          </Typography>

          <Box sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 3 }}>
            <FormControl fullWidth>
              <FormLabel sx={{ fontWeight: "bold", color: "text.primary", mb: 1 }}>
                1. 大学での教育実習関連科目の担当経験年数
              </FormLabel>
              <TextField
                type="number"
                size="small"
                placeholder="例: 5"
                InputProps={{ endAdornment: <Typography variant="body2" sx={{ ml: 1 }}>年</Typography> }}
                value={surveyForm.univExp}
                onChange={(e) => setSurveyForm({ ...surveyForm, univExp: e.target.value })}
              />
            </FormControl>

            <Divider />

            <FormControl fullWidth>
              <FormLabel sx={{ fontWeight: "bold", color: "text.primary" }}>
                2. 学校現場での教員経験の有無
              </FormLabel>
              <RadioGroup
                row
                value={surveyForm.hasSchoolExp}
                onChange={(e) => setSurveyForm({ ...surveyForm, hasSchoolExp: e.target.value })}
              >
                <FormControlLabel value="yes" control={<Radio />} label="あり" />
                <FormControlLabel value="no" control={<Radio />} label="なし" />
              </RadioGroup>
            </FormControl>

            {surveyForm.hasSchoolExp === "yes" && (
              <FormControl fullWidth>
                <FormLabel sx={{ fontWeight: "bold", color: "text.primary", mb: 1 }}>
                  3. 過去に教育実習生を担当した回数（学校現場で）
                </FormLabel>
                <TextField
                  type="number"
                  size="small"
                  placeholder="例: 3"
                  InputProps={{ endAdornment: <Typography variant="body2" sx={{ ml: 1 }}>回</Typography> }}
                  value={surveyForm.mentorCount}
                  onChange={(e) => setSurveyForm({ ...surveyForm, mentorCount: e.target.value })}
                />
              </FormControl>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSurveySubmit}
            disabled={
              !surveyForm.univExp ||
              !surveyForm.hasSchoolExp ||
              (surveyForm.hasSchoolExp === "yes" && !surveyForm.mentorCount)
            }
          >
            回答して評価一覧へ進む
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
