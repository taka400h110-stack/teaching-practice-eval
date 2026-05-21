import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Typography, Paper, RadioGroup, FormControlLabel, Radio, Button,
  LinearProgress, Alert, Chip, Stack, Divider,
} from "@mui/material";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts";
import { apiFetch } from "../api/client";
import apiClient from "../api/client";

interface BfiItem {
  item_id: number;
  factor: string;
  reverse: boolean;
  question: string;
}

const FACTOR_LABELS: Record<string, string> = {
  extraversion: "外向性",
  neuroticism: "神経症傾向",
  openness: "開放性",
  agreeableness: "協調性",
  conscientiousness: "誠実性",
};

export default function BFIPage() {
  const user = apiClient.getCurrentUser() as any;
  const [items, setItems] = useState<BfiItem[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [responses, setResponses] = useState<Record<number, number>>({});
  const [scores, setScores] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const itemsRes = await apiFetch("/api/data/bfi/items");
        const itemsJson: any = await itemsRes.clone().json();
        setItems(itemsJson.items || []);
        setLabels(itemsJson.scale?.labels || []);

        if (user?.id) {
          const respRes = await apiFetch(`/api/data/bfi/responses/${user.id}`);
          const respJson: any = await respRes.clone().json();
          if (respJson?.responses) {
            const map: Record<number, number> = {};
            for (const [k, v] of Object.entries(respJson.responses)) {
              map[Number(k)] = Number(v);
            }
            setResponses(map);
          }
          if (respJson?.scores) setScores(respJson.scores);
        }
      } catch (e: any) {
        setErrorMsg(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const answered = useMemo(() => Object.keys(responses).length, [responses]);
  const total = items.length || 29;

  const handleChange = (itemId: number, value: number) => {
    setResponses(prev => ({ ...prev, [itemId]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await apiFetch("/api/data/bfi/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, responses }),
      });
      const json: any = await res.clone().json();
      if (!res.ok || json?.error) {
        throw new Error(json?.error || `保存に失敗しました (HTTP ${res.status})`);
      }
      setSuccessMsg(json.isCompleted ? "すべての設問を回答完了しました" : `保存しました (${answered}/${total})`);
      if (json.scores) setScores(json.scores);
    } catch (e: any) {
      setErrorMsg(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const radarData = scores ? Object.entries(scores).map(([key, value]) => ({
    factor: FACTOR_LABELS[key] || key,
    value: typeof value === "number" ? value : 0,
    fullMark: 5,
  })) : [];

  if (loading) return <Box p={4}><LinearProgress /></Box>;

  return (
    <Box sx={{ p: 3, maxWidth: 980, mx: "auto" }}>
      <Typography variant="h4" gutterBottom>BFI パーソナリティ診断 (Big Five 29項目)</Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        各設問について、現在のあなたにどの程度当てはまるかを 1〜5 でお答えください。回答は途中保存可能です。
      </Typography>

      {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="subtitle1">進捗:</Typography>
          <Box sx={{ flexGrow: 1 }}>
            <LinearProgress variant="determinate" value={(answered / total) * 100} />
          </Box>
          <Chip label={`${answered} / ${total}`} color={answered >= total ? "success" : "default"} />
        </Stack>
      </Paper>

      {scores && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>5因子スコア (1〜5 平均)</Typography>
          <Box sx={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="factor" />
                <PolarRadiusAxis angle={90} domain={[0, 5]} />
                <Radar name="あなた" dataKey="value" stroke="#1976d2" fill="#1976d2" fillOpacity={0.5} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </Box>
          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap" }}>
            {Object.entries(scores).map(([k, v]) => (
              <Chip key={k} label={`${FACTOR_LABELS[k] || k}: ${(v as number).toFixed(2)}`} variant="outlined" />
            ))}
          </Stack>
        </Paper>
      )}

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>設問</Typography>
        {labels.length === 5 && (
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap" }}>
            {labels.map((lab, i) => (
              <Chip key={i} size="small" label={`${i + 1}: ${lab}`} />
            ))}
          </Stack>
        )}
        <Divider sx={{ mb: 2 }} />

        <Stack spacing={2}>
          {items.map(item => (
            <Box key={item.item_id} sx={{ p: 1.5, border: "1px solid #eee", borderRadius: 1 }}>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Q{item.item_id}.</strong> {item.question}
                {item.reverse && <Chip size="small" label="逆転" sx={{ ml: 1 }} color="warning" />}
              </Typography>
              <RadioGroup
                row
                value={responses[item.item_id] || ""}
                onChange={(e) => handleChange(item.item_id, Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map(v => (
                  <FormControlLabel key={v} value={v} control={<Radio size="small" />} label={String(v)} />
                ))}
              </RadioGroup>
            </Box>
          ))}
        </Stack>

        <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end", gap: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>
            {answered < total ? `あと ${total - answered} 問` : "すべて回答済み"}
          </Typography>
          <Button variant="contained" onClick={handleSave} disabled={saving || answered === 0}>
            {saving ? "保存中..." : "回答を保存"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
