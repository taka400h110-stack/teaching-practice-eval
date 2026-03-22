const fs = require('fs');

let content = fs.readFileSync('src/pages/ComparisonPage.tsx', 'utf8');

// Remove genHumanScores and compData
content = content.replace(/function genHumanScores\(\).*?\nconst compData = genHumanScores\(\);\n/s, '');

// Adjust component to use actual data
const useQueryReplacement = `
  const { data: compDataRaw, isLoading: isLoadingComp } = useQuery({
    queryKey: ["ai-vs-human"],
    queryFn: async () => {
      const role = JSON.parse(localStorage.getItem('user_info') || '{}').role || 'researcher';
      const res = await fetch('/api/stats/ai-vs-human', { headers: { 'X-User-Role': role } });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    }
  });

  const compData = React.useMemo(() => {
    if (!compDataRaw) return [];
    return compDataRaw.map((d: any, idx: number) => ({
      id: idx,
      item: \`\${d.journal_id} (\${d.evaluator_name})\`,
      ai: +(d.ai_total || 0).toFixed(2),
      human: +(d.human_total || 0).toFixed(2),
      diff: +((d.human_total || 0) - (d.ai_total || 0)).toFixed(2),
      factor: '総合',
    }));
  }, [compDataRaw]);

  if (isLoadingComp) return <LinearProgress />;

  if (compData.length === 0) {
    return (
      <Box p={4}>
        <Typography variant="h5" gutterBottom>AI vs 人間比較</Typography>
        <Alert severity="warning">比較対象データが存在しません。AI評価と人間評価の両方が完了したデータが必要です。</Alert>
      </Box>
    );
  }
`;

content = content.replace(/  const \{ data: cohorts, isLoading \} = useQuery\(\{[\s\S]*?\}\);\n\n  if \(isLoading\) return <LinearProgress \/>;\n/s, useQueryReplacement);

content = content.replace(/import mockApi from "\.\.\/api\/client";\n/g, '');

fs.writeFileSync('src/pages/ComparisonPage.tsx', content);
console.log("Patched ComparisonPage.tsx");
