const fs = require('fs');
const file = 'src/pages/JournalWorkflowPage.tsx';
let code = fs.readFileSync(file, 'utf8');

// Add evalMutation
if (!code.includes('const evalMutation = useMutation')) {
  const evalMutationStr = `
  const evalMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.runEvaluation(id);
    },
    onSuccess: () => {
      void queryClient_.invalidateQueries({ queryKey: ["journals"] });
      void queryClient_.invalidateQueries({ queryKey: ["allEvaluations"] });
      setSnackMsg("AI評価が完了しました ✓");
      setSnackOpen(true);
    }
  });
  `;
  
  code = code.replace(
    'const saveMutation = useMutation',
    evalMutationStr + '\\n  const saveMutation = useMutation'
  );
  
  // Call it on save if not draft
  code = code.replace(
    'setTimeout(() => setStep(1), 1000);',
    'evalMutation.mutate(data.id);\\n        setTimeout(() => setStep(1), 1000);'
  );
  
  // Add a manual trigger button and loading state
  code = code.replace(
    '<Alert severity="info" sx={{ mb: 2 }}>',
    '{evalMutation.isPending ? <Alert severity="info" sx={{ mb: 2 }}><CircularProgress size={16} sx={{mr:1, verticalAlign:"middle"}}/> AI評価を実行中...</Alert> : <Alert severity="info" sx={{ mb: 2 }}>'
  );
  
  code = code.replace(
    '日誌を提出するとAI評価が生成されます。まず「① 日誌記入」タブで日誌を提出してください。\\n              </Alert>',
    '日誌を提出するとAI評価が生成されます。まず「① 日誌記入」タブで日誌を提出してください。\\n                <Button variant="outlined" size="small" sx={{mt:1, display:"block"}} onClick={() => evalMutation.mutate(targetJournalId)}>AI評価を手動で実行</Button>\\n              </Alert>}'
  );
  
  fs.writeFileSync(file, code, 'utf8');
  console.log('Patched JournalWorkflowPage.tsx to add AI Evaluation hook');
} else {
  console.log('JournalWorkflowPage.tsx already patched');
}
