import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decideSync, payloadIsEmpty, type SyncDecisionInput } from './lastWriteWins.ts';

const server = '2026-10-29T12:00:00.000Z';
const serverMs = Date.parse(server);

function input(patch: Partial<SyncDecisionInput>): SyncDecisionInput {
  return {
    serverUpdatedAt: server,
    serverEmpty: false,
    localUpdatedAt: serverMs,
    localEmpty: false,
    dirty: false,
    acknowledgedAt: server,
    ...patch,
  };
}

test('empty server pushes local data and does nothing when both sides are empty', () => {
  assert.equal(
    decideSync(input({ serverUpdatedAt: null, serverEmpty: true, dirty: true, acknowledgedAt: null, localUpdatedAt: 50 })),
    'push-local',
  );
  assert.equal(
    decideSync(input({ serverUpdatedAt: null, serverEmpty: true, localEmpty: true, dirty: false, acknowledgedAt: null, localUpdatedAt: 0 })),
    'idle',
  );
});

test('server copy wins when it is newer than a dirty device', () => {
  assert.equal(
    decideSync(
      input({
        dirty: true,
        acknowledgedAt: null,
        localUpdatedAt: serverMs - 1_000,
      }),
    ),
    'apply-server',
  );
});

test('local copy wins when the device edited more recently', () => {
  assert.equal(
    decideSync(
      input({
        dirty: true,
        acknowledgedAt: null,
        localUpdatedAt: serverMs + 1_000,
      }),
    ),
    'push-local',
  );
});

test('equal timestamps keep the server copy', () => {
  assert.equal(
    decideSync(
      input({
        dirty: true,
        acknowledgedAt: null,
        localUpdatedAt: serverMs,
      }),
    ),
    'apply-server',
  );
});

test('a clean device takes a newer server row and pushes its own pending edits', () => {
  const older = '2026-10-28T12:00:00.000Z';
  assert.equal(decideSync(input({ acknowledgedAt: older, dirty: false })), 'apply-server');
  assert.equal(
    decideSync(input({ dirty: true, localUpdatedAt: serverMs + 5_000 })),
    'push-local',
  );
});

test('a matching acknowledgement with no local edits stays idle', () => {
  assert.equal(decideSync(input({})), 'idle');
});

test('payloadIsEmpty ignores blobs with no training data', () => {
  assert.equal(payloadIsEmpty(null), true);
  assert.equal(payloadIsEmpty({ templates: [], workouts: [], weightLog: [] }), true);
  assert.equal(payloadIsEmpty({ templates: [{ id: 'push' }], workouts: [], weightLog: [] }), false);
});
