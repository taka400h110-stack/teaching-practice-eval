const fs = require('fs');
const path = '/home/user/webapp/src/api/client.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/factor1_score/g, 'factor1');
content = content.replace(/factor2_score/g, 'factor2');
content = content.replace(/factor3_score/g, 'factor3');
content = content.replace(/factor4_score/g, 'factor4');
content = content.replace(/total_score/g, 'total');
content = content.replace(/rd_journal_level: e\.rd_journal_level,\n/g, '');
content = content.replace(/rd_journal_level: data\.rd_journal_level,\n/g, '');

content = content.replace(/id: 'growth-001',/g, '');

fs.writeFileSync(path, content);
