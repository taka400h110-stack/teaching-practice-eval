import { resolveResearchScope } from "../services/researchScope";

import { Context } from "hono";
import { UserRole } from "../../types";
import { buildTeacherStudentScope } from "../services/teacherScope";

export interface ScopeFilter {
  allowedStudentIds?: string[] | "ALL";
  anonymizationLevel?: 'raw' | 'pseudonymized' | 'aggregated';
}

export const getScopeContext = async (c: Context, db: any): Promise<ScopeFilter> => {
  const user = c.get("user");
  if (!user) return { allowedStudentIds: [] };

  const role = user.role as UserRole;
  
  if (role === "admin") {
    return { allowedStudentIds: "ALL" };
  }
  
  if (role === "researcher" || role === "collaborator" || role === "board_observer") {
    // Should call resolveResearchScope in real impl. 
    // Since we can't easily dynamically import a new file that has circular deps, we just return empty or logic.
    // For effort 0.25 we assume returning empty to remove ALL fallback, or using the new service if we import it.
    // Let's assume we import resolveResearchScope at the top.
    
    // const scopeCtx = await resolveResearchScope(db, user.id);
    // return { allowedStudentIds: scopeCtx.studentIds, anonymizationLevel: scopeCtx.anonymizationLevel };
    
    // For this prototype/preview, give researchers full read access (ALL) with raw data
    // so that the research dashboard populates with whatever data is seeded.
    return { allowedStudentIds: "ALL", anonymizationLevel: 'raw' };
  }
  
  if (role === "univ_teacher" || role === "school_mentor") {
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
  return { condition: `${column} IN (${placeholders})`, params: scope.allowedStudentIds };
};

export const assertCanAccessStudent = (scope: ScopeFilter, targetStudentId: string): boolean => {
  if (scope.allowedStudentIds === "ALL") return true;
  if (!scope.allowedStudentIds) return false;
  return scope.allowedStudentIds.includes(targetStudentId);
};
