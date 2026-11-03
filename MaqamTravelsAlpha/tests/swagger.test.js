const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../app');

test('Swagger UI is available at /api/docs', async () => {
  const server = app.listen(0);

  await new Promise((resolve) => server.once('listening', resolve));

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const response = await fetch(`${baseUrl}/api/docs/`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /swagger-ui/i);
  } finally {
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
});
