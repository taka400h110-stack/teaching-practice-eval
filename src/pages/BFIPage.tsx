// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Typography, Paper, RadioGroup, FormControlLabel, Radio, Button,
  LinearProgress, Alert, Chip, Stack, Divider, Tabs, Tab, CircularProgress,
  Table, TableHead, TableRow, TableCell, TableBody, Card, CardContent,
} from "@mui/material";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
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

const RD_LABELS: Record<string, string> = {
  RD0: "RD0 描写",
  RD1: "RD1 説明",
  RD2: "RD2 評価",
  RD3: "RD3 分析",
  RD4: "RD4 変容",
};

const CORRELATION_LABEL = (key: string): string => {
  const [pf, ed] = key.split("_x_");
  const pfMap: Record<string, string> = {
    extraversion: "外向性",
    neuroticism: "神経症傾向",
    openness: "開放性",
    agreeableness: "協調性",
    conscientiousness: "誠実性",
  };
  const edMap: Record<string, string> = {
    total: "総合スコア",
    f1: "因子1 (学習指導)",
    f2: "因子2 (生徒指導)",
    f3: "因子3 (学級経営)",
    f4: "因子4 (省察)",
  };
  return `${pfMap[pf] || pf} × ${edMap[ed] || ed}`;
};

function correlationColor(r: number | null): string {
  if (r === null || r === undefined) return "#999";
  const a = Math.abs(r);
  if (a >= 0.7) return "#d32f2f";
  if (a >= 0.5) return "#f57c00";
  if (a >= 0.3) return "#fbc02d";
  return "#999";
}

export default function BFIPage() {
  const user = apiClient.getCurrentUser() as any;
  const [tab, setTab] = useState(0);
  const [items, setItems] = useState<BfiItem[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [responses, setResponses] = useState<Record<number, number>>({});
  const [scores, setScores] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 統合分析データ
  const [integratedLoading, setIntegratedLoading] = useState(false);
  const [integratedData, setIntegratedData] = useState<any>(null);
  const [integratedError, setIntegratedError] = useState<string | null>(null);

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

  const loadIntegrated = async () => {
    if (!user?.id) return;
    setIntegratedLoading(true);
    setIntegratedError(null);
    try {
      const res = await apiFetch(`/api/data/bfi/integrated-analysis/${user.id}`);
      const json: any = await res.clone().json();
      if (!res.ok || json?.error) throw new Error(json?.error || `取得に失敗 (HTTP ${res.status})`);
      setIntegratedData(json);
    } catch (e: any) {
      setIntegratedError(String(e?.message || e));
    } finally {
      setIntegratedLoading(false);
    }
  };

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

  const handleTabChange = (_: any, newValue: number) => {
    setTab(newValue);
    if (newValue === 1 && !integratedData && !integratedLoading) {
      loadIntegrated();
    }
  };

  if (loading) return <Box p={4}><LinearProgress /></Box>;

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: "auto" }}>
      <Typography variant="h4" gutterBottom>BFI パーソナリティ診断 (Big Five 29項目)</Typography>
      <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 2 }}>
        <Tab label="① 回答 / スコア" />
        <Tab label="② 統合分析 (パーソナリティ × 省察深度)" />
      </Tabs>

      {/* ─────────── タブ① 回答 ─────────── */}
      {tab === 0 && (
        <Box>
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
      )}

      {/* ─────────── タブ② 統合分析 ─────────── */}
      {tab === 1 && (
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              BFI パーソナリティ × AI評価 × 省察深度 × SCAT を統合した深層分析を AI が生成します。
            </Typography>
            <Button variant="outlined" onClick={loadIntegrated} disabled={integratedLoading}>
              {integratedLoading ? "解析中..." : "再解析"}
            </Button>
          </Stack>

          {integratedLoading && (
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ mt: 2 }}>AI が統合分析を生成しています...</Typography>
            </Paper>
          )}

          {integratedError && <Alert severity="error">{integratedError}</Alert>}

          {integratedData && (integratedData as any).status === "no_bfi" && (
            <Alert severity="info">{(integratedData as any).message}</Alert>
          )}

          {integratedData && !(integratedData as any).status && (
            <Stack spacing={3}>
              {/* セクション1: パーソナリティ × RD 分布 */}
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>① パーソナリティ + 省察深度サマリー</Typography>
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  {Object.entries(integratedData.bfi.scores || {}).map(([k, v]) => (
                    <Card key={k} variant="outlined" sx={{ minWidth: 180 }}>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary">{FACTOR_LABELS[k] || k}</Typography>
                        <Typography variant="h5">{(v as number).toFixed(2)}</Typography>
                        <Typography variant="caption" color={(v as number) >= 3.5 ? "primary" : (v as number) < 2 ? "warning.main" : "text.secondary"}>
                          {(v as number) >= 3.5 ? "高" : (v as number) >= 2 ? "中" : "低"}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>省察深度 (RD) 分布</Typography>
                <Box sx={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.entries(integratedData.reflection_depth?.distribution || {}).map(([k, v]) => ({ name: RD_LABELS[k] || k, count: v }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#1976d2" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  平均RDスコア: <strong>{integratedData.reflection_depth?.avg_score?.toFixed(2) || "-"}</strong> / 4.0
                  (集計対象: {integratedData.reflection_depth?.total_items || 0} 項目)
                </Typography>
              </Paper>

              {/* セクション2: LLM 解釈 */}
              {integratedData.llm_insights && !integratedData.llm_insights.error && (
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>② AI による文脈解釈</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mb: 2 }}>
                    {integratedData.llm_insights.personality_summary}
                  </Typography>

                  {Array.isArray(integratedData.llm_insights.personality_strengths) && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="primary">✦ 強み</Typography>
                      <ul>
                        {integratedData.llm_insights.personality_strengths.map((s: string, i: number) => (
                          <li key={i}><Typography variant="body2">{s}</Typography></li>
                        ))}
                      </ul>
                    </Box>
                  )}

                  {Array.isArray(integratedData.llm_insights.personality_growth_areas) && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="warning.main">✦ 伸び代</Typography>
                      <ul>
                        {integratedData.llm_insights.personality_growth_areas.map((s: string, i: number) => (
                          <li key={i}><Typography variant="body2">{s}</Typography></li>
                        ))}
                      </ul>
                    </Box>
                  )}

                  {Array.isArray(integratedData.llm_insights.personalized_recommendations) && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="success.main">✦ 提言</Typography>
                      <ul>
                        {integratedData.llm_insights.personalized_recommendations.map((s: string, i: number) => (
                          <li key={i}><Typography variant="body2">{s}</Typography></li>
                        ))}
                      </ul>
                    </Box>
                  )}

                  {integratedData.llm_insights.next_week_focus && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <strong>次週の重点課題:</strong> {integratedData.llm_insights.next_week_focus}
                    </Alert>
                  )}
                </Paper>
              )}

              {integratedData.llm_insights?.error && (
                <Alert severity="warning">
                  LLM 解釈の生成に失敗しました: {integratedData.llm_insights.error}
                </Alert>
              )}

              {/* セクション3: 因子別強み弱みマップ */}
              {integratedData.llm_insights?.factor_strength_map && (
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>③ 因子別 強み弱みマップ</Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>因子</TableCell>
                        <TableCell align="center">スコア</TableCell>
                        <TableCell align="center">水準</TableCell>
                        <TableCell>授業実践での現れ方</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(integratedData.llm_insights.factor_strength_map).map(([k, v]: any) => (
                        <TableRow key={k}>
                          <TableCell><strong>{FACTOR_LABELS[k] || k}</strong></TableCell>
                          <TableCell align="center">{(v.score || 0).toFixed(2)}</TableCell>
                          <TableCell align="center">
                            <Chip
                              size="small"
                              label={v.label}
                              color={v.label === "高" ? "primary" : v.label === "低" ? "warning" : "default"}
                            />
                          </TableCell>
                          <TableCell>{v.teaching_implication}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              )}

              {/* セクション4: 相関 (集団分析) */}
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>④ 相関分析 (ピアソン r)</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                  {integratedData.correlation_note}
                </Typography>
                {Object.keys(integratedData.correlations || {}).length > 0 ? (
                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 1 }}>
                    {Object.entries(integratedData.correlations).map(([k, r]: any) => (
                      <Box
                        key={k}
                        sx={{
                          p: 1,
                          border: "1px solid #ddd",
                          borderRadius: 1,
                          borderLeft: `4px solid ${correlationColor(r)}`,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">{CORRELATION_LABEL(k)}</Typography>
                        <Typography variant="h6" sx={{ color: correlationColor(r) }}>
                          {r === null ? "N/A" : (r > 0 ? "+" : "") + r.toFixed(3)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Alert severity="info">
                    相関を算出するには、BFI を完答済の学生が 3 名以上必要です (現在の集団でデータ不足)。
                  </Alert>
                )}
              </Paper>

              {/* セクション5: LLM 相関洞察 */}
              {Array.isArray(integratedData.llm_insights?.correlation_insights) && (
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>⑤ AI による相関の質的洞察</Typography>
                  <Stack spacing={1}>
                    {integratedData.llm_insights.correlation_insights.map((ins: any, i: number) => (
                      <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                        <Typography variant="subtitle2" color="primary">
                          {ins.personality_factor} × {ins.evaluation_dimension}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {ins.observed_pattern}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                          根拠: {ins.evidence}
                        </Typography>
                      </Paper>
                    ))}
                  </Stack>
                </Paper>
              )}

              {/* メタ情報 */}
              <Typography variant="caption" color="text.secondary" align="right">
                生成日時: {integratedData.generated_at}
                {" | "}
                日誌AI評価件数: {integratedData.evaluation?.total_count || 0}
                {" | "}
                SCATテーマ: {(integratedData.scat?.recent_themes || []).join(", ") || "なし"}
              </Typography>
            </Stack>
          )}
        </Box>
      )}
    </Box>
  );
}
