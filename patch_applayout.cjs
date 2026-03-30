const fs = require('fs');

let content = fs.readFileSync('/home/user/webapp/src/components/AppLayout.tsx', 'utf8');

const newLinks = `{ label: "SCAT全体構造", path: "/scat/class", icon: <DescriptionIcon /> },
          { label: "SCATネットワーク分析", path: "/scat-network", icon: <DescriptionIcon /> },`;

content = content.replace(/\{ label: "SCATネットワーク分析", path: "\/scat-network", icon: <DescriptionIcon \/> \},/, newLinks);

fs.writeFileSync('/home/user/webapp/src/components/AppLayout.tsx', content);
console.log("Patched AppLayout.tsx");
