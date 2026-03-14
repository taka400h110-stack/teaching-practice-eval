const fs = require('fs');
let code = fs.readFileSync('src/pages/EvaluationsPage.tsx', 'utf8');

// 1. Add imports for Dialog components and Radio/Checkbox etc.
const importsToInject = `import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  FormControl, FormLabel, RadioGroup, FormControlLabel, Radio,
  Divider,
} from "@mui/material";`;

code = code.replace(
  'import { useNavigate } from "react-router-dom";',
  importsToInject + '\nimport { useNavigate } from "react-router-dom";'
);

// 2. Add state and effect for the Evaluator Survey inside the component
const stateToInject = `  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("all");
  const user = mockApi.getCurrentUser();
  const isEvaluator = user?.role === "evaluator";

  // 評価者アンケート用State
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyForm, setSurveyForm] = useState({ univExp: "", hasSchoolExp: "", mentorCount: "" });

  React.useEffect(() => {
    if (isEvaluator) {
      const isCompleted = localStorage.getItem("evaluator_survey_completed");
      if (!isCompleted) {
        setShowSurvey(true);
      }
    }
  }, [isEvaluator]);

  const handleSurveySubmit = () => {
    if (!surveyForm.univExp || !surveyForm.hasSchoolExp) return;
    if (surveyForm.hasSchoolExp === "yes" && !surveyForm.mentorCount) return;
    
    localStorage.setItem("evaluator_survey_completed", "true");
    setShowSurvey(false);
  };`;

code = code.replace(
  /  const navigate = useNavigate\(\);\n  const \[statusFilter, setStatusFilter\] = useState\("all"\);/,
  stateToInject
);

// 3. Limit evalJournals to 30 if evaluator
const filterToInject = `  // 評価対象は submitted / evaluated ステータスの日誌
  let evalJournals = journals.filter((j) =>
    j.status !== "draft" &&
    (statusFilter === "all" || j.status === statusFilter)
  );
  if (isEvaluator) {
    evalJournals = evalJournals.slice(0, 30);
  }`;

code = code.replace(
  /  \/\/ 評価対象は submitted \/ evaluated ステータスの日誌\n  const evalJournals = journals\.filter\(\(j\) =>\n    j\.status !== "draft" &&\n    \(statusFilter === "all" \|\| j\.status === statusFilter\)\n  \);/,
  filterToInject
);

// 4. Update the summary numbers to show "0 / 30" style for evaluator
const summaryToInject = `      {/* サマリー */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: isEvaluator ? "評価タスク件数" : "総評価件数",   value: isEvaluator ? "30" : evalResults.length },
          { label: "評価完了",     value: isEvaluator ? \`\${completed.length} / 30\` : completed.length },
          { label: "評価待ち",     value: evalResults.filter((r) => r.status === "pending").length },
          { label: "平均スコア",   value: completed.length
              ? +(completed.reduce((s, r) => s + (r.total ?? 0), 0) / completed.length).toFixed(2)
              : "–" },
        ].map((s) => (`;

code = code.replace(
  /      \{\/\* サマリー \*\/}\n      <Grid container spacing=\{2\} mb=\{3\}>\n        \[\n          \{ label: "総評価件数",   value: evalResults.length \},\n          \{ label: "評価完了",     value: completed.length \},\n          \{ label: "評価待ち",     value: evalResults.filter\(\(r\) => r.status === "pending"\).length \},\n          \{ label: "平均スコア",   value: completed.length\n              \? \+\(completed.reduce\(\(s, r\) => s \+ \(r.total \?\? 0\), 0\) \/ completed.length\).toFixed\(2\)\n              : "–" \},\n        \]\.map\(\(s\) => \(/,
  summaryToInject
);

// Add progress bar explicitly if evaluator
const progressToInject = `      {isEvaluator && (
        <Card variant="outlined" sx={{ mb: 3, bgcolor: "#e3f2fd" }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              評価タスク進捗（3名平均分析用データ）
            </Typography>
            <Box display="flex" alignItems="center" gap={2}>
              <Box flex={1}>
                <LinearProgress variant="determinate" value={(completed.length / 30) * 100} sx={{ height: 10, borderRadius: 5 }} />
              </Box>
              <Typography variant="body2" fontWeight="bold">
                {completed.length} / 30 件
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* 推移チャート */}`;

code = code.replace(
  /      \{\/\* 推移チャート \*\/\}/,
  progressToInject
);

// 5. Add the Dialog UI at the end
const dialogUI = `
      {/* 評価者用 初回アンケートダイアログ */}
      <Dialog open={showSurvey} disableEscapeKeyDown fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: "bold" }}>評価者 事前アンケート</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" paragraph>
            評価タスクを開始する前に、以下の属性についてお答えください。（分析時の属性データとしてのみ使用します）
          </Typography>

          <Box sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 3 }}>
            <FormControl fullWidth>
              <FormLabel sx={{ fontWeight: "bold", color: "text.primary", mb: 1 }}>
                1. 大学での教育実習関連科目の担当経験年数
              </FormLabel>
              <TextField
                type="number"
                size="small"
                placeholder="例: 5"
                InputProps={{ endAdornment: <Typography variant="body2" sx={{ ml: 1 }}>年</Typography> }}
                value={surveyForm.univExp}
                onChange={(e) => setSurveyForm({ ...surveyForm, univExp: e.target.value })}
              />
            </FormControl>

            <Divider />

            <FormControl fullWidth>
              <FormLabel sx={{ fontWeight: "bold", color: "text.primary" }}>
                2. 学校現場での教員経験の有無
              </FormLabel>
              <RadioGroup
                row
                value={surveyForm.hasSchoolExp}
                onChange={(e) => setSurveyForm({ ...surveyForm, hasSchoolExp: e.target.value })}
              >
                <FormControlLabel value="yes" control={<Radio />} label="あり" />
                <FormControlLabel value="no" control={<Radio />} label="なし" />
              </RadioGroup>
            </FormControl>

            {surveyForm.hasSchoolExp === "yes" && (
              <FormControl fullWidth>
                <FormLabel sx={{ fontWeight: "bold", color: "text.primary", mb: 1 }}>
                  3. 過去に教育実習生を担当した回数（学校現場で）
                </FormLabel>
                <TextField
                  type="number"
                  size="small"
                  placeholder="例: 3"
                  InputProps={{ endAdornment: <Typography variant="body2" sx={{ ml: 1 }}>回</Typography> }}
                  value={surveyForm.mentorCount}
                  onChange={(e) => setSurveyForm({ ...surveyForm, mentorCount: e.target.value })}
                />
              </FormControl>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSurveySubmit}
            disabled={
              !surveyForm.univExp ||
              !surveyForm.hasSchoolExp ||
              (surveyForm.hasSchoolExp === "yes" && !surveyForm.mentorCount)
            }
          >
            回答して評価一覧へ進む
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}`;

code = code.replace(
  /    <\/Box>\n  \);\n\}/,
  dialogUI
);

fs.writeFileSync('src/pages/EvaluationsPage.tsx', code);
console.log("Updated EvaluationsPage.tsx");
