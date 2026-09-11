import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Conversations, exercised through the HTTP API against the real built server.
 *
 * Testing the storage module directly would be faster, but these routes are the
 * only way the app reaches it, and a route that forgets to await its params is
 * a bug the module tests would never see.
 */

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const built = existsSync(join(root, 'server', 'server.js'));

let child;
let base;
let home;

before(async () => {
  if (!built) return;
  home = mkdtempSync(join(tmpdir(), 'hyperwake-agent-threads-'));
  const port = 3800 + Math.floor(Math.random() * 90);
  base = `http://127.0.0.1:${port}`;

  child = spawn(process.execPath, [join(root, 'server', 'server.js')], {
    cwd: join(root, 'server'),
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: '127.0.0.1',
      HYPERWAKE_AGENT_HOME: home,
      // Point at a port nothing is on, so the engine is definitively absent and
      // these tests never touch a real machine.
      HYPERWAKE_PORT: '4999',
    },
    stdio: 'ignore',
  });

  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const probe = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(1000) });
      if (probe.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('the server never started');
});

after(() => {
  child?.kill('SIGKILL');
  if (home) rmSync(home, { recursive: true, force: true });
});

const json = async (path, init) => {
  const response = await fetch(`${base}${path}`, init);
  return { status: response.status, body: await response.json() };
};

test('a conversation is created, listed, read and deleted', { skip: built ? false : 'build first' }, async () => {
  const created = await json('/api/threads', { method: 'POST' });
  assert.equal(created.status, 200);
  const { id } = created.body.thread;
  assert.equal(created.body.thread.machineId, null, 'a new conversation owns no machine');

  const listed = await json('/api/threads');
  assert.ok(listed.body.threads.some((t) => t.id === id));

  const read = await json(`/api/threads/${id}`);
  assert.equal(read.body.thread.id, id);
  assert.deepEqual(read.body.thread.messages, []);

  const removed = await json(`/api/threads/${id}`, { method: 'DELETE' });
  assert.equal(removed.body.deleted, true);
  assert.equal((await json(`/api/threads/${id}`)).status, 404);
});

test('conversations come back newest first', { skip: built ? false : 'build first' }, async () => {
  const before = (await json('/api/threads')).body.threads.length;
  const first = (await json('/api/threads', { method: 'POST' })).body.thread;
  await new Promise((r) => setTimeout(r, 1100)); // updatedAt has second resolution
  const second = (await json('/api/threads', { method: 'POST' })).body.thread;

  const threads = (await json('/api/threads')).body.threads;
  assert.equal(threads.length, before + 2);
  assert.equal(threads[0].id, second.id, 'the newest should lead');

  await json(`/api/threads/${first.id}`, { method: 'DELETE' });
  await json(`/api/threads/${second.id}`, { method: 'DELETE' });
});

test('a thread id that is not a uuid cannot escape the directory', { skip: built ? false : 'build first' }, async () => {
  const snapshot = readdirSync(home).sort();
  for (const attempt of ['..%2F..%2Fconfig', 'not-a-uuid', '%2Fetc%2Fpasswd']) {
    const response = await fetch(`${base}/api/threads/${attempt}`);
    assert.ok(response.status >= 400, `${attempt} should be refused, got ${response.status}`);
  }
  // Stronger than checking for specific names: nothing new appeared anywhere in
  // the config directory as a result of those attempts.
  assert.deepEqual(readdirSync(home).sort(), snapshot);
  for (const entry of readdirSync(home)) {
    assert.ok(['config.json', 'threads'].includes(entry), `unexpected entry: ${entry}`);
  }
});

test('chat refuses a message for a conversation that does not exist', { skip: built ? false : 'build first' }, async () => {
  const response = await json('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ threadId: '00000000-0000-4000-8000-000000000000', messages: [] }),
  });
  assert.equal(response.status, 404);
});

test('chat refuses a cross-origin caller', { skip: built ? false : 'build first' }, async () => {
  const response = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
    body: JSON.stringify({ threadId: 'x', messages: [] }),
  });
  assert.equal(response.status, 403);
});

test('the machines view degrades honestly when the engine is absent', { skip: built ? false : 'build first' }, async () => {
  const response = await json('/api/machines');
  assert.equal(response.status, 502);
  assert.match(response.body.error, /engine|npx hyperwake/i);
});

test('the desktop refuses a conversation with no machine', { skip: built ? false : 'build first' }, async () => {
  const { thread } = (await json('/api/threads', { method: 'POST' })).body;
  const response = await json('/api/desktop', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ threadId: thread.id }),
  });
  assert.equal(response.status, 409);
  assert.match(response.body.error, /no machine/i);
  await json(`/api/threads/${thread.id}`, { method: 'DELETE' });
});
