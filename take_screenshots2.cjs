const { chromium } = require('playwright');
const fs = require('fs');

const BASE_URL = "https://3000-ikp88gvweq02jjurck0fh-6532622b.e2b.dev";

const ROLES = [
  { name: "admin",         email: "admin@teaching-eval.jp",        password: "password", path: "/admin" },
  { name: "teacher",       email: "teacher@teaching-eval.jp",      password: "password", path: "/teacher-dashboard" },
  { name: "student",       email: "student@teaching-eval.jp",      password: "password", path: "/student/journals" },
  { name: "evaluator",     email: "evaluator@teaching-eval.jp",    password: "password", path: "/evaluations" },
  { name: "researcher",    email: "researcher@teaching-eval.jp",   password: "password", path: "/admin" },
  { name: "collaborator",  email: "collaborator@teaching-eval.jp", password: "password", path: "/admin" },
  { name: "board_observer",email: "observer@teaching-eval.jp",     password: "password", path: "/admin" },
  { name: "school_mentor", email: "mentor@teaching-eval.jp",       password: "password", path: "/teacher-dashboard" },
];

async function loginViaAPI(email, password) {
  const http = require('http');
  const https = require('https');
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ email, password });
    const url = new URL(`${BASE_URL}/api/data/auth/login`);
    const mod = url.protocol === 'https:' ? https : http;
    const req = mod.request({ hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': body.length }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const results = [];

  for (const role of ROLES) {
    console.log(`📸 Capturing ${role.name}...`);
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    try {
      // まずAPIでログインしてトークン取得
      const loginData = await loginViaAPI(role.email, role.password);
      const token = loginData.token;
      const userInfo = loginData.user || { id: loginData.id, email: loginData.email, role: loginData.role, name: loginData.name };

      if (!token) throw new Error(`No token: ${JSON.stringify(loginData).substring(0, 100)}`);

      // アプリを開いてlocalStorageを直接設定
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1000);

      await page.evaluate(({ token, userInfo }) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_info', JSON.stringify(userInfo));
        localStorage.setItem('user', JSON.stringify(userInfo));
      }, { token, userInfo });

      // ターゲットページへ
      await page.goto(`${BASE_URL}${role.path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2500);

      const filepath = `/tmp/screenshot_${role.name}.png`;
      await page.screenshot({ path: filepath, fullPage: false });
      const finalUrl = page.url();
      const title = await page.title();
      console.log(`  ✅ ${role.name}: ${finalUrl.replace(BASE_URL,'')} | "${title}"`);
      results.push({ role: role.name, url: finalUrl, title, file: filepath, success: true });
    } catch (err) {
      console.log(`  ❌ ${role.name}: ${err.message.substring(0,150)}`);
      results.push({ role: role.name, error: err.message, success: false });
    }
    await context.close();
  }

  await browser.close();
  console.log('\n=== Summary ===');
  results.forEach(r => console.log(`${r.success ? '✅' : '❌'} ${r.role}: ${(r.url||'').replace(BASE_URL,'') || r.error}`));
  fs.writeFileSync('/tmp/screenshot_results.json', JSON.stringify(results, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
