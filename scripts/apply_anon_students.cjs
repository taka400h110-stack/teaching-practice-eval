const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/api/routes/data.ts');
let content = fs.readFileSync(filePath, 'utf-8');

const studentsTargetStr = `    const distinctStudentIds = results.map((r: any) => r.id);
    setAuditReadContext(c, {
      resourceType: 'student',
      targetStudentIds: distinctStudentIds as string[],
      visibleRecordCount: results.length,
      scopeBasis: scope.allowedStudentIds === "ALL" ? "all" : "assigned"
    });

    return c.json({ success: true, students: results });`;

const studentsReplacement = `    const distinctStudentIds = results.map((r: any) => r.id);
    setAuditReadContext(c, {
      resourceType: 'student',
      targetStudentIds: distinctStudentIds as string[],
      visibleRecordCount: results.length,
      scopeBasis: scope.allowedStudentIds === "ALL" ? "all" : "assigned"
    });

    const role = (c.get("user") as any)?.role;
    const anonLevel = scope.anonymizationLevel;
    let finalResults = results;
    if (anonLevel && role !== "admin") {
      finalResults = applyAnonymization(results, { role, anonymizationLevel: anonLevel, resourceType: "student" });
    }

    return c.json({ success: true, students: finalResults });`;

if (content.includes(studentsTargetStr)) {
  content = content.replace(studentsTargetStr, studentsReplacement);
  console.log("Updated students successfully.");
  fs.writeFileSync(filePath, content);
} else {
  console.error("Could not find students target string in data.ts");
}
