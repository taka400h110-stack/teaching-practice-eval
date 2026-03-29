const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/api/routes/data.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// The original string was `])`. I'll just undo ` as unknown as UserRole[]))` globally unless it's preceded by a string like `"admin"` or `"student"`.
content = content.replace(/ as unknown as UserRole\[\]\)\)/g, ')');
content = content.replace(/requireRoles\(\(\(\[/g, 'requireRoles(([');

// Wait, actually `requireRoles(([` is there now, with `]))` at the end... let's just make it `requireRoles([` and `] as UserRole[])`
content = content.replace(/requireRoles\(\(\(\[/g, 'requireRoles([');
content = content.replace(/requireRoles\(\(\[/g, 'requireRoles([');
// Let's just fix the `requireRoles` lines directly
content = content.replace(/requireRoles\(\[\"([^\"]+)\"\]\)/g, 'requireRoles(["$1"] as UserRole[])');
content = content.replace(/requireRoles\(\[\"([^\"]+)\",\s*\"([^\"]+)\"\]\)/g, 'requireRoles(["$1", "$2"] as UserRole[])');
// Well, it might be simpler to just use a script to replace the bad strings:
content = content.replace(/results\[0\]\)/g, 'results[0])'); // It's already replaced above

fs.writeFileSync(filePath, content);
