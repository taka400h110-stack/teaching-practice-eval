const fs = require('fs');
let code = fs.readFileSync('src/pages/UserRegistrationPage.tsx', 'utf8');

// Add field labels for the new student fields
code = code.replace(
  '  const fieldLabel = (field: string): string => ({\n    department:    "所属学科・部署",',
  '  const fieldLabel = (field: string): string => ({\n    student_number:"学籍番号",\n    grade:         "学年",\n    department:    "所属学科・部署",'
);

fs.writeFileSync('src/pages/UserRegistrationPage.tsx', code);
console.log("Updated UserRegistrationPage.tsx");
