const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'src', 'pages', 'SCATNetworkAnalysisPage.tsx');
let code = fs.readFileSync(pagePath, 'utf8');

code = code.replace(
  "import ForceGraph2D from 'react-force-graph-2d';",
  "import { Suspense, lazy } from 'react';\nconst ForceGraph2D = lazy(() => import('react-force-graph-2d'));"
);

code = code.replace(
  /<ForceGraph2D/,
  "<Suspense fallback={<CircularProgress />}><ForceGraph2D"
);

code = code.replace(
  /height=\{600\}\n\s*\/>/,
  "height={600}\n            /></Suspense>"
);

fs.writeFileSync(pagePath, code);
console.log('Applied lazy loading to SCATNetworkAnalysisPage');
