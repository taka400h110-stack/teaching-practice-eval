const fs = require('fs');
const file = '/home/user/webapp/src/pages/UserRegistrationPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update validation
const oldValidation = `    if (!form.email?.trim()) errs.email = "メールアドレスは必須です";
    if (form.email && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(form.email))
      errs.email = "有効なメールアドレスを入力してください";
    if (users.some((u) => u.email === form.email && u.id !== editTarget?.id))
      errs.email = "このメールアドレスはすでに登録されています";`;

const newValidation = `    if (!form.email?.trim()) errs.email = "メールアドレスは必須です";
    if (form.email) {
      const emails = form.email.split(',').map(e => e.trim()).filter(Boolean);
      if (emails.length === 0) {
        errs.email = "有効なメールアドレスを入力してください";
      } else {
        const invalidEmails = emails.filter(e => !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(e));
        if (invalidEmails.length > 0) {
          errs.email = \`無効な形式が含まれています: \${invalidEmails.join(', ')}\`;
        } else {
          const existingEmails = users
            .filter(u => u.id !== editTarget?.id)
            .flatMap(u => u.email.split(',').map(e => e.trim()));
          const duplicate = emails.find(e => existingEmails.includes(e));
          if (duplicate) {
            errs.email = \`すでに登録済みのメールアドレスがあります: \${duplicate}\`;
          }
        }
      }
    }`;

content = content.replace(oldValidation, newValidation);

// Update copy password
const oldCopy = `  const handleCopyPassword = (email: string) => {
    const tmpPw = "Edu2024#" + email.split("@")[0].slice(0, 4).toUpperCase();`;

const newCopy = `  const handleCopyPassword = (email: string) => {
    const primaryEmail = email.split(",")[0].trim();
    const tmpPw = "Edu2024#" + primaryEmail.split("@")[0].slice(0, 4).toUpperCase();`;

content = content.replace(oldCopy, newCopy);

// Update TextField
const oldTextField = `<TextField
              label="メールアドレス"
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={!!errors.email}
              helperText={errors.email ?? "ログインIDになります"}
              fullWidth size="small" sx={{ mb: 1.5 }} required
            />`;

const newTextField = `<TextField
              label="メールアドレス（複数ある場合はカンマ区切り）"
              type="text"
              value={form.email ?? ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={!!errors.email}
              helperText={errors.email ?? "ログインIDになります。カンマ(,)で複数入力可能"}
              fullWidth size="small" sx={{ mb: 1.5 }} required
            />`;

content = content.replace(oldTextField, newTextField);

// Update TableCell
const oldTableCell = `<TableCell sx={{ fontSize: 11, color: "text.secondary" }}>{u.email}</TableCell>`;
const newTableCell = `<TableCell sx={{ fontSize: 11, color: "text.secondary" }}>
                            {u.email.split(",").map(e => <div key={e}>{e.trim()}</div>)}
                          </TableCell>`;

content = content.replace(oldTableCell, newTableCell);

fs.writeFileSync(file, content);
console.log("Updated UserRegistrationPage.tsx");
