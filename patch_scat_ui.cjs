const fs = require('fs');
const path = '/home/user/webapp/src/pages/SCATAnalysisPage.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Change UI labels for 4 steps
code = code.replace(/② 注目する語句/g, "① 注目語句 (Step 1)");
code = code.replace(/③ テキスト外の語句（類語・上位概念）/g, "② 言い換え語句・データ外 (Step 2)");
code = code.replace(/④ 構成概念/g, "③ 説明語句・文脈 (Step 3)");
code = code.replace(/⑤ テーマ・カテゴリ/g, "④ テーマ・構成概念 (Step 4)");
code = code.replace(/⑥ メモ・注記/g, "⑤ 疑問・課題メモ (Step 5)");

// 2. Add AI logic and storyline display
const aiMut = `
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
        await apiFetch(\`/api/data/scat/projects/\${selectedProjectId}/theorization\`, {
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
          const segRes = await apiFetch(\`/api/data/scat/segments/\${selectedProjectId}\`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ segments: [{ text_content: seg.raw_text }] })
          });
          const segData = await segRes.json();
          // Wait briefly
          await new Promise(r => setTimeout(r, 200));
          
          // Re-fetch segments to get the new segment id
          const segListRes = await apiFetch(\`/api/data/scat/segments/\${selectedProjectId}\`, { headers: { 'Authorization': \`Bearer \${localStorage.getItem('auth_token')}\`, 'Content-Type': 'application/json' } });
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
      setSnackbar({ open: true, msg: \`AI分析エラー: \${err.message}\`, severity: "error" });
    }
  });

  const handleAiAnalyze = () => {
    if (aiText.trim() && selectedProjectId) {
      aiAnalyzeMut.mutate(aiText.trim());
    } else {
      setSnackbar({ open: true, msg: "テキストとプロジェクトを選択してください", severity: "warning" });
    }
  };
`;

code = code.replace('const [kappaResult, setKappaResult] = useState', 'const [aiText, setAiText] = useState("");\n  const [kappaResult, setKappaResult] = useState');
code = code.replace('const createProjectMut = useMutation', aiMut + '\n  const createProjectMut = useMutation');

const aiUi = `
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
`;

code = code.replace('<Box mb={3} display="flex" gap={1}>', aiUi + '\n        <Box mb={3} display="flex" gap={1}>');

const storylineUi = `
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
`;

code = code.replace('<Tab label="量×質 統合" disabled={!selectedProjectId} />', '<Tab label="量×質 統合" disabled={!selectedProjectId} />\n        <Tab label="理論・ストーリーライン" disabled={!selectedProjectId} />');
code = code.replace('</Box>\n  );\n}', storylineUi + '\n    </Box>\n  );\n}');

fs.writeFileSync(path, code);
