const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, readFile, stat, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { createBridge } = require('../scripts/bridge.cjs');

test('bridge requires authentication, validates snapshots and writes private local data', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'remnote-insights-test-'));
  const server = createBridge({ token: 'test-token', directory, maxBytes: 1024 });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  });
  const url = `http://127.0.0.1:${server.address().port}/snapshot`;
  const headers = { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' };
  assert.equal((await fetch(url, { method: 'POST', body: '{}' })).status, 401);
  assert.equal((await fetch(url, { method: 'POST', headers, body: '{}' })).status, 400);
  assert.equal((await fetch(url, { method: 'POST', headers, body: 'x'.repeat(1025) })).status, 413);
  const snapshot = { schemaVersion: 1, collectedAt: '2026-10-15T12:00:00Z', knowledgeBase: { _id: 'test-kb' }, cards: [] };
  assert.equal((await fetch(url, { method: 'POST', headers, body: JSON.stringify(snapshot) })).status, 204);
  const file = path.join(directory, 'latest-snapshot.json');
  assert.deepEqual(JSON.parse(await readFile(file, 'utf8')), snapshot);
  assert.equal((await stat(file)).mode & 0o777, 0o600);
  assert.equal((await fetch(url, { headers })).status, 404);
});
