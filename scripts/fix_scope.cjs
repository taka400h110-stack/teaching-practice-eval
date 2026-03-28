const fs = require('fs');

let code = fs.readFileSync('/home/user/webapp/src/api/middleware/scope.ts', 'utf8');

code = `
import { Context } from "hono";
import { UserRole } from "../../types";
import { buildTeacherStudentScope } from "../services/teacherScope";

export interface ScopeFilter {
  allowedStudentIds?: string[] | "ALL";
}

export const getScopeContext = async (c: Context, db: any): Promise<ScopeFilter> => {
  const user = c.get("user");
  if (!user) return { allowedStudentIds: [] };

  const role = user.role as UserRole;
  
  if (role === "admin") {
    return { allowedStudentIds: "ALL" };
  }
  
  if (role === "researcher" || role === "collaborator" || role === "board_observer") {
    return { allowedStudentIds: "ALL" };
  }
  
  if (role === "univ_teacher" || role === "school_mentor" || role === "teacher") {
    // strict teacher assignments: NO ALL FALLBACK
    const studentIds = await buildTeacherStudentScope(db, user.id);
    return { allowedStudentIds: studentIds };
  }
  
  if (role === "evaluator") {
    return { allowedStudentIds: "ALL" }; // Or specify according to needs
  }
  
  if (role === "student") {
    return { allowedStudentIds: [user.id] };
  }
  
  return { allowedStudentIds: [] };
};

export const buildScopeFilter = (scope: ScopeFilter, column: string = "student_id") => {
  if (scope.allowedStudentIds === "ALL") {
    return { condition: "1=1", params: [] };
  }
  
  if (!scope.allowedStudentIds || scope.allowedStudentIds.length === 0) {
    return { condition: "1=0", params: [] }; // Nothing allowed
  }
  
  const placeholders = scope.allowedStudentIds.map(() => "?").join(",");
  return { condition: \`\${column} IN (\${placeholders})\`, params: scope.allowedStudentIds };
};

export const assertCanAccessStudent = (scope: ScopeFilter, targetStudentId: string): boolean => {
  if (scope.allowedStudentIds === "ALL") return true;
  if (!scope.allowedStudentIds) return false;
  return scope.allowedStudentIds.includes(targetStudentId);
};
`;

fs.writeFileSync('/home/user/webapp/src/api/middleware/scope.ts', code);
console.log('Fixed scope.ts');
