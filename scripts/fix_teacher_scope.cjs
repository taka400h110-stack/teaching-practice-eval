const fs = require('fs');

const tsCode = `import { D1Database } from "@cloudflare/workers-types";

export type TeacherScopeContext = {
  teacherUserId: string;
  courseIds: string[];
  cohortIds: string[];
  studentIds: string[];
};

export async function getTeacherAssignments(db: D1Database, teacherUserId: string) {
  const query = \`
    SELECT id, assignment_level, course_id, cohort_id, student_id
    FROM teacher_assignments
    WHERE teacher_user_id = ? AND is_active = 1
  \`;
  const result = await db.prepare(query).bind(teacherUserId).all();
  return result.results || [];
}

export async function resolveTeacherScope(db: D1Database, teacherUserId: string): Promise<TeacherScopeContext> {
  const assignments = await getTeacherAssignments(db, teacherUserId);
  
  const courseIds = new Set<string>();
  const cohortIds = new Set<string>();
  const studentIds = new Set<string>();
  
  for (const a of assignments) {
    if (a.assignment_level === 'course' && a.course_id) {
      courseIds.add(a.course_id as string);
    } else if (a.assignment_level === 'cohort' && a.cohort_id) {
      cohortIds.add(a.cohort_id as string);
    } else if (a.assignment_level === 'student' && a.student_id) {
      studentIds.add(a.student_id as string);
    }
  }

  return {
    teacherUserId,
    courseIds: Array.from(courseIds),
    cohortIds: Array.from(cohortIds),
    studentIds: Array.from(studentIds)
  };
}

export async function buildTeacherStudentScope(db: D1Database, teacherUserId: string): Promise<string[]> {
  const scope = await resolveTeacherScope(db, teacherUserId);
  
  let allStudentIds = new Set(scope.studentIds);
  
  // Resolve cohort memberships
  if (scope.cohortIds.length > 0) {
    const placeholders = scope.cohortIds.map(() => '?').join(',');
    const { results } = await db.prepare(\`SELECT student_id FROM cohort_memberships WHERE cohort_id IN (\${placeholders})\`).bind(...scope.cohortIds).all();
    if (results) {
      for (const row of results) {
        allStudentIds.add(row.student_id as string);
      }
    }
  }

  // Resolve course enrollments
  if (scope.courseIds.length > 0) {
    const placeholders = scope.courseIds.map(() => '?').join(',');
    const { results } = await db.prepare(\`SELECT student_id FROM course_enrollments WHERE course_id IN (\${placeholders})\`).bind(...scope.courseIds).all();
    if (results) {
      for (const row of results) {
        allStudentIds.add(row.student_id as string);
      }
    }
  }
  
  return Array.from(allStudentIds);
}
`;

fs.writeFileSync('/home/user/webapp/src/api/services/teacherScope.ts', tsCode);
