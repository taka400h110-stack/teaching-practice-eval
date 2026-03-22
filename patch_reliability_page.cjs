const fs = require('fs');
const file = 'src/pages/ReliabilityAnalysisPage.tsx';
let code = fs.readFileSync(file, 'utf8');

// Imports
if (!code.includes('import { Select, MenuItem, InputLabel, FormControl')) {
  code = code.replace(
    'import {',
    'import { Select, MenuItem, InputLabel, FormControl, TextField, DialogActions, Button,'
  );
}

// Modify fetchFullReliability signature
code = code.replace(
  'async function fetchFullReliability(cohorts: any): Promise<FullReliabilityResult | null> {',
  'async function fetchFullReliability(cohorts: any, experienceGroup: string = "ALL"): Promise<FullReliabilityResult | null> {'
);

// Fetch evaluator profiles and filter
const filterLogic = `
  let profiles: any[] = [];
  try {
    const profRes = await fetch("/api/data/evaluator-profiles");
    if (profRes.ok) profiles = (await profRes.json()).profiles || [];
  } catch (e) {}

  if (experienceGroup !== "ALL") {
    allHumanEvals = allHumanEvals.filter((he: any) => {
      const prof = profiles.find((p: any) => p.evaluator_id === he.evaluator_id);
      const yoe = prof?.years_of_experience || 0;
      if (experienceGroup === "NOVICE") return yoe <= 3;
      if (experienceGroup === "MID") return yoe >= 4 && yoe <= 9;
      if (experienceGroup === "VETERAN") return yoe >= 10;
      return true;
    });
  }
`;

code = code.replace(
  '// journal_idでマッチング',
  filterLogic + '\n  // journal_idでマッチング'
);

// Add state to ReliabilityAnalysisPage
if (!code.includes('const [experienceGroup')) {
  code = code.replace(
    'const [isCalculating, setIsCalculating] = useState(false);',
    `const [isCalculating, setIsCalculating] = useState(false);
  const [experienceGroup, setExperienceGroup] = useState("ALL");
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [evaluatorProfiles, setEvaluatorProfiles] = useState<any[]>([]);
  const [tempProfile, setTempProfile] = useState<{id: string, yoe: number, tb: string}>({id: "", yoe: 0, tb: ""});

  const loadProfiles = async () => {
    try {
      const res = await fetch("/api/data/evaluator-profiles");
      if (res.ok) setEvaluatorProfiles((await res.json()).profiles || []);
    } catch(e) {}
  };
  
  React.useEffect(() => { loadProfiles(); }, []);
  `
  );
}

// Update handleCalculate
code = code.replace(
  'const res = await fetchFullReliability(cohorts);',
  'const res = await fetchFullReliability(cohorts, experienceGroup);'
);
code = code.replace(
  '[cohorts]',
  '[cohorts, experienceGroup]'
);

// Add UI elements
const controls = `
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>評価者経験年数</InputLabel>
            <Select value={experienceGroup} label="評価者経験年数" onChange={(e) => setExperienceGroup(e.target.value)}>
              <MenuItem value="ALL">全評価者 (ALL)</MenuItem>
              <MenuItem value="NOVICE">初任者 (0-3年)</MenuItem>
              <MenuItem value="MID">中堅 (4-9年)</MenuItem>
              <MenuItem value="VETERAN">ベテラン (10年以上)</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={() => setIsProfileDialogOpen(true)}>評価者属性設定</Button>
          <Button variant="contained" onClick={handleCalculate} disabled={isCalculating}>
`;

if (!code.includes('評価者属性設定')) {
  code = code.replace(
    '<Button variant="contained" onClick={handleCalculate} disabled={isCalculating}>',
    controls
  );
}

// Add Dialog
const dialogUI = `
      {/* Evaluator Profile Dialog */}
      <Dialog open={isProfileDialogOpen} onClose={() => setIsProfileDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>評価者属性（経験年数）設定</DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            RQ2の分析のために、評価者の経験年数とバックグラウンドを設定します。
          </Alert>
          <Box display="flex" gap={2} mb={2} alignItems="flex-end">
            <TextField label="評価者ID" size="small" value={tempProfile.id} onChange={e => setTempProfile({...tempProfile, id: e.target.value})} />
            <TextField label="経験年数" type="number" size="small" value={tempProfile.yoe} onChange={e => setTempProfile({...tempProfile, yoe: Number(e.target.value)})} />
            <TextField label="バックグラウンド" size="small" value={tempProfile.tb} onChange={e => setTempProfile({...tempProfile, tb: e.target.value})} />
            <Button variant="contained" onClick={async () => {
              await fetch("/api/data/evaluator-profiles", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ evaluator_id: tempProfile.id, years_of_experience: tempProfile.yoe, training_background: tempProfile.tb })
              });
              loadProfiles();
            }}>保存</Button>
          </Box>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow><TableCell>ID</TableCell><TableCell>経験年数</TableCell><TableCell>バックグラウンド</TableCell></TableRow>
              </TableHead>
              <TableBody>
                {evaluatorProfiles.map(p => (
                  <TableRow key={p.evaluator_id}>
                    <TableCell>{p.evaluator_id}</TableCell>
                    <TableCell>{p.years_of_experience}年</TableCell>
                    <TableCell>{p.training_background}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsProfileDialogOpen(false)}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
`;

code = code.replace(
  '</Box>\n  );\n}',
  dialogUI
);

fs.writeFileSync(file, code);
