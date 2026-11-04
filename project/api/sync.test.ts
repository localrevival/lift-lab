import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import handler, { handleSync, type SyncDb } from './sync.ts';

const PASS = 'test-passcode';

function req(method: string, passcode = PASS, body?: unknown) {
  return { method, headers: { 'x-lift-passcode': passcode }, body };
}

function capture() {
  const out: { status?: number; body?: unknown; cache?: string } = {};
  const res = {
    setHeader(name: string, value: string) {
      if (name === 'Cache-Control') out.cache = value;
    },
    status(code: number) {
      out.status = code;
      return res;
    },
    json(payload: unknown) {
      out.body = payload;
    },
  };
  return { out, res };
}

describe('sync handler', { concurrency: false }, () => {
  test('rejects a missing or wrong passcode', async () => {
    let calls = 0;
    const db: SyncDb = {
      async read() {
        calls += 1;
        return null;
      },
      async write() {
        calls += 1;
        return null;
      },
    };
    process.env.LIFT_PASSCODE = PASS;
    const wrong = capture();
    await handleSync(req('GET', 'nope'), wrong.res, db);
    assert.equal(wrong.out.status, 401);
    assert.deepEqual(wrong.out.body, { error: 'unauthorized' });
    assert.equal(wrong.out.cache, 'no-store');

    process.env.LIFT_PASSCODE = '';
    const empty = capture();
    await handleSync(req('GET', ''), empty.res, db);
    assert.equal(empty.out.status, 401);
    assert.equal(calls, 0);
  });

  test('reports not configured when the database url is missing', async () => {
    const previous = process.env.LIFT_DATABASE_URL;
    process.env.LIFT_PASSCODE = PASS;
    delete process.env.LIFT_DATABASE_URL;
    try {
      const { out, res } = capture();
      await handler(req('GET'), res);
      assert.equal(out.status, 500);
      assert.deepEqual(out.body, { error: 'not configured' });
    } finally {
      if (previous === undefined) delete process.env.LIFT_DATABASE_URL;
      else process.env.LIFT_DATABASE_URL = previous;
    }
  });

  test('reads and writes the app_state row', async () => {
    process.env.LIFT_PASSCODE = PASS;
    const stored: { data: unknown; updated_at: string | null } = { data: null, updated_at: null };
    const db: SyncDb = {
      async read() {
        return stored.data ? stored : null;
      },
      async write(data, updatedAt) {
        stored.data = data;
        stored.updated_at = updatedAt;
        return { data, updated_at: updatedAt };
      },
    };

    const empty = capture();
    await handleSync(req('GET'), empty.res, db);
    assert.equal(empty.out.status, 200);
    assert.deepEqual(empty.out.body, { data: null, updated_at: null });

    const payload = { templates: [], workouts: [], weightLog: [] };
    const put = capture();
    await handleSync(req('PUT', PASS, { data: payload }), put.res, db);
    assert.equal(put.out.status, 200);
    const body = put.out.body as { data: unknown; updated_at: string };
    assert.deepEqual(body.data, payload);
    assert.equal(Number.isNaN(Date.parse(body.updated_at)), false);

    const got = capture();
    await handleSync(req('GET'), got.res, db);
    assert.deepEqual((got.out.body as { data: unknown }).data, payload);
  });

  test('rejects a bad body, an unknown method, and a database error', async () => {
    process.env.LIFT_PASSCODE = PASS;
    const db: SyncDb = {
      async read() {
        throw new Error('db down');
      },
      async write() {
        throw new Error('db down');
      },
    };

    const bad = capture();
    await handleSync(req('PUT', PASS, { data: null }), bad.res, db);
    assert.equal(bad.out.status, 400);
    assert.deepEqual(bad.out.body, { error: 'expected a data object' });

    const method = capture();
    await handleSync(req('POST'), method.res, db);
    assert.equal(method.out.status, 405);
    assert.deepEqual(method.out.body, { error: 'method not allowed' });

    const read = capture();
    await handleSync(req('GET'), read.res, db);
    assert.equal(read.out.status, 502);
    assert.deepEqual(read.out.body, { error: 'sync failed' });

    const write = capture();
    await handleSync(req('PUT', PASS, '{"data":{"workouts":[]}}'), write.res, db);
    assert.equal(write.out.status, 502);
  });
});
