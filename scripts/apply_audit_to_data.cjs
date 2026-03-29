const fs = require('fs');

const path = '/home/user/webapp/src/api/routes/data.ts';
let code = fs.readFileSync(path, 'utf8');

// Add import
if (!code.includes('setAuditReadContext')) {
  code = code.replace(
    'import { getScopeContext, buildScopeFilter, assertCanAccessStudent } from "../middleware/scope";',
    'import { getScopeContext, buildScopeFilter, assertCanAccessStudent } from "../middleware/scope";\nimport { setAuditReadContext } from "../middleware/audit";'
  );
}

// Journals GET List
code = code.replace(/const \{ results \} = await query\.all\(\);\n\s*return c\.json\(\{ success: true, journals: results, count: results\.length \}\);/,
`const { results } = await query.all();
    
    // Audit log
    const distinctStudentIds = Array.from(new Set(results.map((r: any) => r.student_id)));
    setAuditReadContext(c, {
      resourceType: 'journal',
      targetStudentIds: distinctStudentIds as string[],
      visibleRecordCount: results.length,
      scopeBasis: scope.allowedStudentIds === "ALL" ? "all" : "assigned"
    });

    return c.json({ success: true, journals: results, count: results.length });`
);

// Journals GET By ID
code = code.replace(/if \(\!assertCanAccessStudent\(scope, journal\.student_id\)\) \{\n\s*return c\.json\(\{ success: false, error: "forbidden", message: "You do not have permission to access this journal\." \}, 403\);\n\s*\}/,
`if (!assertCanAccessStudent(scope, journal.student_id)) {
      setAuditReadContext(c, {
        resourceType: 'journal',
        resourceId: journal.id,
        targetStudentId: journal.student_id,
        reason: 'scope_violation'
      });
      return c.json({ success: false, error: "forbidden", message: "You do not have permission to access this journal." }, 403);
    }`
);

code = code.replace(/return c\.json\(\{ success: true, journal \}\);\n\s*\} catch \(err\)/,
`setAuditReadContext(c, {
      resourceType: 'journal',
      resourceId: journal.id,
      targetStudentId: journal.student_id,
      visibleRecordCount: 1,
      scopeBasis: scope.allowedStudentIds === "ALL" ? "all" : "assigned"
    });
    return c.json({ success: true, journal });
  } catch (err)`
);

// Students GET List
code = code.replace(/const \{ results \} = await db\.prepare\(\`SELECT \* FROM users WHERE role = 'student' AND \$\{condition\} ORDER BY created_at DESC\`\)\.bind\(\.\.\.params\)\.all\(\);\n\s*return c\.json\(\{ success: true, students: results \}\);/,
`const { results } = await db.prepare(\`SELECT * FROM users WHERE role = 'student' AND \${condition} ORDER BY created_at DESC\`).bind(...params).all();
    
    const distinctStudentIds = results.map((r: any) => r.id);
    setAuditReadContext(c, {
      resourceType: 'student',
      targetStudentIds: distinctStudentIds as string[],
      visibleRecordCount: results.length,
      scopeBasis: scope.allowedStudentIds === "ALL" ? "all" : "assigned"
    });

    return c.json({ success: true, students: results });`
);

// Evaluations GET List
code = code.replace(/const \{ results \} = await query\.all\(\);\n\s*return c\.json\(\{ success: true, evaluations: results \}\);/,
`const { results } = await query.all();
    
    const distinctStudentIds = Array.from(new Set(results.map((r: any) => r.student_id).filter(Boolean)));
    setAuditReadContext(c, {
      resourceType: 'evaluation',
      targetStudentIds: distinctStudentIds as string[],
      visibleRecordCount: results.length,
      scopeBasis: scope.allowedStudentIds === "ALL" ? "all" : "assigned"
    });

    return c.json({ success: true, evaluations: results });`
);

code = code.replace(/if \(\!assertCanAccessStudent\(scope, studentId\)\) \{\n\s*return c\.json\(\{ success: false, error: "forbidden" \}, 403\);\n\s*\}/,
`if (!assertCanAccessStudent(scope, studentId)) {
        setAuditReadContext(c, {
          resourceType: 'evaluation',
          targetStudentId: studentId,
          reason: 'scope_violation'
        });
        return c.json({ success: false, error: "forbidden" }, 403);
      }`
);

fs.writeFileSync(path, code);
console.log('Applied audit to data.ts');
