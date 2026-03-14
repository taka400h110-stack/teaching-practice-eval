const fs = require('fs');
const file = '/home/user/webapp/src/api/client.ts';
let content = fs.readFileSync(file, 'utf8');

const oldLogin = `  login: async (email: string, _password: string) => {
    await delay();
    if (!email.includes("@")) throw new Error("Invalid credentials");

    const demo = DEMO_USERS[email];
    const user = demo
      ? { id: demo.id, email, name: demo.name, role: demo.roles[0] }
      : { id: "user-001", email, name: "山田 太郎", roles: ["student"] as UserRole };`;

const newLogin = `  login: async (email: string, _password: string) => {
    await delay();
    if (!email.includes("@")) throw new Error("Invalid credentials");

    // 複数のメールアドレス対応: DEMO_USERSのキーや値から探索
    let demo = DEMO_USERS[email];
    if (!demo) {
      const demoUser = Object.values(DEMO_USERS).find(d => 
        d.email && d.email.split(',').map(e => e.trim()).includes(email)
      );
      if (demoUser) {
        demo = demoUser;
      }
    }
    
    const user = demo
      ? { id: demo.id, email, name: demo.name, role: demo.roles[0] }
      : { id: "user-001", email, name: "山田 太郎", roles: ["student"] as UserRole };`;

content = content.replace(oldLogin, newLogin);
fs.writeFileSync(file, content);
console.log("Updated client.ts for multi-email login");
