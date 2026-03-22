const fs = require('fs');
const path = '/home/user/webapp/src/pages/SCATAnalysisPage.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace('import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from "recharts";',
`import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from "recharts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import mockApi from "../api/client";`);

const uiCode = `
export default function SCATAnalysisPage() {
  const [tab, setTab] = useState(0);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [researcherId, setResearcherId] = useState<string>("researcher-A");
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newSegmentText, setNewSegmentText] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, msg: "", severity: "success" as any });
  const [kappaResult, setKappaResult] = useState<{ kappa: number; agreement: number; interpretation: string; n: number } | null>(null);

  const queryClient = useQueryClient();

  const { data: projectsData, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['scat-projects'],
    queryFn: () => mockApi.getScatProjects()
  });

  const { data: segmentsData, isLoading: isLoadingSegments } = useQuery({
    queryKey: ['scat-segments', selectedProjectId],
    queryFn: () => mockApi.getScatSegments(selectedProjectId),
    enabled: !!selectedProjectId
  });

  const { data: codesData, isLoading: isLoadingCodes } = useQuery({
    queryKey: ['scat-codes', selectedProjectId],
    queryFn: () => mockApi.getScatCodes(selectedProjectId),
    enabled: !!selectedProjectId
  });

  const createProjectMut = useMutation({
    mutationFn: (title: string) => mockApi.createScatProject(title, "SCAT Analysis", researcherId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scat-projects'] });
      setSelectedProjectId(data.id);
      setNewProjectTitle("");
      setSnackbar({ open: true, msg: "プロジェクトを作成しました", severity: "success" });
    }
  });

  const addSegmentMut = useMutation({
    mutationFn: (text: string) => {
      const segments = [{ segment_order: (segmentsData?.segments?.length || 0) + 1, text_content: text }];
      return mockApi.createScatSegments(selectedProjectId, segments);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scat-segments', selectedProjectId] });
      setNewSegmentText("");
      setSnackbar({ open: true, msg: "セグメントを追加しました", severity: "success" });
    }
  });

  const saveCodeMut = useMutation({
    mutationFn: (codeData: any) => mockApi.saveScatCode(codeData),
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
    <Box>
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
      </Tabs>

      <TabPanel value={tab} index={0}>
        <Alert severity="info" sx={{ mb: 2 }}>
          SCAT（大谷, 2007/2011）：①元テキスト → ②注目語句 → ③テキスト外語句 → ④構成概念 → ⑤テーマ の順に分析します。
        </Alert>
        
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
                  <Chip label={\`#\${seg.segment_order}\`} size="small" variant="outlined" />
                  <Typography variant="body2" sx={{ flex: 1, minWidth: 0, ml: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{seg.text_content || "（空欄）"}</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField label="② 注目する語句" value={code.step1_keywords || ""} fullWidth
                      onBlur={(e) => handleSaveCode(seg.id, "step1_keywords", e.target.value, code)}
                      onChange={(e) => {
                        // Optimistic update omitted for simplicity, use onBlur to save
                        const input = e.target;
                      }}
                      defaultValue={code.step1_keywords || ""}
                      helperText="テキスト中の重要語句を抜き出す" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="③ テキスト外の語句（類語・上位概念）" defaultValue={code.step2_thesaurus || ""} fullWidth
                      onBlur={(e) => handleSaveCode(seg.id, "step2_thesaurus", e.target.value, code)}
                      helperText="類語・上位概念・専門用語に置き換える" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="④ 構成概念" defaultValue={code.step3_concept || ""} fullWidth
                      onBlur={(e) => handleSaveCode(seg.id, "step3_concept", e.target.value, code)}
                      helperText="概念化・抽象化" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="⑤ テーマ・カテゴリ" defaultValue={code.step4_theme || ""} fullWidth
                      onBlur={(e) => handleSaveCode(seg.id, "step4_theme", e.target.value, code)}
                      helperText="上位テーマに統合" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="対応する因子" defaultValue={code.factor || ""} fullWidth
                      onBlur={(e) => handleSaveCode(seg.id, "factor", e.target.value, code)}
                      helperText="例: factor1" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="⑥ メモ・注記" defaultValue={code.memo || ""} fullWidth
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
          <Grid item xs={12} md={6}>
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
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} mb={2}>構成概念一覧</Typography>
                <Stack spacing={1}>
                  {concepts.map((c) => (
                    <Paper key={c.concept} sx={{ p: 1.5 }} variant="outlined">
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">{c.concept}</Typography>
                        <Chip label={\`×\${c.count}\`} size="small" color="primary" />
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
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
          <Grid item xs={12} md={6}>
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
          <Grid item xs={12} md={6}>
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
          <Grid item xs={12}>
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
    </Box>
  );
}
`;

const lines = content.split('\n');
const exportLine = lines.findIndex(l => l.includes('export default function SCATAnalysisPage() {'));

const newContent = content.substring(0, content.indexOf(lines[exportLine])) + uiCode;

fs.writeFileSync(path, newContent);
