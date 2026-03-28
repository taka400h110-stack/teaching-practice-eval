const fs = require('fs');
const path = '/home/user/webapp/src/pages/SCATAnalysisPage.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  '  }).join(","));',
  '    }).join(",");\n  });'
);

fs.writeFileSync(path, code);
