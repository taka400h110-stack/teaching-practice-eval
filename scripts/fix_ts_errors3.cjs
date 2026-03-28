const fs = require('fs');

let dataContent = fs.readFileSync('/home/user/webapp/src/api/routes/data.ts', 'utf-8');

// 1353: parseInt(c.req.param("itemNumber"))
dataContent = dataContent.replace(/parseInt\(c\.req\.param\("itemNumber"\)\)/g, 'parseInt(c.req.param("itemNumber") || "")');

// 1838: (order?.c || 0) + 1
dataContent = dataContent.replace(/\(order\?\.c \|\| 0\)/g, '((order as any)?.c || 0)');

// 1962: responses[row.item_id] = row.score;
dataContent = dataContent.replace(/responses\[row\.item_id\]/g, 'responses[row.item_id as number]');

// 2044: const isValid = await bcrypt.compare(password, user.password_hash);
dataContent = dataContent.replace(/await bcrypt\.compare\(password, user\.password_hash\)/g, 'await bcrypt.compare(password as string, (user as any).password_hash as string)');

fs.writeFileSync('/home/user/webapp/src/api/routes/data.ts', dataContent);
