const fs = require('fs');

const path = '/home/user/webapp/src/api/routes/data.ts';
let code = fs.readFileSync(path, 'utf8');

// The replacement created a duplicate distinctStudentIds.
// Let's replace the journal GET one specifically to use a block or var.

code = code.replace(/const distinctStudentIds = Array\.from\(new Set\(results\.map\(\(r: any\) => r\.student_id\)\)\);/g, 
  `const distinctStudentIds = Array.from(new Set(results.map((r: any) => r.student_id)));`
);
// Above regex does nothing if we don't rename one.
// Let's just wrap the audit part in a block { }

code = code.replace(
  `const distinctStudentIds = Array.from(new Set(results.map((r: any) => r.student_id)));
    setAuditReadContext(c, {
      resourceType: 'journal',
      targetStudentIds: distinctStudentIds as string[],
      visibleRecordCount: finalResults.length,
      scopeBasis: scope.allowedStudentIds === "ALL" ? "all" : "assigned",
      reason: anonLevel ? \`anonymization:\${anonLevel}\` : undefined
    });`,
  `{
      const distIds = Array.from(new Set(results.map((r: any) => r.student_id)));
      setAuditReadContext(c, {
        resourceType: 'journal',
        targetStudentIds: distIds as string[],
        visibleRecordCount: finalResults.length,
        scopeBasis: scope.allowedStudentIds === "ALL" ? "all" : "assigned",
        reason: anonLevel ? \`anonymization:\${anonLevel}\` : undefined
      });
    }`
);

fs.writeFileSync(path, code);
