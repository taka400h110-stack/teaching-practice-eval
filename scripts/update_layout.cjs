const fs = require('fs');

const path = '/home/user/webapp/src/components/AppLayout.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add exports to researcher group
const researcherAdd = `
      {
        group: "データ管理・出力",
        items: [
          { label: "データエクスポート", path: "/exports", icon: <DownloadIcon /> },
        ],
      }
`;
content = content.replace(
  '{ label: "高度分析 (Beta)", path: "/advanced-analytics", icon: <InsightsIcon /> },\n        ],\n      }',
  '{ label: "高度分析 (Beta)", path: "/advanced-analytics", icon: <InsightsIcon /> },\n        ],\n      },' + researcherAdd
);

// Add admin export management
const adminAdd = `
          { label: "エクスポート承認管理", path: "/admin/exports", icon: <VerifiedUserIcon /> },
          { label: "データエクスポート", path: "/exports", icon: <DownloadIcon /> },
`;
content = content.replace(
  '{ label: "ユーザー登録", path: "/register", icon: <PersonAddIcon /> },',
  '{ label: "ユーザー登録", path: "/register", icon: <PersonAddIcon /> },\n' + adminAdd
);

fs.writeFileSync(path, content);
