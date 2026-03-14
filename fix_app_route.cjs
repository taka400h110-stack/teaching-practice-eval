const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// AdvancedAnalyticsPageのimportとRouteを追加
if (!code.includes("AdvancedAnalyticsPage")) {
  code = code.replace(
    /const SCATAnalysisPage        = lazy\(\(\) => import\("\.\/pages\/SCATAnalysisPage"\)\);/,
    `const SCATAnalysisPage        = lazy(() => import("./pages/SCATAnalysisPage"));\nconst AdvancedAnalyticsPage   = lazy(() => import("./pages/AdvancedAnalyticsPage"));`
  );
  
  code = code.replace(
    /<Route path="statistics"\s+element=\{<StatisticsPage \/>\} \/>/,
    `<Route path="statistics"        element={<StatisticsPage />} />\n          <Route path="advanced"          element={<AdvancedAnalyticsPage />} />`
  );
  
  fs.writeFileSync('src/App.tsx', code);
  console.log("App.tsx updated with AdvancedAnalyticsPage route.");
}
