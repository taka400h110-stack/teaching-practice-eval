module.exports = {
  apps: [
    {
      name: 'webapp-test',
      script: 'npx',
      args: 'wrangler pages dev dist --ip 127.0.0.1 --port 8788',
      env: {
        NODE_ENV: 'test',
        PORT: 8788
      }
    }
  ]
}
