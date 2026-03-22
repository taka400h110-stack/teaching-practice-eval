const result = await fetch('http://localhost:3000/api/stats/full-reliability', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ai_total: [1.2, 2.3, 3.4, 4.5, 5.0],
    human_total: [1.1, 2.5, 3.2, 4.6, 4.8],
    ai_by_factor: {
      factor1: [1.0, 2.0, 3.0, 4.0, 5.0]
    },
    human_by_factor: {
      factor1: [1.1, 1.9, 3.1, 4.2, 4.8]
    },
    ai_by_item: [],
    human_by_item: []
  })
});
console.log(await result.json());
