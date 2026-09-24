'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { createApp } = require('../app');
const { createMemoryStore } = require('../lib/store');

let server;
let base;
let dbUp = true;

before(async () => {
  const store = createMemoryStore();
  store.ready = async () => dbUp;
  server = createApp({ store }).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

test('GET / renders the home page', async () => {
  const res = await fetch(base + '/');
  assert.strictEqual(res.status, 200);
  assert.match(await res.text(), /AhmadBlog/);
});

test('GET /?category=Web filters posts', async () => {
  const res = await fetch(base + '/?category=Web');
  assert.strictEqual(res.status, 200);
});

test('GET /post/1 renders a post', async () => {
  const res = await fetch(base + '/post/1');
  assert.strictEqual(res.status, 200);
});

test('unknown post returns a proper 404 page (not a crash)', async () => {
  const res = await fetch(base + '/post/999999');
  assert.strictEqual(res.status, 404);
  assert.match(await res.text(), /Post not found/);
});

test('non-numeric post id returns 404', async () => {
  const res = await fetch(base + '/post/abc');
  assert.strictEqual(res.status, 404);
});

test('unknown route returns 404', async () => {
  const res = await fetch(base + '/nope');
  assert.strictEqual(res.status, 404);
});

test('/healthz is always 200', async () => {
  const res = await fetch(base + '/healthz');
  assert.strictEqual(res.status, 200);
});

test('/readyz follows database availability', async () => {
  dbUp = true;
  assert.strictEqual((await fetch(base + '/readyz')).status, 200);
  dbUp = false;
  assert.strictEqual((await fetch(base + '/readyz')).status, 503);
  dbUp = true;
});

test('security headers are set and /metrics is not exposed on the public port', async () => {
  const res = await fetch(base + '/');
  assert.ok(res.headers.get('content-security-policy'));
  assert.strictEqual((await fetch(base + '/metrics')).status, 404);
});
