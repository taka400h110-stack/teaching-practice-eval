import React, { useState } from "react";
import {
  Box, Card, CardContent, Chip, Typography, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Alert,
} from "@mui/material";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, LineChart, Line, Legend,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import mockApi from "../api/client";

// ICC計算（簡易モック）
function calcICC(profiles: ReturnType<typeof useQuery>["data"]) {
  if (!profiles || !Array.isArray(profiles) || profiles.length === 0) return { icc21: 0.78, icc31: 0.65, ci95: [0.71, 0.84] };
  return { icc21: 0.78, icc31: 0.65, ci95: [0.71, 0.84] };
}

export default function ReliabilityAnalysisPage() {
  const [tab, setTab] = useState(0);
  const { data: profiles = [] } = useQuery({ queryKey: ["cohort"], queryFn: () => mockApi.getCohortProfiles() });

  const icc = calcICC(profiles);

  // Bland-Altmanデータ生成
  const blandAltmanData = profiles.slice(0, 30).map((p) => {
    const ai    = p.final_total;
    const human = +(ai + (Math.random() - 0.5) * 0.8).toFixed(2);
    return { mean: +((ai + human) / 2).toFixed(2), diff: +(ai - human).toFixed(2), name: p.name };
  });
  const meanDiff = +(blandAltmanData.reduce((s, d) => s + d.diff, 0) / blandAltmanData.length).toFixed(3);
  const sdDiff   = +(Math.sqrt(blandAltmanData.reduce((s, d) => s + (d.diff - Number(meanDiff)) ** 2, 0) / blandAltmanData.length)).toFixed(3);
  const loa_upper = +(Number(meanDiff) + 1.96 * Number(sdDiff)).toFixed(3);
  const loa_lower = +(Number(meanDiff) - 1.96 * Number(sdDiff)).toFixed(3);

  // AI vs 人間散布図データ
  const scatterData = profiles.slice(0, 30).map((p) => ({
    ai:    p.final_total,
    human: +(p.final_total + (Math.random() - 0.5) * 0.6).toFixed(2),
  }));

  const iccColor = icc.icc21 >= 0.75 ? "success" : icc.icc21 >= 0.6 ? "warning" : "error";

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={3}>信頼性分析（ICC・Bland-Altman）</Typography>

      {/* ICC サマリ */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        {[
          { label: "ICC(2,1) 一致性",   value: icc.icc21, good: 0.75 },
          { label: "ICC(3,1) 整合性",   value: icc.icc31, good: 0.6 },
          { label: "95%CI 下限",        value: icc.ci95[0], good: 0.6 },
          { label: "95%CI 上限",        value: icc.ci95[1], good: 0.8 },
        ].map((s) => (
          <Card key={s.label} sx={{ flex: "1 1 140px" }}>
            <CardContent sx={{ p: "16px !important" }}>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              <Typography variant="h4" fontWeight="bold" color={s.value >= s.good ? "success.main" : "warning.main"}>
                {s.value.toFixed(3)}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Alert severity={iccColor} sx={{ mb: 3 }}>
        ICC(2,1) = {icc.icc21} — {icc.icc21 >= 0.75 ? "良好な一致性（研究使用可）" : "中程度の一致性（要改善）"}。
        95%CI [{icc.ci95[0]}, {icc.ci95[1]}]
      </Alert>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Bland-Altman プロット" />
        <Tab label="AI vs 人間 散布図" />
        <Tab label="因子別ICC" />
      </Tabs>

      {/* Bland-Altman */}
      {tab === 0 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" mb={1}>Bland-Altman プロット（AI評価 − 人間評価）</Typography>
            <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
              <Chip label={`平均差: ${meanDiff}`} color="primary" size="small" />
              <Chip label={`SD: ${sdDiff}`} variant="outlined" size="small" />
              <Chip label={`LoA上限: ${loa_upper}`} color="warning" size="small" />
              <Chip label={`LoA下限: ${loa_lower}`} color="warning" size="small" />
            </Box>
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mean" name="平均値" label={{ value: "平均スコア", position: "insideBottom", offset: -10 }} domain={[1, 5]} />
                <YAxis dataKey="diff" name="差" label={{ value: "差 (AI−人間)", angle: -90, position: "insideLeft" }} domain={[-2, 2]} />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <ReferenceLine y={Number(meanDiff)}  stroke="#1976D2" strokeDasharray="5 5" label={{ value: `平均差 ${meanDiff}`, position: "right", fontSize: 11 }} />
                <ReferenceLine y={loa_upper} stroke="#F57C00" strokeDasharray="3 3" label={{ value: `+1.96SD`, position: "right", fontSize: 11 }} />
                <ReferenceLine y={loa_lower} stroke="#F57C00" strokeDasharray="3 3" label={{ value: `-1.96SD`, position: "right", fontSize: 11 }} />
                <ReferenceLine y={0} stroke="#333" />
                <Scatter data={blandAltmanData} fill="#1976D2" opacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 散布図 */}
      {tab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" mb={2}>AI評価 vs 人間評価 散布図</Typography>
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ai"    name="AI評価"   label={{ value: "AI評価スコア",   position: "insideBottom", offset: -10 }} domain={[1, 5]} />
                <YAxis dataKey="human" name="人間評価" label={{ value: "人間評価スコア", angle: -90, position: "insideLeft" }} domain={[1, 5]} />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <ReferenceLine stroke="#999" segment={[{x:1,y:1},{x:5,y:5}]} />
                <Scatter data={scatterData} fill="#7B1FA2" opacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 因子別ICC */}
      {tab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" mb={2}>因子別 ICC(2,1)</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "grey.50" }}>
                    <TableCell>因子</TableCell><TableCell align="center">ICC(2,1)</TableCell>
                    <TableCell align="center">95%CI</TableCell><TableCell>解釈</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    { factor: "因子I 指導実践力", icc: 0.81, ci: "[0.74, 0.87]" },
                    { factor: "因子II 自己評価力", icc: 0.76, ci: "[0.68, 0.83]" },
                    { factor: "因子III 学級経営力", icc: 0.79, ci: "[0.72, 0.85]" },
                    { factor: "因子IV 役割理解", icc: 0.74, ci: "[0.65, 0.81]" },
                    { factor: "総合スコア", icc: 0.78, ci: "[0.71, 0.84]" },
                  ].map((r) => (
                    <TableRow key={r.factor} hover>
                      <TableCell>{r.factor}</TableCell>
                      <TableCell align="center">
                        <Chip label={r.icc.toFixed(3)} size="small" color={r.icc >= 0.75 ? "success" : "warning"} />
                      </TableCell>
                      <TableCell align="center">{r.ci}</TableCell>
                      <TableCell>
                        <Typography variant="caption">{r.icc >= 0.75 ? "✅ 良好" : "⚠️ 要改善"}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
