import { D1Database } from "@cloudflare/workers-types";

export type ResearchScopeContext = {
  researcherUserId: string;
  courseIds: string[];
  cohortIds: string[];
  studentIds: string[];
  datasetTypes: string[];
  anonymizationLevel: 'raw' | 'pseudonymized' | 'aggregated';
};

export async function getResearchAssignments(db: D1Database, researcherUserId: string) {
  const query = `
    SELECT id, assignment_level, course_id, cohort_id, student_id, dataset_type, anonymization_level
    FROM research_scope_assignments
    WHERE researcher_user_id = ? AND is_active = 1
  `;
  const result = await db.prepare(query).bind(researcherUserId).all();
  return result.results || [];
}

export async function resolveResearchScope(db: D1Database, researcherUserId: string): Promise<ResearchScopeContext> {
  const assignments = await getResearchAssignments(db, researcherUserId);
  
  const courseIds = new Set<string>();
  const cohortIds = new Set<string>();
  const studentIds = new Set<string>();
  const datasetTypes = new Set<string>();
  
  let currentAnonLevel = 'aggregated'; // most restrictive by default
  const levels = { 'raw': 3, 'pseudonymized': 2, 'aggregated': 1 };
  
  for (const a of assignments) {
    if (a.assignment_level === 'course' && a.course_id) {
      courseIds.add(a.course_id as string);
    } else if (a.assignment_level === 'cohort' && a.cohort_id) {
      cohortIds.add(a.cohort_id as string);
    } else if (a.assignment_level === 'student' && a.student_id) {
      studentIds.add(a.student_id as string);
    } else if (a.assignment_level === 'dataset' && a.dataset_type) {
      datasetTypes.add(a.dataset_type as string);
    }
    
    // upgrade anon level if assignment allows more permissive
    if (levels[a.anonymization_level as keyof typeof levels] > levels[currentAnonLevel as keyof typeof levels]) {
      currentAnonLevel = a.anonymization_level as string;
    }
  }

  // Again, assuming users table has no direct cohort mappings yet in this simplified effort,
  // we just return the resolved scope context to be used.

  return {
    researcherUserId,
    courseIds: Array.from(courseIds),
    cohortIds: Array.from(cohortIds),
    studentIds: Array.from(studentIds),
    datasetTypes: Array.from(datasetTypes),
    anonymizationLevel: currentAnonLevel as 'raw' | 'pseudonymized' | 'aggregated'
  };
}
