import React, { useState } from "react";
import {
  Box, Typography, Card, CardContent, Chip, Grid, Paper,
  Tabs, Tab, TextField, Button, IconButton, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Alert, Accordion, AccordionSummary, AccordionDetails,
} from "@mui/material";
import PsychologyIcon from "@mui/icons-material/Psychology";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LightbulbIcon from "@mui/icons-material/Lightbulb";

// SCAT（Steps for Coding and Theorization）
// 4列分析: テキスト → 注目語 → テキスト外語 → 構成概念
interface ScatRow {
  id: number;
  text:       string;  // 元テキスト（①）
  keywords:   string;  // ②注目する語句
  thesaurus:  string;  // ③テキスト外の語句
  concept:    string;  // ④構成概念
  theme:      string;  // ⑤テーマ
  memo:       string;  // ⑥メモ
}

const SAMPLE_SCAT: ScatRow[] = [
  {
    id: 1,
    text: "ウォン君が算数の問題でつまずいていたので、絵カードを使って視覚的に説明した。すると理解できたようで笑顔になった。",
    keywords: "つまずく・絵カード・視覚的・笑顔",
    thesaurus: "学習困難・視覚支援・個別対応・感情的反応",
    concept: "視覚支援による個別学習困難の解消",
    theme: "インクルーシブ教育実践",
    memo: "外国籍児童への配慮と個別最適化の事例",
  },
  {
    id: 2,
    text: "朝の会でクラス全体がざわついており、なかなか落ち着けなかった。声を大きくしても効果がなく、黒板に大きく「静かに」と書いたら静まった。",
    keywords: "ざわつく・声を大きく・効果がない・黒板",
    thesaurus: "学級経営・注意喚起・視覚的指示・試行錯誤",
    concept: "視覚的指示による学級秩序の回復",
    theme: "学級経営スキルの習得",
    memo: "声だけでなく多モーダルな指示の有効性",
  },
  {
    id: 3,
    text: "自分の授業後の省察で、一方的な説明が多かったと感じ、次の授業では発問を増やした。生徒の反応が明らかに変わった。",
    keywords: "省察・一方的・発問・反応が変わった",
    thesaurus: "反省的実践・双方向授業・省察サイクル・改善",
    concept: "省察に基づく授業改善の循環",
    theme: "反省的実践者の成長",
    memo: "PDCA的省察サイクルの顕在化",
  },
];

// 理論記述（ストーリーライン）
const STORYLINE = `
視覚支援による個別学習困難の解消は、インクルーシブ教育実践の核心にある。
学習困難を示す児童への「視覚的個別対応」が感情的反応（笑顔）を引き出し、
これが学習参加の動機付けとなる。一方、学級全体では試行錯誤を経て
「視覚的指示による秩序回復」が見出される。これらの経験が蓄積されることで
「省察に基づく授業改善の循環」が形成され、反省的実践者としての成長が促進される。
すなわち、視覚支援・個別対応・省察サイクルの三者が相互連関した形で
教育実習生の専門性発達を規定している。
`.trim();

interface TabPanelProps { children: React.ReactNode; value: number; index: number; }
const TabPanel = ({ children, value, index }: TabPanelProps) =>
  value === index ? <Box pt={2}>{children}</Box> : null;

export default function SCATAnalysisPage() {
  const [tab, setTab] = useState(0);
  const [rows, setRows] = useState<ScatRow[]>(SAMPLE_SCAT);
  const [nextId, setNextId] = useState(SAMPLE_SCAT.length + 1);

  const addRow = () => {
    setRows((prev) => [...prev, {
      id: nextId, text: "", keywords: "", thesaurus: "", concept: "", theme: "", memo: "",
    }]);
    setNextId((n) => n + 1);
  };

  const removeRow = (id: number) => setRows((prev) => prev.filter((r) => r.id !== id));

  const updateRow = (id: number, field: keyof ScatRow, value: string) => {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
  };

  // 構成概念一覧
  const concepts = rows.filter((r) => r.concept).map((r) => r.concept);
  const themes   = [...new Set(rows.filter((r) => r.theme).map((r) => r.theme))];

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <PsychologyIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>SCAT 質的分析</Typography>
        <Chip label="Steps for Coding and Theorization" size="small" variant="outlined" />
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }}>
        <Tab label="SCAT表（コーディング）" />
        <Tab label="構成概念・テーマ" />
        <Tab label="ストーリーライン・理論" />
        <Tab label="使い方ガイド" />
      </Tabs>

      {/* ━━ SCAT表 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={0}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="body2" color="text.secondary">
            日誌のテキストを分析してコーディングしてください
          </Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={addRow} size="small">
            行を追加
          </Button>
        </Box>

        {rows.map((row, idx) => (
          <Card key={row.id} variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Chip label={`#${idx + 1}`} size="small" color="primary" />
                <IconButton size="small" onClick={() => removeRow(row.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth multiline minRows={2} size="small"
                    label="① テキスト（日誌の記述）"
                    value={row.text}
                    onChange={(e) => updateRow(row.id, "text", e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth size="small"
                    label="② 注目する語句"
                    value={row.keywords}
                    onChange={(e) => updateRow(row.id, "keywords", e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth size="small"
                    label="③ テキスト外の語句（類義語・対義語）"
                    value={row.thesaurus}
                    onChange={(e) => updateRow(row.id, "thesaurus", e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth size="small"
                    label="④ 構成概念"
                    value={row.concept}
                    onChange={(e) => updateRow(row.id, "concept", e.target.value)}
                    sx={{ "& .MuiOutlinedInput-root": { borderColor: "#1976d2" } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth size="small"
                    label="⑤ テーマ"
                    value={row.theme}
                    onChange={(e) => updateRow(row.id, "theme", e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth size="small"
                    label="⑥ メモ・解釈"
                    value={row.memo}
                    onChange={(e) => updateRow(row.id, "memo", e.target.value)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ))}
      </TabPanel>

      {/* ━━ 構成概念・テーマ ━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={1}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  抽出された構成概念
                </Typography>
                {concepts.length === 0 ? (
                  <Typography color="text.secondary">構成概念がまだありません</Typography>
                ) : (
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {concepts.map((c, i) => (
                      <Chip key={i} label={c} color="primary" variant="outlined" />
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  テーマ一覧
                </Typography>
                {themes.length === 0 ? (
                  <Typography color="text.secondary">テーマがまだありません</Typography>
                ) : (
                  themes.map((t, i) => (
                    <Box key={i} display="flex" alignItems="center" gap={1} mb={1}>
                      <LightbulbIcon color="warning" fontSize="small" />
                      <Typography variant="body2" fontWeight={600}>{t}</Typography>
                      <Chip label={`${rows.filter((r) => r.theme === t).length}件`}
                        size="small" color="warning" variant="outlined"
                      />
                    </Box>
                  ))
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* テーマ別詳細 */}
          {themes.map((theme) => (
            <Grid key={theme} size={{ xs: 12 }}>
              <Accordion variant="outlined">
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LightbulbIcon color="warning" fontSize="small" />
                    <Typography fontWeight={700}>{theme}</Typography>
                    <Chip label={`${rows.filter((r) => r.theme === theme).length}件`} size="small" />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {rows.filter((r) => r.theme === theme).map((r) => (
                    <Paper key={r.id} sx={{ p: 1.5, mb: 1, bgcolor: "#f5f5f5" }}>
                      <Typography variant="caption" color="text.secondary">構成概念: </Typography>
                      <Chip label={r.concept} size="small" color="primary" sx={{ mb: 0.5 }} />
                      <Typography variant="body2">{r.text}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                        メモ: {r.memo}
                      </Typography>
                    </Paper>
                  ))}
                </AccordionDetails>
              </Accordion>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* ━━ ストーリーライン・理論 ━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={2}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  ストーリーライン
                </Typography>
                <TextField fullWidth multiline minRows={6}
                  defaultValue={STORYLINE}
                  placeholder="ストーリーラインを入力してください..."
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  理論記述
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  構成概念の関係性を命題として記述してください。
                </Alert>
                {[
                  "【命題1】視覚支援による個別対応は、学習困難を持つ児童の理解を促進し感情的な関与を高める。",
                  "【命題2】反省的実践サイクルの形成は、教育実習生の授業改善行動を促進する。",
                  "【命題3】試行錯誤経験の蓄積は、多様な指導方略の獲得につながる。",
                ].map((prop, i) => (
                  <TextField key={i} fullWidth size="small" defaultValue={prop}
                    sx={{ mb: 1 }} label={`命題 ${i + 1}`}
                  />
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ━━ ガイド ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={3}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              SCAT分析の手順
            </Typography>
            {[
              { step: "①", title: "テキスト記述", desc: "インタビューや日誌の原文をそのまま入力します。" },
              { step: "②", title: "注目する語句の抽出", desc: "テキストの中で重要と思われる語句をピックアップします。" },
              { step: "③", title: "テキスト外の語句", desc: "②で抽出した語句の類義語・対義語・上位概念などを記します。" },
              { step: "④", title: "構成概念の生成", desc: "③の語句群をまとめて抽象度の高い「構成概念」を生成します。" },
              { step: "⑤", title: "テーマの設定", desc: "複数の構成概念をまとめる共通のテーマを設定します。" },
              { step: "⑥", title: "メモ・解釈", desc: "分析者の解釈や気づきをメモとして記録します。" },
              { step: "⑦", title: "ストーリーライン", desc: "全テーマの関係性を文章で記述します（理論記述の準備）。" },
              { step: "⑧", title: "理論記述", desc: "ストーリーラインを命題化し、理論として記述します。" },
            ].map((s) => (
              <Box key={s.step} display="flex" gap={2} mb={1.5}>
                <Chip label={s.step} color="primary" sx={{ minWidth: 40 }} />
                <Box>
                  <Typography variant="body2" fontWeight={700}>{s.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{s.desc}</Typography>
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      </TabPanel>
    </Box>
  );
}
