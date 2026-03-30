const fs = require('fs');
const code = fs.readFileSync('src/api/client.ts', 'utf8');
const lines = code.split('\n');
const start = lines.findIndex(l => l.includes('getEvaluation: async'));
const end = lines.findIndex((l, i) => i > start && l.includes('} catch {'));
console.log(lines.slice(start, end + 2).join('\n'));
