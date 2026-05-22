const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/api/routes/openai.ts');
let content = fs.readFileSync(file, 'utf8');

const helper = `
function extractJournalText(contentStr: string): string {
  if (!contentStr) return "";
  try {
    const p = JSON.parse(contentStr);
    if (p.version === 2 && Array.isArray(p.records)) {
      let text = "";
      p.records.forEach((r: any) => {
        text += \`【\${r.time_label || '授業記録'}】\\n\${r.body}\\n\\n\`;
      });
      if (p.reflection) {
        text += \`【省察・振り返り】\\n\${p.reflection}\\n\`;
      }
      return text.trim();
    }
    return contentStr;
  } catch (e) {
    return contentStr;
  }
}
`;

if (!content.includes('function extractJournalText')) {
  content = content.replace('function buildCoTAPrompt', helper + '\nfunction buildCoTAPrompt');
}

// update /evaluate
content = content.replace('buildCoTAPrompt(body.journal_content', 'buildCoTAPrompt(extractJournalText(body.journal_content)');

// update /evaluate-session-rd
content = content.replace('buildCoTBPrompt(body.user_message, body.journal_content)', 'buildCoTBPrompt(body.user_message, extractJournalText(body.journal_content))');

// update /chat
content = content.replace('buildCoTCPrompt(body.conversation, body.journal_content', 'buildCoTCPrompt(body.conversation, extractJournalText(body.journal_content)');

// update /chat inside string interpolation
content = content.replace('${body.journal_content.slice(0, 600)}', '${extractJournalText(body.journal_content).slice(0, 600)}');

// update /check-evidence
content = content.replace('${journal_content}', '${extractJournalText(journal_content)}');

fs.writeFileSync(file, content);
console.log("Fixed openai.ts to extract full text for evaluation.");
