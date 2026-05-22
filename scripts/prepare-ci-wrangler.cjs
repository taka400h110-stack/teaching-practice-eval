#!/usr/bin/env node
/**
 * CI 環境用に wrangler.jsonc を一時的に書き換えるスクリプト。
 *
 * wrangler v4 の pages dev は AI バインディングを local エミュレーションできず、
 * Cloudflare API token が無いと起動できない。CI ではトークンが無いので、
 * AI バインディング (および将来的に remote 限定の binding) を一時的に取り除く。
 *
 * 使い方:
 *   node scripts/prepare-ci-wrangler.cjs --strip   # AI を除外した形に書き換え (バックアップを wrangler.jsonc.bak に保存)
 *   node scripts/prepare-ci-wrangler.cjs --restore # 元に戻す
 *
 * Playwright の webServer.command から呼ぶ想定。
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const target = path.join(root, "wrangler.jsonc");
const backup = path.join(root, "wrangler.jsonc.bak");

const mode = process.argv[2];

if (mode === "--strip") {
  if (!fs.existsSync(target)) {
    console.error("wrangler.jsonc not found");
    process.exit(1);
  }
  // Idempotent: 既に書き換え済みなら何もしない
  const src = fs.readFileSync(target, "utf8");
  if (src.includes('"_ci_stripped_ai": true')) {
    console.log("[ci-wrangler] already stripped, skip");
    process.exit(0);
  }
  if (!fs.existsSync(backup)) {
    fs.copyFileSync(target, backup);
  }
  // "ai": { "binding": "AI" }, のブロックをコメントアウト
  let out = src.replace(
    /"ai":\s*\{[^}]*\},?/m,
    '/* CI: AI binding removed by scripts/prepare-ci-wrangler.cjs */',
  );
  // CI マーカーを vars に追加 (識別用)
  out = out.replace(
    /"vars":\s*\{/m,
    '"vars": {\n    "_ci_stripped_ai": true,',
  );
  fs.writeFileSync(target, out);
  console.log("[ci-wrangler] AI binding stripped from wrangler.jsonc (backup: wrangler.jsonc.bak)");
} else if (mode === "--restore") {
  if (!fs.existsSync(backup)) {
    console.log("[ci-wrangler] no backup found, nothing to restore");
    process.exit(0);
  }
  fs.copyFileSync(backup, target);
  fs.unlinkSync(backup);
  console.log("[ci-wrangler] wrangler.jsonc restored from backup");
} else {
  console.error("Usage: node prepare-ci-wrangler.cjs --strip | --restore");
  process.exit(2);
}
