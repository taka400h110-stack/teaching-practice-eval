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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api/client";

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
  const headers = ["segment_id", "week", "factor", "raw_text", "step1_focus_words", "step2_outside_words", "step3_explanatory_words", "step4_theme_construct", "step5_questions_issues", "coder_id"];
  const data = rows.map((r) => {
    const rowObj: Record<string, any> = {
      segment_id: r.id, week: r.week, factor: r.factor,
      raw_text: r.text, step1_focus_words: r.keywords, step2_outside_words: r.thesaurus,
      step3_explanatory_words: r.concept, step4_theme_construct: r.theme, step5_questions_issues: r.memo,
      coder_id: r.coder_id
    };
    return headers.map((h) => {
      const v = rowObj[h] ?? "";
    const s = String(v);
    return s.includes(",") || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(",");
  });
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
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [researcherId, setResearcherId] = useState<string>("researcher-A");
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newSegmentText, setNewSegmentText] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, msg: "", severity: "success" as any });
  const [aiText, setAiText] = useState("");
  const [kappaResult, setKappaResult] = useState<{ kappa: number; agreement: number; interpretation: string; n: number } | null>(null);

  const queryClient = useQueryClient();

  const { data: projectsData, isLoading: isLoadingProjects } = useQuery<any>({
    queryKey: ['scat-projects'],
    queryFn: async () => {
      const res = await apiFetch("/api/data/scat/projects", { headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}`, 'Content-Type': 'application/json' } });
      const data = await res.json() as any;
      return data.projects || [];
    }
  });

  const { data: segmentsData, isLoading: isLoadingSegments } = useQuery<any>({
    queryKey: ['scat-segments', selectedProjectId],
    queryFn: async () => {
      const res = await apiFetch(`/api/data/scat/segments/${selectedProjectId}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}`, 'Content-Type': 'application/json' } });
      const data = await res.json() as any;
      return data.segments || [];
    },
    enabled: !!selectedProjectId
  });

  const { data: codesData, isLoading: isLoadingCodes } = useQuery<any>({
    queryKey: ['scat-codes', selectedProjectId],
    queryFn: async () => {
      const res = await apiFetch(`/api/data/scat/codes/${selectedProjectId}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}`, 'Content-Type': 'application/json' } });
      const data = await res.json() as any;
      return data.codes || [];
    },
    enabled: !!selectedProjectId
  });

  
  const aiAnalyzeMut = useMutation<any, Error, string>({
    mutationFn: async (text: string) => {
      const res = await apiFetch("/api/openai/scat-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "AI Analysis failed");
      
      // Save theorization
      if (selectedProjectId) {
        await apiFetch(`/api/data/scat/projects/${selectedProjectId}/theorization`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storyline: data.result.storyline,
            theoretical_description: data.result.theoretical_description
          })
        });
        
        // Save segments and codes
        for (const seg of data.result.segments) {
          // Add segment
          const segRes = await apiFetch(`/api/data/scat/segments/${selectedProjectId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ segments: [{ text_content: seg.raw_text }] })
          });
          const segData = await segRes.json();
          // Wait briefly
          await new Promise(r => setTimeout(r, 200));
          
          // Re-fetch segments to get the new segment id
          const segListRes = await apiFetch(`/api/data/scat/segments/${selectedProjectId}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}`, 'Content-Type': 'application/json' } });
          const segListData = await segListRes.json();
          const newSeg = segListData.segments[segListData.segments.length - 1];
          
          if (newSeg) {
            await apiFetch("/api/data/scat/codes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                segment_id: newSeg.id,
                researcher_id: researcherId,
                step1_words: seg.step1_focus_words || "",
                step2_words: seg.step2_outside_words || "",
                step3_concepts: seg.step3_explanatory_words || "",
                step4_themes: seg.step4_theme_construct || "",
                memo: seg.step5_questions_issues || ""
              })
            });
          }
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scat-segments', selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ['scat-codes', selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ['scat-projects'] });
      setAiText("");
      setSnackbar({ open: true, msg: "AI分析が完了し、セグメントと理論記述を保存しました", severity: "success" });
    },
    onError: (err) => {
      setSnackbar({ open: true, msg: `AI分析エラー: ${err.message}`, severity: "error" });
    }
  });

  const handleAiAnalyze = () => {
    if (aiText.trim() && selectedProjectId) {
      aiAnalyzeMut.mutate(aiText.trim());
    } else {
      setSnackbar({ open: true, msg: "テキストとプロジェクトを選択してください", severity: "warning" });
    }
  };

  const createProjectMut = useMutation<any, Error, any>({
    mutationFn: async (title: string) => {
      const res = await apiFetch("/api/data/scat/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description: "SCAT Analysis", created_by: researcherId })
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scat-projects'] });
      setSelectedProjectId(data.id);
      setNewProjectTitle("");
      setSnackbar({ open: true, msg: "プロジェクトを作成しました", severity: "success" });
    }
  });

  const addSegmentMut = useMutation<any, Error, any>({
    mutationFn: async (text: string) => {
      const segments = [{ segment_order: (segmentsData?.segments?.length || 0) + 1, text_content: text }];
      const res = await apiFetch(`/api/data/scat/segments/${selectedProjectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segments })
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scat-segments', selectedProjectId] });
      setNewSegmentText("");
      setSnackbar({ open: true, msg: "セグメントを追加しました", severity: "success" });
    }
  });

  const saveCodeMut = useMutation<any, Error, any>({
    mutationFn: async (codeData: any) => {
      const res = await apiFetch("/api/data/scat/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(codeData)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scat-codes', selectedProjectId] });
      setSnackbar({ open: true, msg: "保存しました", severity: "success" });
    }
  });

  const handleCreateProject = () => {
    if (newProjectTitle.trim()) {
      createProjectMut.mutate(newProjectTitle.trim());
    }
  };

  const handleAddSegment = () => {
    if (newSegmentText.trim() && selectedProjectId) {
      addSegmentMut.mutate(newSegmentText.trim());
    }
  };

  const handleSaveCode = (segmentId: string, field: string, value: string, currentCode: any) => {
    const payload = {
      segment_id: segmentId,
      researcher_id: researcherId,
      step1_keywords: currentCode?.step1_keywords || "",
      step2_thesaurus: currentCode?.step2_thesaurus || "",
      step3_concept: currentCode?.step3_concept || "",
      step4_theme: currentCode?.step4_theme || "",
      memo: currentCode?.memo || "",
      factor: currentCode?.factor || "",
      [field]: value
    };
    saveCodeMut.mutate(payload);
  };

  const handleCalcKappa = () => {
    if (!codesData?.codes) return;
    const codes = codesData.codes as any[];
    // Get unique segments
    const segmentIds = Array.from(new Set(codes.map(c => c.segment_id)));
    
    // We need 2 distinct coders
    const coders = Array.from(new Set(codes.map(c => c.researcher_id)));
    if (coders.length < 2) {
      setSnackbar({ open: true, msg: "コーダーが2名以上必要です", severity: "warning" });
      return;
    }

    const coder1Id = coders[0];
    const coder2Id = coders[1];

    const coder1Codes = codes.filter(c => c.researcher_id === coder1Id).map(c => ({ id: c.segment_id, code: c.step4_theme || "" }));
    const coder2Codes = codes.filter(c => c.researcher_id === coder2Id).map(c => ({ id: c.segment_id, code: c.step4_theme || "" }));

    const result = computeCohenKappa(coder1Codes, coder2Codes);
    setKappaResult(result);
  };

  // Convert for charts
  const rows: ScatRow[] = (segmentsData?.segments || []).map((seg: any) => {
    const code = (codesData?.codes || []).find((c: any) => c.segment_id === seg.id && c.researcher_id === researcherId);
    return {
      id: seg.id,
      text: seg.text_content,
      keywords: code?.step1_keywords || "",
      thesaurus: code?.step2_thesaurus || "",
      concept: code?.step3_concept || "",
      theme: code?.step4_theme || "",
      memo: code?.memo || "",
      factor: code?.factor || "",
      coder_id: researcherId
    };
  });

  const themes = aggregateThemes(rows);
  const concepts = aggregateConcepts(rows);
  const factorDist = Object.entries(FACTOR_LABELS).map(([key, label]) => ({
    factor: label.split(": ")[0],
    count: rows.filter((r) => r.factor === key).length,
  }));

  return (
    <Box data-testid="statistics-page-root">
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <PsychologyIcon color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>SCAT質的分析 (Project: {projectsData?.projects?.find((p:any) => p.id === selectedProjectId)?.title || "未選択"})</Typography>
            <Typography variant="body2" color="text.secondary">
              Steps for Coding and Theorization — コーダー間一致率（Cohen's κ）付き
            </Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField 
            select 
            size="small" 
            label="プロジェクト" 
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            SelectProps={{ native: true }}
            sx={{ minWidth: 150 }}
          >
            <option value="">-- 選択 --</option>
            {projectsData?.projects?.map((p: any) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </TextField>
          <TextField 
            size="small" 
            label="新規作成" 
            value={newProjectTitle}
            onChange={(e) => setNewProjectTitle(e.target.value)}
          />
          <Button variant="contained" onClick={handleCreateProject} disabled={!newProjectTitle.trim()}>
            作成
          </Button>

          <TextField
            select
            size="small"
            label="研究者"
            value={researcherId}
            onChange={(e) => setResearcherId(e.target.value)}
            SelectProps={{ native: true }}
            sx={{ minWidth: 120, ml: 2 }}
          >
            <option value="researcher-A">研究者A</option>
            <option value="researcher-B">研究者B</option>
          </TextField>
        </Stack>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }}>
        <Tab label="コーディング表" disabled={!selectedProjectId} />
        <Tab label="テーマ・概念集計" disabled={!selectedProjectId} />
        <Tab label="因子別分析" disabled={!selectedProjectId} />
        <Tab label="量×質 統合" disabled={!selectedProjectId} />
        <Tab label="理論・ストーリーライン" disabled={!selectedProjectId} />
      </Tabs>

      <TabPanel value={tab} index={0}>
        <Alert severity="info" sx={{ mb: 2 }}>
          SCAT（大谷, 2007/2011）：セグメントごとに、①注目語句 → ②言い換え語句 → ③説明語句 → ④テーマ・構成概念 → ⑤疑問・課題メモ の順に分析します。
        </Alert>
        
        
        <Card variant="outlined" sx={{ mb: 3, bgcolor: '#f3e5f5' }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <PsychologyIcon /> AI一括分析（自動セグメント化＆コーディング）
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              対象の自由記述テキストを入力すると、意味のまとまりごとにセグメント化し、Step1〜4のコーディングとストーリーライン・理論記述を自動生成します。
            </Typography>
            <TextField 
              fullWidth 
              multiline 
              rows={3} 
              size="small" 
              placeholder="インタビュー記録や日誌テキストをここに貼り付けてください" 
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              sx={{ bgcolor: 'white', mb: 1 }}
            />
            <Button 
              variant="contained" 
              color="secondary" 
              onClick={handleAiAnalyze} 
              disabled={!aiText.trim() || aiAnalyzeMut.isPending || !selectedProjectId}
              startIcon={aiAnalyzeMut.isPending ? <CircularProgress size={20} /> : <PsychologyIcon />}
            >
              {aiAnalyzeMut.isPending ? "分析中..." : "AIで分析する"}
            </Button>
          </CardContent>
        </Card>

        <Box mb={3} display="flex" gap={1}>
          <TextField 
            fullWidth 
            size="small" 
            label="新規セグメントテキストを追加" 
            value={newSegmentText}
            onChange={(e) => setNewSegmentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddSegment();
            }}
          />
          <Button variant="contained" onClick={handleAddSegment} disabled={!newSegmentText.trim()}>
            追加
          </Button>
        </Box>

        {isLoadingSegments ? <CircularProgress /> : segmentsData?.segments?.map((seg: any) => {
          const code = (codesData?.codes || []).find((c: any) => c.segment_id === seg.id && c.researcher_id === researcherId) || {};
          return (
            <Accordion key={seg.id} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ ".MuiAccordionSummary-content": { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%", pr: 2 } }}>
                <Box display="flex" alignItems="center" gap={1} sx={{ width: "100%", overflow: "hidden" }}>
                  <Chip label={`#${seg.segment_order}`} size="small" variant="outlined" />
                  <Typography variant="body2" sx={{ flex: 1, minWidth: 0, ml: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{seg.text_content || "（空欄）"}</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{xs: 12, sm: 6}}>
                    <TextField label="① 注目語句 (Step 1)" value={code.step1_keywords || ""} fullWidth
                      onBlur={(e) => handleSaveCode(seg.id, "step1_keywords", e.target.value, code)}
                      onChange={(e) => {
                        // Optimistic update omitted for simplicity, use onBlur to save
                        const input = e.target;
                      }}
                      defaultValue={code.step1_keywords || ""}
                      helperText="テキスト中の重要語句を抜き出す" />
                  </Grid>
                  <Grid size={{xs: 12, sm: 6}}>
                    <TextField label="② 言い換え語句・データ外 (Step 2)" defaultValue={code.step2_thesaurus || ""} fullWidth
                      onBlur={(e) => handleSaveCode(seg.id, "step2_thesaurus", e.target.value, code)}
                      helperText="類語・上位概念・専門用語に置き換える" />
                  </Grid>
                  <Grid size={{xs: 12, sm: 6}}>
                    <TextField label="③ 説明語句・文脈 (Step 3)" defaultValue={code.step3_concept || ""} fullWidth
                      onBlur={(e) => handleSaveCode(seg.id, "step3_concept", e.target.value, code)}
                      helperText="概念化・抽象化" />
                  </Grid>
                  <Grid size={{xs: 12, sm: 6}}>
                    <TextField label="④ テーマ・構成概念 (Step 4)" defaultValue={code.step4_theme || ""} fullWidth
                      onBlur={(e) => handleSaveCode(seg.id, "step4_theme", e.target.value, code)}
                      helperText="上位テーマに統合" />
                  </Grid>
                  <Grid size={{xs: 12, sm: 6}}>
                    <TextField label="対応する因子" defaultValue={code.factor || ""} fullWidth
                      onBlur={(e) => handleSaveCode(seg.id, "factor", e.target.value, code)}
                      helperText="例: factor1" />
                  </Grid>
                  <Grid size={{xs: 12, sm: 6}}>
                    <TextField label="⑤ 疑問・課題メモ (Step 5)" defaultValue={code.memo || ""} fullWidth
                      onBlur={(e) => handleSaveCode(seg.id, "memo", e.target.value, code)} />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </TabPanel>

      <TabPanel value={tab} index={1}>
        <Grid container spacing={3}>
          <Grid size={{xs: 12, md: 6}}>
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
          <Grid size={{xs: 12, md: 6}}>
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
          <Grid size={{xs: 12}}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} mb={2}>コーダー間一致率（Cohen's κ）</Typography>
                {kappaResult && (
                  <Alert severity={kappaResult.kappa >= 0.6 ? "success" : "warning"} sx={{ mb: 2 }}>
                    <strong>コーダー間一致率 (Cohen's κ):</strong> κ = {kappaResult.kappa}、
                    一致率 = {(kappaResult.agreement * 100).toFixed(1)}% (N={kappaResult.n})、
                    解釈: {kappaResult.interpretation}
                    （κ≥0.6 が目安）
                  </Alert>
                )}
                <Button size="small" onClick={handleCalcKappa} startIcon={<CalculateIcon />} variant="outlined">
                  研究者Aと研究者Bのκを計算
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tab} index={2}>
        <Grid container spacing={3}>
          <Grid size={{xs: 12, md: 6}}>
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
          <Grid size={{xs: 12, md: 6}}>
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

      <TabPanel value={tab} index={3}>
        <Alert severity="success" sx={{ mb: 3 }}>
          <strong>量的・質的混合分析（収束デザイン）</strong>：AIルーブリック評価スコア（量的）と日誌SCAT分析（質的）の対応関係を可視化します。
        </Alert>
        <Grid container spacing={3}>
          <Grid size={{xs: 12}}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} mb={2}>
                  SCAT分析テーマ × ルーブリック因子 対応マトリクス
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ overflowX: "auto" }}>
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
        </Grid>
      </TabPanel>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        message={snackbar.msg}
      />
    
      <TabPanel value={tab} index={4}>
        <Grid container spacing={3}>
          <Grid size={{xs: 12}}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" fontWeight="bold" color="primary" mb={1}>ストーリーライン</Typography>
                <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap', bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
                  {projectsData?.projects?.find((p:any) => p.id === selectedProjectId)?.storyline || "まだストーリーラインがありません。AI分析を実行するか手動で追加してください。"}
                </Typography>
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" fontWeight="bold" color="secondary" mb={1}>理論記述</Typography>
                <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap', bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
                  {projectsData?.projects?.find((p:any) => p.id === selectedProjectId)?.theoretical_description || "まだ理論記述がありません。"}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

    </Box>
  );
}
