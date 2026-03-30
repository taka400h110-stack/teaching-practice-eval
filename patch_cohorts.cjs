const fs = require('fs');
const file = 'src/api/routes/data.ts';
let code = fs.readFileSync(file, 'utf8');

const oldMock = `// --- Cohorts API ---
dataRouter.get("/cohorts", requireRoles(["researcher", "admin", "collaborator", "board_observer", "teacher"]), async (c) => {
  // Mock cohort endpoint to satisfy frontend stats page requirements
  return c.json({
    success: true,
    cohorts: [
      {
        id: "cohort-2023-fall",
        name: "2023年度秋期実習",
        student_count: 1,
        average_total_score: 3.8,
        students: [
          {
            id: "user-001",
            name: "山田 太郎",
            grade: "学部3年",
            school_type: "小学校",
            internship_type: "観察参加",
            final_factor_scores: { factor1: 4.0, factor2: 3.5, factor3: 3.8, factor4: 4.1 },
            final_total_score: 3.8,
            weekly_scores: [
              { week: 1, factor1: 3.0, factor2: 2.5, factor3: 2.8, factor4: 3.0, total: 2.8 },
              { week: 2, factor1: 3.5, factor2: 3.0, factor3: 3.2, factor4: 3.5, total: 3.3 },
              { week: 3, factor1: 4.0, factor2: 3.5, factor3: 3.8, factor4: 4.1, total: 3.8 }
            ]
          }
        ]
      }
    ]
  });
});`;

const newMock = `// --- Cohorts API ---
dataRouter.get("/cohorts", requireRoles(["researcher", "admin", "collaborator", "board_observer", "teacher"]), async (c) => {
  return c.json({
    success: true,
    cohorts: [
      {
        id: "user-001",
        student_number: "20230001",
        name: "山田 太郎",
        gender: "男",
        grade: "学部3年",
        school_type: "小学校",
        internship_type: "集中実習",
        weeks: 3,
        school_name: "第一小学校",
        supervisor: "佐藤 先生",
        big_five: {
          extraversion: 4.2,
          agreeableness: 3.8,
          conscientiousness: 4.5,
          neuroticism: 2.1,
          openness: 3.9,
          measured_at: new Date().toISOString()
        },
        final_factor1: 4.0,
        final_factor2: 3.5,
        final_factor3: 3.8,
        final_factor4: 4.1,
        final_total: 3.85,
        growth_delta: 0.8,
        self_eval_gap: -0.2,
        lps: 4.1,
        weekly_scores: [
          { week: 1, factor1: 3.0, factor2: 2.5, factor3: 2.8, factor4: 3.0, total: 2.82 },
          { week: 2, factor1: 3.5, factor2: 3.0, factor3: 3.2, factor4: 3.5, total: 3.30 },
          { week: 10, factor1: 3.8, factor2: 3.2, factor3: 3.6, factor4: 3.8, total: 3.60 },
          { week: 11, factor1: 3.9, factor2: 3.4, factor3: 3.7, factor4: 4.0, total: 3.75 },
          { week: 12, factor1: 4.0, factor2: 3.5, factor3: 3.8, factor4: 4.1, total: 3.85 }
        ]
      }
    ]
  });
});`;

if (code.includes(oldMock)) {
    code = code.replace(oldMock, newMock);
    fs.writeFileSync(file, code, 'utf8');
    console.log("Successfully patched API mock.");
} else {
    // try fallback patch if oldMock string isn't exactly matching
    const startIndex = code.indexOf('// --- Cohorts API ---');
    const endIndex = code.indexOf('export default dataRouter;');
    if (startIndex !== -1 && endIndex !== -1) {
        const before = code.substring(0, startIndex);
        const after = code.substring(endIndex);
        fs.writeFileSync(file, before + newMock + "\\n\\n" + after, 'utf8');
        console.log("Successfully patched API mock using fallback.");
    } else {
        console.error("Failed to patch API mock: could not find insertion point.");
        process.exit(1);
    }
}
