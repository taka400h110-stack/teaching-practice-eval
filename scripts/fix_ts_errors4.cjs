const fs = require('fs');

let dataContent = fs.readFileSync('/home/user/webapp/src/api/routes/data.ts', 'utf-8');

dataContent = dataContent.replace(/responses\[row\.item_id as number\] = row\.score;/g, 'responses[row.item_id as number] = row.score as number;');

fs.writeFileSync('/home/user/webapp/src/api/routes/data.ts', dataContent);
