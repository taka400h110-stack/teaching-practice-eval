const fs = require('fs');

// Fix AdminDashboardPage
let admin = fs.readFileSync('src/pages/AdminDashboardPage.tsx', 'utf8');
admin = admin.replace('const json = await res.json();', 'const json = await res.json() as any;');
fs.writeFileSync('src/pages/AdminDashboardPage.tsx', admin);

// Fix ReliabilityAnalysisPage
let rel = fs.readFileSync('src/pages/ReliabilityAnalysisPage.tsx', 'utf8');
rel = rel.replace(
  'import { Select, MenuItem, InputLabel, FormControl, TextField, DialogActions, Button,',
  'import { Select, MenuItem, InputLabel, FormControl, TextField,'
);
rel = rel.replace(
  'if (profRes.ok) profiles = (await profRes.json()).profiles || [];',
  'if (profRes.ok) profiles = ((await profRes.json()) as any).profiles || [];'
);
rel = rel.replace(
  'if (res.ok) setEvaluatorProfiles((await res.json()).profiles || []);',
  'if (res.ok) setEvaluatorProfiles(((await res.json()) as any).profiles || []);'
);

fs.writeFileSync('src/pages/ReliabilityAnalysisPage.tsx', rel);
