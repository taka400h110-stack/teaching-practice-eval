const fs = require('fs');

const path = '/home/user/webapp/src/api/middleware/scope.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /if \(role === "researcher" \|\| role === "collaborator" \|\| role === "board_observer"\) {\n\s*return \{ allowedStudentIds: "ALL" \};\n\s*}/,
  `if (role === "researcher" || role === "collaborator" || role === "board_observer") {
    // Should call resolveResearchScope in real impl. 
    // Since we can't easily dynamically import a new file that has circular deps, we just return empty or logic.
    // For effort 0.25 we assume returning empty to remove ALL fallback, or using the new service if we import it.
    // Let's assume we import resolveResearchScope at the top.
    const { resolveResearchScope } = require("../services/researchScope");
    const scopeCtx = await resolveResearchScope(db, user.id);
    return { allowedStudentIds: scopeCtx.studentIds, anonymizationLevel: scopeCtx.anonymizationLevel };
  }`
);

// We need to add the import but require works if compiled to cjs, but this is TS. We must use dynamic import or top level import.
code = `import { resolveResearchScope } from "../services/researchScope";\n` + code;
code = code.replace(`const { resolveResearchScope } = require("../services/researchScope");`, ``);

// Update ScopeFilter interface
code = code.replace(
  /allowedStudentIds\?: string\[\] \| "ALL";/,
  `allowedStudentIds?: string[] | "ALL";\n  anonymizationLevel?: 'raw' | 'pseudonymized' | 'aggregated';`
);

fs.writeFileSync(path, code);
