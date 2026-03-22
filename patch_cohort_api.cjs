const fs = require('fs');

let content = fs.readFileSync('src/pages/CohortsManagementPage.tsx', 'utf8');

// Replace mockApi.getCohortProfiles with direct fetch
const fetchReplacement = `
    queryFn: async () => {
      const role = JSON.parse(localStorage.getItem('user_info') || '{}').role || 'researcher';
      const res = await fetch('/api/data/cohorts', { headers: { 'X-User-Role': role } });
      if (!res.ok) return [];
      const json = await res.json() as any;
      return json.students || json.cohorts || [];
    }
`;

content = content.replace(/queryFn: \(\) => mockApi\.getCohortProfiles\(\),/, fetchReplacement);

// Fix the BigFive check
const bigFiveReplacement = `
      {/* ━━ BigFive タブ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TabPanel value={tab} index={3}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              現在、BigFive（パーソナリティ特性）データは実システム内で収集・連携されていません。以下の機能は外部分析（R/SPSSなど）を前提とした表示プレースホルダです。
            </Alert>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
`;

content = content.replace(/\{\/\* ━━ BigFive タブ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ \*\/}\n      <TabPanel value=\{tab\} index=\{3\}>\n        <Grid container spacing=\{3\}>\n          <Grid size=\{\{ xs: 12, md: 6 \}\}>/g, bigFiveReplacement);

// Remove mockApi import
content = content.replace(/import mockApi from "\.\.\/api\/client";\n/g, '');

fs.writeFileSync('src/pages/CohortsManagementPage.tsx', content);
console.log("Patched CohortsManagementPage.tsx");
