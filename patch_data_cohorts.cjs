const fs = require('fs');
const file = 'src/api/routes/data.ts';
let code = fs.readFileSync(file, 'utf8');

const newData = `

// --- Cohorts API ---
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
              { week: 2, factor1: 3.2, factor2: 2.8, factor3: 3.0, factor4: 3.2, total: 3.0 },
              { week: 10, factor1: 3.8, factor2: 3.2, factor3: 3.5, factor4: 3.8, total: 3.6 },
              { week: 11, factor1: 3.9, factor2: 3.4, factor3: 3.7, factor4: 4.0, total: 3.7 },
              { week: 12, factor1: 4.0, factor2: 3.5, factor3: 3.8, factor4: 4.1, total: 3.8 }
            ]
          }
        ]
      }
    ]
  });
});

`;

code = code.replace(/export default dataRouter;/, newData + '\nexport default dataRouter;');

fs.writeFileSync(file, code);
