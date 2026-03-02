import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box, Button, Card, CardContent, Chip, Slider, Typography,
  Alert, Snackbar, LinearProgress, Divider,
} from "@mui/material";
import ArrowBackIcon  from "@mui/icons-material/ArrowBack";
import SaveIcon       from "@mui/icons-material/Save";
import { useQuery, useMutation } from "@tanstack/react-query";
import mockApi from "../api/client";

const ITEMS = [
  { num:1,  factor:"因子I",  label:"特別支援が必要な児童への適切な対応" },
  { num:2,  factor:"因子I",  label:"母語が異なる児童への対応・指導" },
  { num:3,  factor:"因子I",  label:"特別支援が必要な児童への対応理解" },
  { num:4,  factor:"因子I",  label:"母語が異なる児童への対応理解" },
  { num:5,  factor:"因子I",  label:"性別に関わる心理的・行動的差異の理解" },
  { num:6,  factor:"因子I",  label:"社会的・文化的影響への理解" },
  { num:7,  factor:"因子I",  label:"教科の特性に基づいた授業設計" },
  { num:8,  factor:"因子II", label:"実習経験と教員としての仕事の関連付け" },
  { num:9,  factor:"因子II", label:"教育活動を評価する能力" },
  { num:10, factor:"因子II", label:"積極的な価値・態度の実践" },
  { num:11, factor:"因子II", label:"フィードバックの受容と活用" },
  { num:12, factor:"因子II", label:"実践を振り返り専門的成長に責任を持つ" },
  { num:13, factor:"因子II", label:"自己評価能力の維持" },
  { num:14, factor:"因子III",label:"学級運営と生徒指導" },
  { num:15, factor:"因子III",label:"安全で効果的な学習環境の構築" },
  { num:16, factor:"因子III",label:"学習における秩序と社会的に許容される行動の確立" },
  { num:17, factor:"因子III",label:"個別対応と集団への関わり" },
  { num:18, factor:"因子IV", label:"同僚としての役割認識" },
  { num:19, factor:"因子IV", label:"職責の遂行と専門的責任" },
  { num:20, factor:"因子IV", label:"学習困難の早期発見と対応" },
  { num:21, factor:"因子IV", label:"行動・学習特性の理解" },
  { num:22, factor:"因子IV", label:"知的発達段階の理解" },
  { num:23, factor:"因子IV", label:"発達と学習方法の理解" },
];

const FACTOR_COLORS: Record<string, string> = {
  "因子I": "#1976D2", "因子II": "#388E3C", "因子III": "#F57C00", "因子IV": "#7B1FA2",
};

export default function HumanEvaluationPage() {
  const navigate = useNavigate();
  const { journalId } = useParams<{ journalId?: string }>();

  const [scores, setScores] = useState<Record<number, number>>(
    Object.fromEntries(ITEMS.map((item) => [item.num, 3]))
  );
  const [snackOpen, setSnackOpen] = useState(false);

  const { data: journal } = useQuery({
    queryKey: ["journal", journalId],
    queryFn:  () => mockApi.getJournal(journalId!),
    enabled:  !!journalId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => { await new Promise((r) => setTimeout(r, 600)); return scores; },
    onSuccess:  () => { setSnackOpen(true); },
  });

  const factorAvg = (factor: string) => {
    const items = ITEMS.filter((i) => i.factor === factor);
    return (items.reduce((s, i) => s + (scores[i.num] ?? 3), 0) / items.length).toFixed(2);
  };
  const totalAvg = (ITEMS.reduce((s, i) => s + (scores[i.num] ?? 3), 0) / ITEMS.length).toFixed(2);

  return (
    <Box maxWidth={900} mx="auto">
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} variant="outlined" size="small">戻る</Button>
        <Typography variant="h5" fontWeight="bold" ml={1}>人間評価入力</Typography>
        {journal && <Chip label={journal.title} size="small" variant="outlined" sx={{ ml: 1 }} />}
        <Box sx={{ ml: "auto" }}>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            評価を保存
          </Button>
        </Box>
      </Box>

      {/* スコアサマリ */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="bold" mb={2}>評価サマリ</Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
            {["因子I","因子II","因子III","因子IV"].map((f) => (
              <Box key={f} sx={{ flex: "1 1 100px", textAlign: "center", p: 1.5, borderRadius: 2, bgcolor: FACTOR_COLORS[f] + "15", border: `2px solid ${FACTOR_COLORS[f]}` }}>
                <Typography variant="caption" color="text.secondary">{f}</Typography>
                <Typography variant="h5" fontWeight="bold" sx={{ color: FACTOR_COLORS[f] }}>{factorAvg(f)}</Typography>
              </Box>
            ))}
            <Box sx={{ flex: "1 1 100px", textAlign: "center", p: 1.5, borderRadius: 2, bgcolor: "grey.100", border: "2px solid #333" }}>
              <Typography variant="caption" color="text.secondary">総合</Typography>
              <Typography variant="h5" fontWeight="bold">{totalAvg}</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 23項目評価 */}
      {["因子I","因子II","因子III","因子IV"].map((factor) => (
        <Card key={factor} sx={{ mb: 3, borderLeft: `4px solid ${FACTOR_COLORS[factor]}` }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" mb={2} sx={{ color: FACTOR_COLORS[factor] }}>{factor}</Typography>
            {ITEMS.filter((i) => i.factor === factor).map((item) => (
              <Box key={item.num} sx={{ mb: 2.5 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip label={`項目${item.num}`} size="small" variant="outlined" sx={{ fontSize: 10 }} />
                    <Typography variant="body2">{item.label}</Typography>
                  </Box>
                  <Chip
                    label={scores[item.num]}
                    size="small"
                    color={scores[item.num] >= 4 ? "success" : scores[item.num] >= 3 ? "primary" : scores[item.num] >= 2 ? "warning" : "error"}
                    sx={{ fontWeight: "bold", minWidth: 32 }}
                  />
                </Box>
                <Slider
                  value={scores[item.num]}
                  onChange={(_, v) => setScores((prev) => ({ ...prev, [item.num]: v as number }))}
                  min={1} max={5} step={1}
                  marks={[{value:1,label:"1"},{value:2,label:"2"},{value:3,label:"3"},{value:4,label:"4"},{value:5,label:"5"}]}
                  sx={{ color: FACTOR_COLORS[factor], py: 0.5 }}
                />
                <Divider />
              </Box>
            ))}
          </CardContent>
        </Card>
      ))}

      <Snackbar open={snackOpen} autoHideDuration={3000} onClose={() => setSnackOpen(false)}
        message="評価を保存しました" anchorOrigin={{ vertical: "bottom", horizontal: "center" }} />
    </Box>
  );
}
