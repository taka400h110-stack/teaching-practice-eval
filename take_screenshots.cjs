const { chromium } = require('playwright');
const fs = require('fs');

const BASE_URL = "https://3000-ikp88gvweq02jjurck0fh-6532622b.e2b.dev";

const ROLES = [
  { name: "admin",         email: "admin@teaching-eval.jp",        password: "password", path: "/admin" },
  { name: "teacher",       email: "teacher@teaching-eval.jp",      password: "password", path: "/teacher" },
  { name: "student",       email: "student@teaching-eval.jp",      password: "password", path: "/student/journals" },
  { name: "evaluator",     email: "evaluator@teaching-eval.jp",    password: "password", path: "/evaluations" },
  { name: "researcher",    email: "researcher@teaching-eval.jp",   password: "password", path: "/admin" },
  { name: "collaborator",  email: "collaborator@teaching-eval.jp", password: "password", path: "/admin" },
  { name: "board_observer",email: "observer@teaching-eval.jp",     password: "password", path: "/admin" },
  { name: "school_mentor", email: "mentor@teaching-eval.jp",       password: "password", path: "/teacher" },
];

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const results = [];
  
  for (const role of ROLES) {
    console.log(`📸 Capturing ${role.name}...`);
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    
    try {
      // ログインページへ
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2000);
      
      // フォーム入力
      const emailInput = await page.$('input[type="email"]') || await page.$('input[name="email"]');
      const passInput = await page.$('input[type="password"]');
      if (emailInput) await emailInput.fill(role.email);
      if (passInput) await passInput.fill(role.password);
      
      const loginBtn = await page.$('button[type="submit"]') || await page.$('button');
      if (loginBtn) await loginBtn.click();
      await page.waitForTimeout(2500);
      
      // ターゲットページへ
      await page.goto(`${BASE_URL}${role.path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000);
      
      const filepath = `/tmp/screenshot_${role.name}.png`;
      await page.screenshot({ path: filepath, fullPage: false });
      const finalUrl = page.url();
      const title = await page.title();
      console.log(`  ✅ ${role.name}: ${finalUrl.replace(BASE_URL,'')} | "${title}"`);
      results.push({ role: role.name, url: finalUrl, title, file: filepath, success: true });
    } catch (err) {
      console.log(`  ❌ ${role.name}: ${err.message.substring(0, 100)}`);
      results.push({ role: role.name, error: err.message, success: false });
    }
    await context.close();
  }
  
  await browser.close();
  
  console.log('\n=== Summary ===');
  results.forEach(r => console.log(`${r.success ? '✅' : '❌'} ${r.role}: ${r.url || r.error}`));
  fs.writeFileSync('/tmp/screenshot_results.json', JSON.stringify(results, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
