/**
 * src/pages/SCATAnalysisPage.tsx
 * 質的SCAT分析（Steps for Coding and Theorization）
 * 論文 3.8節: SCAT質的分析（コーディング・テーマ生成・カッパ係数）
 * 量的・質的混合分析の統合表示
 * CSV エクスポート・カッパ係数計算付き
 */
import React, { useState, useCallback } from "react";
import {
  Box, Typography, Card, CardContent, Chip, Grid, Paper,
  Tabs, Tab, TextField, Button, IconButton, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Alert, Accordion, AccordionSummary, AccordionDetails,
  Stack, CircularProgress, Snackbar, Tooltip,
} from "@mui/material";
import PsychologyIcon  from "@mui/icons-material/Psychology";
import AddIcon         from "@mui/icons-material/Add";
import DeleteIcon      from "@mui/icons-material/Delete";
import ExpandMoreIcon  from "@mui/icons-material/ExpandMore";
import LightbulbIcon   from "@mui/icons-material/Lightbulb";
import DownloadIcon    from "@mui/icons-material/Download";
import CalculateIcon   from "@mui/icons-material/Calculate";
import CompareIcon     from "@mui/icons-material/Compare";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from "recharts";

// ────────────────────────────────────────────────────────────────
// 型定義
// ────────────────────────────────────────────────────────────────
interface ScatRow {
  id: number;
  text:       string;  // ①元テキスト
  keywords:   string;  // ②注目する語句
  thesaurus:  string;  // ③テキスト外の語句
  concept:    string;  // ④構成概念
  theme:      string;  // ⑤テーマ・カテゴリ
  memo:       string;  // ⑥メモ
  factor?:    string;  // 対応するルーブリック因子
  week?:      number;  // 対象週
  coder_id?:  string;  // コーダーID
}

// ────────────────────────────────────────────────────────────────
// サンプルデータ
// ────────────────────────────────────────────────────────────────
const SAMPLE_SCAT: ScatRow[] = [
  {
    id: 1,
    text: "ウォン君が算数の問題でつまずいていたので、絵カードを使って視覚的に説明した。すると理解できたようで笑顔になった。",
    keywords: "つまずく・絵カード・視覚的・笑顔",
    thesaurus: "学習困難・視覚支援・個別対応・感情的反応",
    concept: "視覚支援による個別学習困難の解消",
    theme: "インクルーシブ教育実践",
    memo: "外国籍児童への配慮と個別最適化の事例",
    factor: "factor1", week: 3,
  },
  {
    id: 2,
    text: "朝の会でクラス全体がざわついており、なかなか落ち着けなかった。声を大きくしても効果がなく、黒板に大きく「静かに」と書いたら静まった。",
    keywords: "ざわつく・声を大きく・効果がない・黒板",
    thesaurus: "学級経営・注意喚起・視覚的指示・試行錯誤",
    concept: "視覚的指示による学級秩序の回復",
    theme: "学級経営スキルの習得",
    memo: "声だけでなく多モーダルな指示の有効性",
    factor: "factor3", week: 2,
  },
  {
    id: 3,
    text: "自分の授業後の省察で、一方的な説明が多かったと感じ、次の授業では発問を増やした。生徒の反応が明らかに変わった。",
    keywords: "省察・一方的・発問・反応が変わった",
    thesaurus: "反省的実践・双方向授業・省察サイクル・改善",
    concept: "省察に基づく授業改善の循環",
    theme: "自己省察と授業改善",
    memo: "F2（自己評価力）に直接対応する実践事例",
    factor: "factor2", week: 5,
  },
  {
    id: 4,
    text: "指導教員から「もっと児童に語りかけるように」とフィードバックをもらった。翌日意識して話しかけると、積極的に手を挙げる児童が増えた。",
    keywords: "フィードバック・語りかける・積極的・手を挙げる",
    thesaurus: "フィードバック受容・コミュニケーション・学習意欲・改善行動",
    concept: "フィードバック受容による教授行動の改善",
    theme: "フィードバック活用と成長",
    memo: "F2-11「フィードバック受容力」の具体的実践",
    factor: "factor2", week: 4,
  },
  {
    id: 5,
    text: "体育館掃除の際に役割分担を決めずに始めたら混乱した。次回は分担表を作って指示を出すと、スムーズに進んだ。",
    keywords: "役割分担・混乱・分担表・スムーズ",
    thesaurus: "組織管理・学級運営・計画性・リーダーシップ",
    concept: "計画的な役割分担によるリーダーシップ発揮",
    theme: "学級経営と組織運営",
    memo: "F3-16「リーダーシップ発揮」の具体例",
    factor: "factor3", week: 6,
  },
];

// ────────────────────────────────────────────────────────────────
// カッパ係数計算（Cohen's κ）
// ────────────────────────────────────────────────────────────────
function computeCohenKappa(
  coder1: { id: string | number; code: string }[],
  coder2: { id: string | number; code: string }[],
): { kappa: number; agreement: number; interpretation: string; n: number } {
  // セグメントIDによる厳密な突合
  const map2 = new Map(coder2.map((c) => [c.id, c.code]));
  const matched = coder1
    .filter((c) => map2.has(c.id))
    .map((c) => ({ code1: c.code, code2: map2.get(c.id)! }));

  const n = matched.length;
  if (n === 0) return { kappa: 0, agreement: 0, interpretation: "データなし", n: 0 };

  const agree = matched.filter((m) => m.code1 === m.code2).length;
  const po = agree / n;

  // 期待一致率
  const allCodes1 = matched.map(m => m.code1);
  const allCodes2 = matched.map(m => m.code2);
  const categories = [...new Set([...allCodes1, ...allCodes2])];
  
  let pe = 0;
  for (const cat of categories) {
    const p1 = allCodes1.filter((v) => v === cat).length / n;
    const p2 = allCodes2.filter((v) => v === cat).length / n;
    pe += p1 * p2;
  }

  const kappa = pe === 1 ? 1 : (po - pe) / (1 - pe);
  const interpretation =
    kappa >= 0.8 ? "非常に良好（研究使用可）" :
    kappa >= 0.6 ? "良好（概ね一致）" :
    kappa >= 0.4 ? "中程度（要改善）" :
    "不十分";

  return {
    kappa: Math.round(kappa * 1000) / 1000,
    agreement: Math.round(po * 100) / 100,
    interpretation,
    n
  };
}

// ────────────────────────────────────────────────────────────────
// テーマ集計
// ────────────────────────────────────────────────────────────────
function aggregateThemes(rows: ScatRow[]) {
  const counts: Record<string, number> = {};
  rows.forEach((r) => {
    if (r.theme) counts[r.theme] = (counts[r.theme] ?? 0) + 1;
  });
  return Object.entries(counts)
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count);
}

function aggregateConcepts(rows: ScatRow[]) {
  const counts: Record<string, number> = {};
  rows.forEach((r) => {
    if (r.concept) counts[r.concept] = (counts[r.concept] ?? 0) + 1;
  });
  return Object.entries(counts)
    .map(([concept, count]) => ({ concept, count }))
    .sort((a, b) => b.count - a.count);
}

const FACTOR_LABELS: Record<string, string> = {
  factor1: "F1: 児童生徒への指導力",
  factor2: "F2: 自己評価力",
  factor3: "F3: 学級経営力",
  factor4: "F4: 職務理解・行動力",
};

// ────────────────────────────────────────────────────────────────
// CSV ダウンロード
// ────────────────────────────────────────────────────────────────
function downloadScatCSV(rows: ScatRow[]) {
  const headers = ["id", "week", "factor", "text", "keywords", "thesaurus", "concept", "theme", "memo", "coder_id"];
  const data = rows.map((r) => headers.map((h) => {
    const v = (r as Record<string, unknown>)[h] ?? "";
    const s = String(v);
    return s.includes(",") || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(","));
  const csv = [headers.join(","), ...data].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "scat_analysis.csv";
  a.click();
}

// ────────────────────────────────────────────────────────────────
// Tab パネル
// ────────────────────────────────────────────────────────────────
interface TabPanelProps { children: React.ReactNode; value: number; index: number }
const TabPanel = ({ children, value, index }: TabPanelProps) =>
  value === index ? <Box pt={2}>{children}</Box> : null;

// ────────────────────────────────────────────────────────────────
// メインコンポーネント
// ────────────────────────────────────────────────────────────────
export default function SCATAnalysisPage() {
  const [tab, setTab] = useState(0);
  const [rows, setRows] = useState<ScatRow[]>(SAMPLE_SCAT);
  const [nextId, setNextId] = useState(SAMPLE_SCAT.length + 1);
  const [kappaResult, setKappaResult] = useState<{ kappa: number; agreement: number; interpretation: string; n: number } | null>(null);
  const [isCalcKappa, setIsCalcKappa] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, msg: "" });

  // コーダー間一致率計算（コーダー1=自動ラベル, コーダー2=手動修正後）
  const handleCalcKappa = useCallback(async () => {
    setIsCalcKappa(true);
    await new Promise((r) => setTimeout(r, 800));

    // デモ: 同じデータの一部を変えてコーダー間差異を模擬
    const coder1 = rows.map((r) => ({ id: r.id, code: r.theme }));
    const coder2 = rows.map((r, i) => ({ id: r.id, code: i % 5 === 0 ? (r.theme + "（変更）") : r.theme })); // 20%不一致模擬

    const result = computeCohenKappa(coder1, coder2);
    setKappaResult(result);
    setIsCalcKappa(false);
    setSnackbar({ open: true, msg: `Cohen's κ = ${result.kappa}（${result.interpretation}）` });
  }, [rows]);

  const addRow = () => {
    setRows((prev) => [...prev, {
      id: nextId, text: "", keywords: "", thesaurus: "", concept: "", theme: "", memo: "",
    }]);
    setNextId((n) => n + 1);
  };

  const removeRow = (id: number) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (id: number, field: keyof ScatRow, value: string) => {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
  };

  const themes = aggregateThemes(rows);
  const concepts = aggregateConcepts(rows);

  // 因子別分布
  const factorDist = Object.entries(FACTOR_LABELS).map(([key, label]) => ({
    factor: label.split(": ")[0],
    count: rows.filter((r) => r.factor === key).length,
  }));

  return (
    <Box>
      {/* ヘッダー */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <PsychologyIcon color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>SCAT質的分析</Typography>
            <Typography variant="body2" color="text.secondary">
              Steps for Coding and Theorization — コーダー間一致率（Cohen's κ）付き
            </Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            startIcon={isCalcKappa ? <CircularProgress size={16} color="inherit" /> : <CalculateIcon />}
            onClick={handleCalcKappa}
            disabled={isCalcKappa}
          >
            κ計算
          </Button>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => downloadScatCSV(rows)}>
            CSV出力
          </Button>
        </Stack>
      </Box>

      {/* カッパ係数結果 */}
      {kappaResult && (
        <Alert
          severity={kappaResult.kappa >= 0.6 ? "success" : "warning"}
          sx={{ mb: 2 }}
          onClose={() => setKappaResult(null)}
        >
          <strong>コーダー間一致率 (Cohen's κ):</strong> κ = {kappaResult.kappa}、
          一致率 = {(kappaResult.agreement * 100).toFixed(1)}% (N={kappaResult.n})、
          解釈: {kappaResult.interpretation}
          （κ≥0.6 が目安）
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }}>
        <Tab label="コーディング表" />
        <Tab label="テーマ・概念集計" />
        <Tab label="因子別分析" />
        <Tab label="量×質 統合" />
      </Tabs>

      {/* ━━ コーディング表 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={0}>
        <Alert severity="info" sx={{ mb: 2 }}>
          SCAT（大谷, 2007/2011）：①元テキスト → ②注目語句 → ③テキスト外語句 → ④構成概念 → ⑤テーマ の順に分析します。
        </Alert>
        {rows.map((row) => (
          <Accordion key={row.id} sx={{ mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" gap={1} width="100%">
                <Chip label={`#${row.id}`} size="small" variant="outlined" />
                {row.week && <Chip label={`第${row.week}週`} size="small" />}
                {row.factor && <Chip label={FACTOR_LABELS[row.factor]?.split(": ")[0]} size="small" color="primary" />}
                <Typography variant="body2" sx={{ flex: 1, ml: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.text || "（空欄）"}</Typography>
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); removeRow(row.id); }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField label="① 元テキスト（日誌記述）" value={row.text} fullWidth multiline rows={3}
                    onChange={(e) => updateRow(row.id, "text", e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="② 注目する語句" value={row.keywords} fullWidth
                    onChange={(e) => updateRow(row.id, "keywords", e.target.value)}
                    helperText="テキスト中の重要語句を抜き出す" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="③ テキスト外の語句（類語・上位概念）" value={row.thesaurus} fullWidth
                    onChange={(e) => updateRow(row.id, "thesaurus", e.target.value)}
                    helperText="類語・上位概念・専門用語に置き換える" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="④ 構成概念" value={row.concept} fullWidth
                    onChange={(e) => updateRow(row.id, "concept", e.target.value)}
                    helperText="概念化・抽象化" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="⑤ テーマ・カテゴリ" value={row.theme} fullWidth
                    onChange={(e) => updateRow(row.id, "theme", e.target.value)}
                    helperText="上位テーマに統合" />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField label="⑥ メモ・注記" value={row.memo} fullWidth
                    onChange={(e) => updateRow(row.id, "memo", e.target.value)} />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        ))}
        <Button startIcon={<AddIcon />} onClick={addRow} sx={{ mt: 1 }} variant="outlined">
          行を追加
        </Button>
      </TabPanel>

      {/* ━━ テーマ・概念集計 ━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={1}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined">
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <LightbulbIcon color="warning" />
                  <Typography variant="subtitle1" fontWeight={700}>テーマ出現頻度</Typography>
                </Box>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={themes} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="theme" width={160} tick={{ fontSize: 11 }} />
                    <RechartTooltip />
                    <Bar dataKey="count" fill="#7b1fa2" name="出現数" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} mb={2}>構成概念一覧</Typography>
                <Stack spacing={1}>
                  {concepts.map((c) => (
                    <Paper key={c.concept} sx={{ p: 1.5 }} variant="outlined">
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">{c.concept}</Typography>
                        <Chip label={`×${c.count}`} size="small" color="primary" />
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} mb={2}>コーダー間一致率（Cohen's κ）</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "grey.100" }}>
                        {["コーダーペア", "κ値", "一致率", "解釈", "基準"].map((h) => (
                          <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {kappaResult ? (
                        <TableRow hover>
                          <TableCell>コーダー1 vs コーダー2</TableCell>
                          <TableCell><Chip label={kappaResult.kappa.toFixed(3)} size="small" color={kappaResult.kappa >= 0.6 ? "success" : "warning"} /></TableCell>
                          <TableCell>{(kappaResult.agreement * 100).toFixed(1)}%</TableCell>
                          <TableCell>{kappaResult.interpretation}</TableCell>
                          <TableCell><Typography variant="caption">κ≥0.6</Typography></TableCell>
                        </TableRow>
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5}>
                            <Button size="small" onClick={handleCalcKappa} startIcon={<CalculateIcon />}>
                              κを計算
                            </Button>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ━━ 因子別分析 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={2}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} mb={2}>ルーブリック因子別 記述件数</Typography>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={factorDist}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="factor" />
                    <YAxis />
                    <RechartTooltip />
                    <Bar dataKey="count" fill="#1976d2" name="記述件数" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} mb={2}>因子別 SCAT記述一覧</Typography>
                {Object.entries(FACTOR_LABELS).map(([key, label]) => {
                  const factorRows = rows.filter((r) => r.factor === key);
                  if (factorRows.length === 0) return null;
                  return (
                    <Box key={key} mb={2}>
                      <Chip label={label} size="small" color="primary" sx={{ mb: 1 }} />
                      {factorRows.map((r) => (
                        <Paper key={r.id} variant="outlined" sx={{ p: 1, mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">第{r.week}週</Typography>
                          <Typography variant="body2">{r.concept || r.text.slice(0, 50)}</Typography>
                          <Typography variant="caption" color="primary">テーマ: {r.theme}</Typography>
                        </Paper>
                      ))}
                    </Box>
                  );
                })}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ━━ 量×質 統合 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={3}>
        <Alert severity="success" sx={{ mb: 3 }}>
          <strong>量的・質的混合分析（収束デザイン）</strong>：AIルーブリック評価スコア（量的）と日誌SCAT分析（質的）の対応関係を可視化します。
        </Alert>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} mb={2}>
                  SCAT分析テーマ × ルーブリック因子 対応マトリクス
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#e8f5e9" }}>
                        <TableCell sx={{ fontWeight: 700 }}>SCATテーマ</TableCell>
                        {Object.values(FACTOR_LABELS).map((f) => (
                          <TableCell key={f} sx={{ fontWeight: 700 }}>{f.split(": ")[0]}</TableCell>
                        ))}
                        <TableCell sx={{ fontWeight: 700 }}>件数</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {themes.map((t) => {
                        const relatedRows = rows.filter((r) => r.theme === t.theme);
                        return (
                          <TableRow key={t.theme} hover>
                            <TableCell>{t.theme}</TableCell>
                            {Object.keys(FACTOR_LABELS).map((f) => (
                              <TableCell key={f} align="center">
                                {relatedRows.filter((r) => r.factor === f).length > 0
                                  ? <Chip label={relatedRows.filter((r) => r.factor === f).length} size="small" color="primary" />
                                  : "—"
                                }
                              </TableCell>
                            ))}
                            <TableCell><Chip label={t.count} size="small" /></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} mb={2}>
                  混合研究法 統合フレームワーク（論文 3.8節）
                </Typography>
                {[
                  { phase: "Phase 1", label: "量的データ収集", desc: "AIルーブリック評価（CoT-A）・人間評価・自己評価スコア", color: "#1976d2" },
                  { phase: "Phase 2", label: "質的データ収集", desc: "実習日誌テキスト（OCR読み込み対応）・省察チャット記録", color: "#43a047" },
                  { phase: "Phase 3", label: "SCAT分析", desc: "コーディング → 構成概念 → テーマ化（2名コーダー、κ確認）", color: "#fb8c00" },
                  { phase: "Phase 4", label: "混合統合", desc: "スコア変化（量的）と省察テーマ変化（質的）の対応分析", color: "#7b1fa2" },
                ].map((p) => (
                  <Paper key={p.phase} sx={{ p: 2, mb: 1, borderLeft: `4px solid ${p.color}` }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip label={p.phase} size="small" sx={{ bgcolor: p.color, color: "white" }} />
                      <Typography variant="subtitle2" fontWeight={700}>{p.label}</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>{p.desc}</Typography>
                  </Paper>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* スナックバー */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ open: false, msg: "" })}
        message={snackbar.msg}
      />
    </Box>
  );
}
