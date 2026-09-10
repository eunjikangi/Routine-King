const test = require('node:test');
const assert = require('node:assert/strict');
const server = require('../server');

function request(url) {
  return new Promise(resolve => {
    const result = { status: 0, headers: {}, body: Buffer.alloc(0) };
    server.handleRequest({ url }, {
      writeHead(status, headers = {}) {
        result.status = status;
        result.headers = headers;
      },
      end(body = '') {
        result.body = Buffer.isBuffer(body) ? body : Buffer.from(body);
        resolve(result);
      }
    });
  });
}

test('serves the dashboard', async () => {
  const response = await request('/');
  const html = response.body.toString();
  assert.equal(response.status, 200);
  assert.match(html, /기억하지 않아도 되는 삶/);
  assert.match(html, /id="catalog-dialog"/);
  assert.match(html, /어떤 생활 주기를 기억할까요/);
});

test('serves every dashboard asset', async () => {
  for (const asset of ['/styles.css', '/core.js', '/app.js']) {
    const response = await request(asset);
    assert.equal(response.status, 200, asset);
    assert.match(response.headers['Content-Type'], /text\/(css|javascript)/, asset);
  }
});
