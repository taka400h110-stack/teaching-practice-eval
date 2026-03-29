const fs = require('fs');
const path = require('path');

const appLayoutPath = path.join(__dirname, 'src', 'components', 'AppLayout.tsx');
let appLayoutCode = fs.readFileSync(appLayoutPath, 'utf8');

if (!appLayoutCode.includes('/scat-batch')) {
  appLayoutCode = appLayoutCode.replace(
    /\{ label: "SCAT質的分析", path: "\/scat", icon: <DescriptionIcon \/> \},/,
    `{ label: "SCAT質的分析", path: "/scat", icon: <DescriptionIcon /> },
          { label: "SCATバッチ分析", path: "/scat-batch", icon: <DescriptionIcon /> },
          { label: "SCATネットワーク分析", path: "/scat-network", icon: <DescriptionIcon /> },
          { label: "SCAT時系列分析", path: "/scat-timeline", icon: <DescriptionIcon /> },`
  );
  
  fs.writeFileSync(appLayoutPath, appLayoutCode);
  console.log('Added SCAT batch and network menus to AppLayout.tsx');
}
