const fs = require('fs');
const file = 'src/pages/LongitudinalAnalysisPage.tsx';
let code = fs.readFileSync(file, 'utf8');

// Imports
if (!code.includes('MenuItem') || !code.includes('Select')) {
  code = code.replace(
    'import {',
    'import { MenuItem, Select, FormControl, InputLabel, RadioGroup, Radio,'
  );
}

if (!code.includes('const [lgcmMode')) {
  code = code.replace(
    'const [weeklyStats',
    'const [lgcmMode, setLgcmMode] = useState<"legacy" | "rigorous">("rigorous");\n  const [weeklyStats'
  );
}

// Update handleLGCM to pass mode
code = code.replace(
  'body: JSON.stringify({ weekly_scores: myScores })',
  'body: JSON.stringify({ weekly_scores: myScores, mode: lgcmMode })'
);

// Add radio buttons to trigger the change and display missing data strategy
if (!code.includes('value={lgcmMode}')) {
  const controls = `
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Button variant="contained" onClick={handleLGCM}>LGCM / LCGA を実行する</Button>
            <FormControl component="fieldset">
              <RadioGroup row value={lgcmMode} onChange={(e) => setLgcmMode(e.target.value as "legacy" | "rigorous")}>
                <FormControlLabel value="legacy" control={<Radio size="small" />} label="OLS近似 (Legacy)" />
                <FormControlLabel value="rigorous" control={<Radio size="small" />} label="EM-FIML近似 (Rigorous)" />
              </RadioGroup>
            </FormControl>
          </Box>
          {lgcmResult && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2"><strong>推定手法:</strong> {lgcmResult.estimator}</Typography>
              <Typography variant="body2"><strong>欠測値処理:</strong> {lgcmResult.missing_data_strategy}</Typography>
            </Alert>
          )}
`;
  code = code.replace(
    '<Button variant="contained" onClick={handleLGCM}>LGCM / LCGA を実行する</Button>',
    controls
  );
}

fs.writeFileSync(file, code);
