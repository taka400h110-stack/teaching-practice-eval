const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/pages/**/*.{ts,tsx}');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');
  let original = content;

  // j.title.slice -> (j.title || "").slice
  content = content.replace(/j\.title\.slice/g, '(j.title || "").slice');
  
  // lastMsg.content.slice -> (lastMsg.content || "").slice
  content = content.replace(/lastMsg\.content\.slice/g, '(lastMsg.content || "").slice');

  // r.text.slice -> (r.text || "").slice
  content = content.replace(/r\.text\.slice/g, '(r.text || "").slice');
  
  // s.slice -> s?.slice
  // label.slice -> label?.slice
  content = content.replace(/(\w+)\.slice\(/g, (match, p1) => {
    // 既に安全な呼び出し、あるいは文字列リテラルの場合は除外
    if (['cohorts', 'array', 'title', 'content', 'text', 'scores', 'histBins', 'filtered', 'items'].includes(p1)) {
        return match;
    }
    // string 以外で null になり得るものを防ぐために大雑把に `?.` にするわけにいかない箇所もある
    // tsエラーを防ぐためにも、手動で安全確認済みの箇所にする
    return match;
  });

  // cohorts.slice -> (cohorts ?? []).slice
  content = content.replace(/cohorts\.slice/g, '(cohorts ?? []).slice');
  content = content.replace(/\(cohorts \?\? \[\]\)\.slice/g, '(cohorts ?? []).slice'); // 중重処理防止用ではなく、上書きしちゃうので
  // 少し賢く
  content = content.replace(/cohorts\.slice/g, '(cohorts ?? []).slice');
  
  // evalJournals = evalJournals.slice -> evalJournals = (evalJournals ?? []).slice
  content = content.replace(/evalJournals\.slice/g, '(evalJournals ?? []).slice');

  // scores.slice -> (scores ?? []).slice
  content = content.replace(/scores\.slice/g, '(scores ?? []).slice');

  // growthUntilNow.slice -> (growthUntilNow ?? []).slice
  content = content.replace(/growthUntilNow\.slice/g, '(growthUntilNow ?? []).slice');
  
  // items.slice -> (items ?? []).slice
  content = content.replace(/items\.slice/g, '(items ?? []).slice');

  // filtered.slice -> (filtered ?? []).slice
  content = content.replace(/filtered\.slice/g, '(filtered ?? []).slice');

  // length, map, filter に対する防御
  content = content.replace(/cohorts\.map/g, '(cohorts ?? []).map');
  content = content.replace(/cohorts\.length/g, '(cohorts ?? []).length');
  content = content.replace(/cohorts\.filter/g, '(cohorts ?? []).filter');
  
  content = content.replace(/journals\.map/g, '(journals ?? []).map');
  content = content.replace(/journals\.length/g, '(journals ?? []).length');
  content = content.replace(/journals\.filter/g, '(journals ?? []).filter');

  content = content.replace(/\(\(cohorts \?\? \[\]\) \?\? \[\]\)/g, '(cohorts ?? [])');
  content = content.replace(/\(\(journals \?\? \[\]\) \?\? \[\]\)/g, '(journals ?? [])');
  content = content.replace(/\(\(items \?\? \[\]\) \?\? \[\]\)/g, '(items ?? [])');
  content = content.replace(/\(\(scores \?\? \[\]\) \?\? \[\]\)/g, '(scores ?? [])');
  content = content.replace(/\(\(filtered \?\? \[\]\) \?\? \[\]\)/g, '(filtered ?? [])');
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Patched', file);
  }
});
