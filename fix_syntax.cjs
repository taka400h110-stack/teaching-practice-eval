const fs = require('fs');

let code = fs.readFileSync('src/pages/UserRegistrationPage.tsx', 'utf-8');

code = code.replace(
  /const cnt = users\.filter\(\(u\) => \(u\.roles\?\.\[0\] \|\| "student"\)s && \(u\.roles\?\.\[0\] \|\| "student"\)s\.includes\(r\.role\)\)\.length;/g,
  `const cnt = users.filter((u) => u.roles && u.roles.includes(r.role)).length;`
);

code = code.replace(
  /const cfgs = \(\(u\.roles\?\.\[0\] \|\| "student"\)s \|\| \[\]\)\.map/g,
  `const cfgs = (u.roles || []).map`
);

code = code.replace(
  /<Chip\n\s*label=\{c\?\.label \?\? \(u\.roles\?\.\[0\] \|\| "student"\)\}\n\s*size="small"\n\s*sx=\{\{ bgcolor: c\?\.color \?\? "grey\.400", color: "white", fontSize: 10, height: 18 \}\}\n\s*\/>/g,
  `{cfgs.filter(Boolean).map(c => (\n                              <Chip\n                                key={c?.role}\n                                label={c?.label ?? "不明"}\n                                size="small"\n                                sx={{ bgcolor: c?.color ?? "grey.400", color: "white", fontSize: 10, height: 18, mr: 0.5, mb: 0.5 }}\n                              />\n                            ))}`
);

fs.writeFileSync('src/pages/UserRegistrationPage.tsx', code);
