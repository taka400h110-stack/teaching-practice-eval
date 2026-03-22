const fs = require('fs');
let page = fs.readFileSync('/home/user/webapp/src/pages/AdvancedAnalyticsPage.tsx', 'utf8');

// remove mock arrays
page = page.replace(/const topicData = \[[\s\S]*?\];/g, 'const topicData: any[] = [];');
page = page.replace(/const sentimentTrend = \[[\s\S]*?\];/g, 'const sentimentTrend: any[] = [];');
page = page.replace(/const regressionCoefs = \[[\s\S]*?\];/g, 'const regressionCoefs: any[] = [];');

// Replace Multivariate Analysis tab content
const newTab0 = `      {/* ━━ 多変量解析 ━━ */}
      <TabPanel value={tab} index={0}>
        <Alert severity="info" sx={{ mb: 2 }}>
          多変量解析（重回帰分析・分散分析）は外部分析前提（R / Python等）の機能です。
          CSVエクスポート機能からデータを取得し、お手元の統計ソフトで分析を行ってください。
        </Alert>
        {/* Placeholder for future export buttons */}
      </TabPanel>`;
page = page.replace(/\{\/\* ━━ 多変量解析 ━━ \*\/\}[\s\S]*?<\/TabPanel>/, newTab0);

// Replace NLP tab content
const newTab1 = `      {/* ━━ NLP ━━ */}
      <TabPanel value={tab} index={1}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          自然言語処理（NLP）機能は現在Beta版・準備中です。
          外部のPython解析サーバーとの連携が必要です。
        </Alert>
      </TabPanel>`;
page = page.replace(/\{\/\* ━━ NLP ━━ \*\/\}[\s\S]*?<\/TabPanel>/, newTab1);

// Replace SEM tab content
const newTab2 = `      {/* ━━ SEM ━━ */}
      <TabPanel value={tab} index={2}>
        <Alert severity="info" sx={{ mb: 2 }}>
          構造方程式モデリング（SEM）は厳密なモデル適合度計算が必要なため、外部の専門ソフトウェア（Mplus / lavaan 等）での分析を推奨します。
        </Alert>
      </TabPanel>`;
page = page.replace(/\{\/\* ━━ SEM ━━ \*\/\}[\s\S]*?<\/TabPanel>/, newTab2);

// Replace Missing value tab content
const newTab3 = `      {/* ━━ 欠損値分析 ━━ */}
      <TabPanel value={tab} index={3}>
        <Alert severity="info" sx={{ mb: 2 }}>
          詳細な欠損値分析（MCARテスト、多重代入法等）は将来の実装予定です。
          現在はListwise除去が基本適用されています。
        </Alert>
      </TabPanel>`;
page = page.replace(/\{\/\* ━━ 欠損値分析 ━━ \*\/\}[\s\S]*?<\/TabPanel>/, newTab3);

// In BigFive tab, handle missing big_five data safely
page = page.replace(
  'x: (p.big_five as any)[bfTrait] || 0,',
  'x: p.big_five ? (p.big_five as any)[bfTrait] || 0 : 0,'
);

page = page.replace(
  'grp.length ? grp.reduce((s, p) => s + p.big_five[key], 0) / grp.length : 0',
  'grp.length ? grp.reduce((s, p) => s + (p.big_five ? p.big_five[key] || 0 : 0), 0) / grp.length : 0'
);

fs.writeFileSync('/home/user/webapp/src/pages/AdvancedAnalyticsPage.tsx', page);
console.log('Updated AdvancedAnalyticsPage');
