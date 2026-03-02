import React, { useState } from "react";
import {
  Box, Typography, Card, CardContent, Tabs, Tab, Chip,
  Grid, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Alert, Divider, LinearProgress,
  Tooltip, IconButton,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import BarChartIcon from "@mui/icons-material/BarChart";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  Legend, ResponsiveContainer, ReferenceLine, ErrorBar,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import mockApi from "../api/client";

// ── LGCM モックパラメータ ──────────────────────────────────
const LGCM_PARAMS = {
  intercept: { mean: 2.42, variance: 0.18, se: 0.04, pValue: "<0.001" },
  slope:     { mean: 0.17, variance: 0.03, se: 0.012, pValue: "<0.001" },
  covariance: -0.021,
  fit: { cfi: 0.963, rmsea: 0.048, srmr: 0.052, aic: 1842.3, bic: 1901.7 },
};

// ── HLM モックパラメータ ──────────────────────────────────
const HLM_PARAMS = {
  fixed: [
    { label: "切片",            est: 2.418, se: 0.063, t: 38.4, p: "<.001" },
    { label: "時間（週）",       est: 0.173, se: 0.015, t: 11.5, p: "<.001" },
    { label: "集中実習ダミー",   est: 0.241, se: 0.098, t:  2.46, p: ".014" },
    { label: "時間×集中実習",    est: 0.032, se: 0.021, t:  1.52, p: ".129" },
    { label: "外向性（BigFive)", est: 0.084, se: 0.037, t:  2.27, p: ".023" },
  ],
  random: [
    { level: "レベル2（学生間）", variance: 0.182, icc: 0.31 },
    { level: "レベル1（時点間）", variance: 0.094, icc: null },
  ],
  r2: { l1: 0.38, l2: 0.52 },
};

// ── LGCM 予測軌跡データ生成 ──────────────────────────────
function genLGCMTrajectories() {
  const weeks = Array.from({ length: 10 }, (_, i) => i + 1);
  return weeks.map((w) => {
    const mean = LGCM_PARAMS.intercept.mean + LGCM_PARAMS.slope.mean * (w - 1);
    return {
      week: w,
      mean: +mean.toFixed(2),
      upper: +(mean + 0.3).toFixed(2),
      lower: +(mean - 0.3).toFixed(2),
    };
  });
}

// ── Bland-Altman モックデータ ─────────────────────────────
function genBlandAltman(n = 50) {
  return Array.from({ length: n }, (_, i) => {
    const ai = 2.3 + Math.sin(i * 0.7) * 0.9;
    const hu = ai + (Math.random() - 0.5) * 0.6 + 0.12;
    return { mean: +((ai + hu) / 2).toFixed(2), diff: +(hu - ai).toFixed(2) };
  });
}

const lgcmData   = genLGCMTrajectories();
const blandData  = genBlandAltman();
const blandMean  = +(blandData.reduce((s, d) => s + d.diff, 0) / blandData.length).toFixed(3);
const blandSd    = +(Math.sqrt(blandData.reduce((s, d) => s + (d.diff - +blandMean) ** 2, 0) / blandData.length)).toFixed(3);
const loaUpper   = +(+blandMean + 1.96 * +blandSd).toFixed(3);
const loaLower   = +(+blandMean - 1.96 * +blandSd).toFixed(3);

// ── ICC モックデータ ──────────────────────────────────────
const ICC_DATA = [
  { factor: "因子I（指導技術）",  icc: 0.847, ci95: "0.78–0.90", f: 12.1, p: "<.001", interp: "優秀" },
  { factor: "因子II（自己評価）", icc: 0.792, ci95: "0.72–0.85", f:  9.6, p: "<.001", interp: "良好" },
  { factor: "因子III（学級経営）",icc: 0.821, ci95: "0.76–0.87", f: 10.8, p: "<.001", interp: "優秀" },
  { factor: "因子IV（学習者理解）",icc: 0.769, ci95: "0.70–0.83", f:  8.3, p: "<.001", interp: "良好" },
  { factor: "総合スコア",         icc: 0.891, ci95: "0.84–0.93", f: 17.3, p: "<.001", interp: "優秀" },
];

const iccColor = (v: number) =>
  v >= 0.8 ? "#2e7d32" : v >= 0.7 ? "#1565c0" : "#e65100";

interface TabPanelProps { children: React.ReactNode; value: number; index: number; }
const TabPanel = ({ children, value, index }: TabPanelProps) =>
  value === index ? <Box pt={3}>{children}</Box> : null;

export default function AdvancedAnalysisPage() {
  const [tab, setTab] = useState(0);
  const { data: cohorts } = useQuery({
    queryKey: ["cohorts"],
    queryFn: () => mockApi.getCohortProfiles(),
  });

  // HLM 係数プロット用データ
  const hlmFixed = HLM_PARAMS.fixed.map((r) => ({
    label: r.label, est: r.est,
    errorY: [r.se * 1.96, r.se * 1.96],
  }));

  return (
    <Box>
      {/* ヘッダー */}
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <AccountTreeIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>高度統計分析</Typography>
        <Chip label="研究者向け" size="small" color="primary" variant="outlined" />
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }}>
        <Tab label="LGCM（潜在成長曲線）" icon={<TrendingUpIcon />} iconPosition="start" />
        <Tab label="HLM（階層線形モデル）" icon={<BarChartIcon />} iconPosition="start" />
        <Tab label="信頼性分析（ICC）"     icon={<BarChartIcon />} iconPosition="start" />
        <Tab label="Bland–Altman分析"      icon={<BarChartIcon />} iconPosition="start" />
      </Tabs>

      {/* ━━ LGCM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={0}>
        <Grid container spacing={3}>
          {/* パラメータ表 */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  成長パラメータ
                </Typography>
                {[
                  { name: "切片（初期値）", ...LGCM_PARAMS.intercept },
                  { name: "傾き（成長率）", ...LGCM_PARAMS.slope },
                ].map((p) => (
                  <Paper key={p.name} sx={{ p: 1.5, mb: 1, bgcolor: "#f5f5f5" }}>
                    <Typography variant="caption" color="text.secondary">{p.name}</Typography>
                    <Typography variant="body2">
                      平均 = <b>{p.mean}</b>（SE = {p.se}）
                    </Typography>
                    <Typography variant="body2">
                      分散 = {p.variance} &nbsp;|&nbsp; <i>p</i> {p.pValue}
                    </Typography>
                  </Paper>
                ))}
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" color="text.secondary">モデル適合度</Typography>
                <Box mt={0.5}>
                  {[
                    ["CFI", LGCM_PARAMS.fit.cfi, "≥ .95"],
                    ["RMSEA", LGCM_PARAMS.fit.rmsea, "< .06"],
                    ["SRMR", LGCM_PARAMS.fit.srmr, "< .08"],
                  ].map(([k, v, th]) => (
                    <Box key={k as string} display="flex" justifyContent="space-between" mb={0.3}>
                      <Typography variant="body2">{k as string}</Typography>
                      <Chip label={v as string} size="small"
                        color={(k === "CFI" ? +v >= 0.95 : +v <= +((th as string).replace(/[^0-9.]/g, ""))) ? "success" : "warning"}
                      />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 軌跡プロット */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  成長軌跡（平均 ± 1SD）
                </Typography>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={lgcmData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" label={{ value: "週", position: "insideBottomRight", offset: -5 }} />
                    <YAxis domain={[1.5, 4.5]} label={{ value: "スコア", angle: -90, position: "insideLeft" }} />
                    <RechartTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="upper" stroke="#90caf9" strokeDasharray="4 2" dot={false} name="+1SD" />
                    <Line type="monotone" dataKey="mean"  stroke="#1565c0" strokeWidth={2} dot name="平均軌跡" />
                    <Line type="monotone" dataKey="lower" stroke="#90caf9" strokeDasharray="4 2" dot={false} name="−1SD" />
                  </LineChart>
                </ResponsiveContainer>
                <Alert severity="info" sx={{ mt: 1 }}>
                  実習期間10週を通じて全因子の平均スコアが有意に上昇（傾き = 0.17, <i>p</i> &lt; .001）。
                  切片分散（0.18）は実習開始時の個人差を示す。
                </Alert>
              </CardContent>
            </Card>
          </Grid>

          {/* 個人軌跡（コーホートから20名サンプル） */}
          <Grid size={{ xs: 12 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  個人成長軌跡（サンプル20名）
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="week" domain={[1, 10]}
                      label={{ value: "週", position: "insideBottomRight", offset: -5 }} />
                    <YAxis domain={[1.5, 4.5]} />
                    <RechartTooltip />
                    {(cohorts ?? []).slice(0, 20).map((s, idx) => (
                      <Line key={s.id} data={s.weekly_scores.map((ws) => ({ week: ws.week, score: ws.total }))}
                        dataKey="score" dot={false} stroke={`hsl(${idx * 18},60%,55%)`} strokeWidth={1}
                        name={s.name} opacity={0.7}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ━━ HLM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={1}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  固定効果推定値
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#e3f2fd" }}>
                        {["変数", "推定値", "SE", "t", "p"].map((h) => (
                          <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {HLM_PARAMS.fixed.map((r) => (
                        <TableRow key={r.label} hover>
                          <TableCell>{r.label}</TableCell>
                          <TableCell>{r.est.toFixed(3)}</TableCell>
                          <TableCell>{r.se.toFixed(3)}</TableCell>
                          <TableCell>{r.t.toFixed(2)}</TableCell>
                          <TableCell>
                            <Chip label={r.p} size="small"
                              color={r.p === "<.001" || +r.p < 0.05 ? "success" : "default"}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box mt={2}>
                  <Typography variant="caption" color="text.secondary">
                    説明分散（R²）: レベル1 = {HLM_PARAMS.r2.l1}, レベル2 = {HLM_PARAMS.r2.l2}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  固定効果 係数プロット（95% CI）
                </Typography>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={hlmFixed} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[-0.1, 0.5]} />
                    <YAxis dataKey="label" type="category" width={120} tick={{ fontSize: 12 }} />
                    <RechartTooltip />
                    <ReferenceLine x={0} stroke="#666" />
                    <Bar dataKey="est" fill="#1976d2" name="推定値">
                      <ErrorBar dataKey="errorY" width={4} strokeWidth={2} stroke="#0d47a1" direction="x" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  ランダム効果・ICC
                </Typography>
                <Grid container spacing={2}>
                  {HLM_PARAMS.random.map((r) => (
                    <Grid key={r.level} size={{ xs: 12, sm: 6 }}>
                      <Paper sx={{ p: 2, bgcolor: "#f3e5f5" }}>
                        <Typography variant="body2" fontWeight={700}>{r.level}</Typography>
                        <Typography variant="body2">分散: {r.variance}</Typography>
                        {r.icc !== null && (
                          <Typography variant="body2">ICC = {r.icc}（31%が学生間差異）</Typography>
                        )}
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ━━ ICC ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={2}>
        <Card variant="outlined">
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Typography variant="subtitle1" fontWeight={700}>
                評価者間信頼性（ICC2,1 – Two-way Mixed）
              </Typography>
              <Tooltip title="ICC ≥ 0.90: 優秀 / 0.75–0.89: 良好 / 0.50–0.74: 中程度">
                <IconButton size="small"><InfoOutlinedIcon fontSize="small" /></IconButton>
              </Tooltip>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#e8f5e9" }}>
                    {["因子","ICC","95% CI","F値","p値","判定"].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ICC_DATA.map((r) => (
                    <TableRow key={r.factor} hover>
                      <TableCell>{r.factor}</TableCell>
                      <TableCell>
                        <Typography fontWeight={700} color={iccColor(r.icc)}>
                          {r.icc}
                        </Typography>
                      </TableCell>
                      <TableCell>{r.ci95}</TableCell>
                      <TableCell>{r.f}</TableCell>
                      <TableCell><Chip label={r.p} size="small" color="success" /></TableCell>
                      <TableCell>
                        <Chip label={r.interp} size="small"
                          color={r.interp === "優秀" ? "success" : "primary"}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box mt={3}>
              <Typography variant="subtitle2" gutterBottom>ICC 可視化</Typography>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ICC_DATA} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 1]} />
                  <YAxis dataKey="factor" type="category" width={150} tick={{ fontSize: 12 }} />
                  <RechartTooltip />
                  <ReferenceLine x={0.75} stroke="#e65100" strokeDasharray="4 2" label="良好ライン" />
                  <ReferenceLine x={0.90} stroke="#2e7d32" strokeDasharray="4 2" label="優秀ライン" />
                  <Bar dataKey="icc" fill="#43a047" name="ICC" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </TabPanel>

      {/* ━━ Bland-Altman ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={3}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Bland–Altman プロット（AI評価 vs 人間評価）
                </Typography>
                <ResponsiveContainer width="100%" height={340}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mean" name="平均" label={{ value: "平均値 ((AI+人間)/2)", position: "insideBottom", offset: -5 }} />
                    <YAxis dataKey="diff" name="差" label={{ value: "差 (人間−AI)", angle: -90, position: "insideLeft" }} />
                    <RechartTooltip cursor={{ strokeDasharray: "3 3" }} />
                    <ReferenceLine y={+blandMean}   stroke="#1565c0" label={`Bias=${blandMean}`} />
                    <ReferenceLine y={loaUpper} stroke="#e53935" strokeDasharray="4 2" label={`+1.96SD=${loaUpper}`} />
                    <ReferenceLine y={loaLower} stroke="#e53935" strokeDasharray="4 2" label={`−1.96SD=${loaLower}`} />
                    <ReferenceLine y={0} stroke="#555" />
                    <Scatter name="データ点" data={blandData} fill="#1976d2" opacity={0.6} />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card variant="outlined" sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  一致性指標
                </Typography>
                {[
                  { label: "バイアス（平均差）", value: blandMean },
                  { label: "SD",                value: blandSd },
                  { label: "LoA 上限（+1.96SD）", value: loaUpper },
                  { label: "LoA 下限（−1.96SD）", value: loaLower },
                ].map(({ label, value }) => (
                  <Paper key={label} sx={{ p: 1.5, mb: 1, bgcolor: "#f5f5f5" }}>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                    <Typography variant="h6" fontWeight={700}>{value}</Typography>
                  </Paper>
                ))}
                <Alert severity="success" sx={{ mt: 1 }}>
                  95%の測定値がLoA範囲内。AIと人間評価の一致性は<b>良好</b>。
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
}
