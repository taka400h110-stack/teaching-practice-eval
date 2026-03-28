const fs = require('fs');
let content = fs.readFileSync('/home/user/webapp/tests/exports.spec.ts', 'utf8');
content = content.replace("});\n\n  test('Researcher can download data with token'", "  test('Researcher can download data with token'");
content = content.replace("  });\n", "  });\n});\n");
fs.writeFileSync('/home/user/webapp/tests/exports.spec.ts', content);
