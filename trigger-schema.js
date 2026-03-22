async function test() {
  try {
    const res = await fetch("http://localhost:3000/api/data/journals?student_id=1");
    console.log(res.status, await res.text());
  } catch (e) {
    console.error(e);
  }
}
test();
