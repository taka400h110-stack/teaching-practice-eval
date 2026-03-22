async function run() {
  const res = await fetch("http://localhost:3000/api/data/evaluator-profiles");
  console.log(res.status, await res.text());
}
run();
