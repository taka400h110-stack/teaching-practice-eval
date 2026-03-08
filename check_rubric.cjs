async function check() {
  const { RUBRIC_ITEMS } = await import('./src/constants/rubric.ts');
  const missing = RUBRIC_ITEMS.filter(i => !i.behaviors);
  console.log("Missing behaviors:", missing.length);
  if (missing.length > 0) {
    console.log(missing.map(i => i.num));
  }
}
check();
