const fs = require('fs');
const content = fs.readFileSync('/home/user/webapp/src/api/routes/data.ts', 'utf8');

const match = content.match(/const statements = \[([\s\S]*?)\];/);
if (match) {
  let statementsStr = match[1];
  let sqls = [];
  let regex = /`([^`]+)`/g;
  let m;
  while ((m = regex.exec(statementsStr)) !== null) {
    sqls.push(m[1] + ';');
  }
  fs.writeFileSync('/home/user/webapp/init_schema.sql', sqls.join('\n'));
  console.log("Schema extracted to init_schema.sql");
} else {
  console.log("Could not find statements");
}
