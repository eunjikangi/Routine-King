const test = require('node:test');
const assert = require('node:assert/strict');
const server = require('../server');

test('serves the dashboard', async () => {
  await new Promise(resolve => server.listen(0, resolve));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/`);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /기억하지 않아도 되는 삶/);
  await new Promise(resolve => server.close(resolve));
});
