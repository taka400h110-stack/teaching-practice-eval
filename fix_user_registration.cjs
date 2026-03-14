const fs = require('fs');
let code = fs.readFileSync('src/pages/UserRegistrationPage.tsx', 'utf8');

// The student role is missing from ROLE_CONFIGS. We need to add it.
const studentRole = `  {
    role: "student",
    label: "実習生",
    color: "#1976d2",
    icon: <PersonAddIcon />,
    description: "実習日誌の作成・自己評価の入力などを行う学生アカウント",
    fields: ["student_number", "grade", "school_type"],
  },
  {
    role: "univ_teacher",`;

code = code.replace(
  '  {\n    role: "univ_teacher",',
  studentRole
);

fs.writeFileSync('src/pages/UserRegistrationPage.tsx', code);
console.log("Updated UserRegistrationPage.tsx");
