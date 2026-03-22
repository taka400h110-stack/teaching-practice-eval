const resultLCGA = await fetch('http://localhost:3000/api/stats/lcga', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    weekly_scores: [
      [2, 3, 4, 5, 5],
      [1, 2, 3, 4, 5],
      [3, 3, 3, 3, 3],
      [5, 4, 3, 2, 1],
      [4, 3, 2, 1, 1],
      [1, 1, 1, 2, 2]
    ]
  })
});
console.log("LCGA:", await resultLCGA.json());

const resultLGCM = await fetch('http://localhost:3000/api/stats/lgcm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    weekly_scores: [
      [2, 3, 4, 5, 5],
      [1, 2, 3, 4, 5],
      [3, 3, 3, 3, 3],
      [5, 4, 3, 2, 1],
      [4, 3, 2, 1, 1],
      [1, 1, 1, 2, 2]
    ]
  })
});
console.log("LGCM:", await resultLGCM.json());
