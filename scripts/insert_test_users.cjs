const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

async function seed() {
  // We can't easily seed via HTTP if there's no POST /users endpoint for admin?
  // Let's use d1 execute.
}
seed();
