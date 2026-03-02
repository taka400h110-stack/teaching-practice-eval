import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Button, Card, CardContent, Chip, CircularProgress, Alert,
  LinearProgress, Typography, Divider,
} from "@mui/material";
import ArrowBackIcon  from "@mui/icons-material/ArrowBack";
import AssessmentIcon from "@mui/icons-material/Assessment";
import { useQuery } from "@tanstack/react-query";
import mockApi from "../api/client";

const FACTOR_LABELS = ["因子I 指導実践力", "因子II 自己評価力", "因子III 学級経営力", "因子IV 役割理解"];

export default function EvaluationResultPage() {
  const { journalId } = useParams<{ journalId: string }>();
  const navigate = useNavigate();

  const { data: ev, isLoading, isError } = useQuery({
    queryKey: ["evaluation", journalId],
    queryFn:  () => mockApi.getEvaluation(journalId!),
    enabled:  !!journalId,
  });

  if (isLoading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh"><CircularProgress /></Box>;
  if (isError || !ev) return <Box p={3}><Alert severity="error">評価結果の取得に失敗しました。</Alert></Box>;

  const factors = [ev.factor_scores.factor1, ev.factor_scores.factor2, ev.factor_scores.factor3, ev.factor_scores.factor4];

  return (
    <Box maxWidth={900} mx="auto">
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(`/journals/${journalId}`)} variant="outlined" size="small">日誌に戻る</Button>
        <Typography variant="h5" fontWeight="bold" ml={1}>AI評価結果</Typography>
      </Box>

      {/* 総合スコア */}
      <Card sx={{ mb: 3, borderLeft: "4px solid", borderColor: "primary.main" }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <AssessmentIcon color="primary" sx={{ fontSize: 36 }} />
            <Box>
              <Typography variant="h3" fontWeight="bold" color="primary">{ev.total_score.toFixed(2)}</Typography>
              <Typography variant="caption" color="text.secondary">総合スコア / 5.0</Typography>
            </Box>
            <Chip label={`評価済み項目: ${ev.evaluated_item_count}/23`} color="success" sx={{ ml: "auto" }} />
          </Box>
          <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>{ev.overall_comment}</Typography>
        </CardContent>
      </Card>

      {/* 因子別スコア */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="bold" mb={2}>因子別スコア</Typography>
          {factors.map((score, i) => (
            <Box key={i} mb={2}>
              <Box display="flex" justifyContent="space-between" mb={0.5}>
                <Typography variant="body2" fontWeight="bold">{FACTOR_LABELS[i]}</Typography>
                <Typography variant="body2" fontWeight="bold">{score.toFixed(2)} / 5.0</Typography>
              </Box>
              <LinearProgress
                variant="determinate" value={(score / 5) * 100}
                sx={{ height: 10, borderRadius: 5 }}
                color={score >= 4 ? "success" : score >= 3 ? "primary" : score >= 2 ? "warning" : "error"}
              />
            </Box>
          ))}
        </CardContent>
      </Card>

      {/* 項目別結果 */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="bold" mb={2}>項目別評価</Typography>
          {ev.evaluation_items.map((item) => (
            <Box key={item.item_number} sx={{ mb: 2, pb: 2, borderBottom: "1px solid", borderColor: "divider" }}>
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                <Chip label={`項目${item.item_number}`} size="small" variant="outlined" />
                <Chip label={item.factor} size="small" color="primary" variant="outlined" sx={{ fontSize: 10 }} />
                {item.score !== null && (
                  <Chip label={`${item.score}/5`} size="small" color={item.score >= 4 ? "success" : item.score >= 3 ? "primary" : "warning"} />
                )}
              </Box>
              {item.evidence && <Typography variant="body2" color="text.secondary" mb={0.5}><strong>根拠：</strong>{item.evidence}</Typography>}
              {item.feedback && <Typography variant="body2" mb={0.5}><strong>フィードバック：</strong>{item.feedback}</Typography>}
              {item.next_level_advice && <Typography variant="body2" color="primary"><strong>アドバイス：</strong>{item.next_level_advice}</Typography>}
            </Box>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
}
