const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/api/routes/data.ts');
let content = fs.readFileSync(filePath, 'utf-8');

const evalsTargetStr = `    const distinctStudentIds = Array.from(new Set(results.map((r: any) => r.student_id).filter(Boolean)));
    setAuditReadContext(c, {
      resourceType: 'evaluation',
      targetStudentIds: distinctStudentIds as string[],
      visibleRecordCount: results.length,
      scopeBasis: scope.allowedStudentIds === "ALL" ? "all" : "assigned"
    });

    return c.json({ success: true, evaluations: results });`;

const evalsReplacement = `    const distinctStudentIds = Array.from(new Set(results.map((r: any) => r.student_id).filter(Boolean)));
    setAuditReadContext(c, {
      resourceType: 'evaluation',
      targetStudentIds: distinctStudentIds as string[],
      visibleRecordCount: results.length,
      scopeBasis: scope.allowedStudentIds === "ALL" ? "all" : "assigned"
    });

    const role = (c.get("user") as any)?.role;
    const anonLevel = scope.anonymizationLevel;
    let finalResults = results;
    if (anonLevel && role !== "admin") {
      finalResults = applyAnonymization(results, { role, anonymizationLevel: anonLevel, resourceType: "evaluation" });
    }

    return c.json({ success: true, evaluations: finalResults });`;

if (content.includes(evalsTargetStr)) {
  content = content.replace(evalsTargetStr, evalsReplacement);
  console.log("Updated evaluations successfully.");
} else {
  console.error("Could not find evaluations target string in data.ts");
}

const studentsTargetStr = `    const { results } = await query.all();

    setAuditReadContext(c, {
      resourceType: 'student',
      targetStudentIds: Array.from(new Set(results.map((r: any) => r.id))) as string[],
      visibleRecordCount: results.length,
      scopeBasis: scope.allowedStudentIds === "ALL" ? "all" : "assigned"
    });

    return c.json({ success: true, students: results });`;

const studentsReplacement = `    const { results } = await query.all();

    const role = (c.get("user") as any)?.role;
    const anonLevel = scope.anonymizationLevel;
    let finalResults = results;
    if (anonLevel && role !== "admin") {
      finalResults = applyAnonymization(results, { role, anonymizationLevel: anonLevel, resourceType: "student" });
    }

    setAuditReadContext(c, {
      resourceType: 'student',
      targetStudentIds: Array.from(new Set(finalResults.map((r: any) => r.id || r.student_id).filter(Boolean))) as string[],
      visibleRecordCount: finalResults.length,
      scopeBasis: scope.allowedStudentIds === "ALL" ? "all" : "assigned"
    });

    return c.json({ success: true, students: finalResults });`;

if (content.includes(studentsTargetStr)) {
  content = content.replace(studentsTargetStr, studentsReplacement);
  console.log("Updated students successfully.");
} else {
  console.error("Could not find students target string in data.ts");
}

fs.writeFileSync(filePath, content);
