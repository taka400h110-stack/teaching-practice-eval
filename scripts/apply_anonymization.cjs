const fs = require('fs');

const path = '/home/user/webapp/src/api/routes/data.ts';
let code = fs.readFileSync(path, 'utf8');

// Add import
if (!code.includes('applyAnonymization')) {
  code = `import { applyAnonymization } from "../services/anonymization";\n` + code;
}

// Journals GET List: mask response if researcher
code = code.replace(
  /return c\.json\(\{ success: true, journals: results, count: results\.length \}\);/,
  `const role = (c.get("user") as any)?.role;
    const anonLevel = scope.anonymizationLevel;
    let finalResults = results;
    if (anonLevel && role !== "admin") {
      finalResults = applyAnonymization(results, { role, anonymizationLevel: anonLevel, resourceType: "journal" });
    }
    
    // Audit log
    const distinctStudentIds = Array.from(new Set(results.map((r: any) => r.student_id)));
    setAuditReadContext(c, {
      resourceType: 'journal',
      targetStudentIds: distinctStudentIds as string[],
      visibleRecordCount: finalResults.length,
      scopeBasis: scope.allowedStudentIds === "ALL" ? "all" : "assigned",
      reason: anonLevel ? \`anonymization:\${anonLevel}\` : undefined
    });

    return c.json({ success: true, journals: finalResults, count: finalResults.length });`
);

fs.writeFileSync(path, code);
