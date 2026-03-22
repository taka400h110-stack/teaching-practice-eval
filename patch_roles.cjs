const fs = require('fs');

const replaceInFile = (file) => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/c\.req\.header\("X-User-Role"\)/g, 'c.get("user")?.role');
  fs.writeFileSync(file, content);
  console.log('Updated ' + file);
};

replaceInFile('/home/user/webapp/src/api/routes/data.ts');
replaceInFile('/home/user/webapp/src/api/routes/stats.ts');

