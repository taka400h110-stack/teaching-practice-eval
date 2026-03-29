const fs = require('fs');

const path = '/home/user/webapp/src/index.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace("fetch: app.fetch,", "fetch: (request: Request, env: any, ctx: any) => app.fetch(request, env, ctx),");

fs.writeFileSync(path, content);
