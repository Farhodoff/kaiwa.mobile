import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ProgressSync } from '../src/lib/progress-sync.ts';
import { recordLessonProgress } from '../src/lib/lesson-progress.ts';

const initial = () => ({
  progress: {
    xp: 20, xpGoal: 200, streak: 1, level: 'N3', levelProgress: 0.1,
    wordsLearned: 0, dailyGoal: 30, dailyGoalDone: 1, conversationsDone: 0,
    lessonsDone: 0, lastActivityDate: '2026-11-19',
    notificationsEnabled: true, soundEnabled: true, jlptDone: {},
  },
  reviewedCards: [], lessonProgress: {}, activity: [],
});

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

async function eventually(check) {
  for (let i = 0; i < 100; i++) {
    if (check()) return;
    await new Promise((done) => setImmediate(done));
  }
  assert.fail('Expected asynchronous work to finish');
}

function fixture() {
  const disk = new Map();
  const writes = [];
  const state = { remote: initial(), offline: false, diskBroken: false };
  const storage = {
    async getItem(key) { return disk.get(key) ?? null; },
    async setItem(key, value) {
      if (state.diskBroken) throw new Error('Disk full');
      disk.set(key, value);
    },
  };
  const read = async () => {
    if (state.offline) throw new Error('Offline');
    return structuredClone(state.remote);
  };
  const write = async (op) => {
    if (state.offline) throw new Error('Offline');
    writes.push(structuredClone(op));
    if (op.kind === 'progress') Object.assign(state.remote.progress, op.patch);
    if (op.kind === 'lesson') state.remote.lessonProgress[op.row.lesson_id] = op.row;
    if (op.kind === 'review' && !state.remote.reviewedCards.includes(op.cardId)) {
      state.remote.reviewedCards.push(op.cardId);
    }
    if (op.kind === 'activity') {
      state.remote.activity = [op.row, ...state.remote.activity.filter((item) => item.day !== op.row.day)];
    }
  };
  const create = (overrides = {}) => new ProgressSync({
    userId: 'alice', storage, read, write, onChange() {}, ...overrides,
  });
  return { disk, writes, state, storage, read, write, create };
}

function changeXp(client, xp) {
  client.update({ ...client.snapshot, progress: { ...client.snapshot.progress, xp } }, {
    progress: { kind: 'progress', patch: { xp } },
  });
}

test('offline changes survive restart and sync without losing other pending fields', async () => {
  const f = fixture();
  const first = f.create();
  await first.start();
  f.state.offline = true;
  changeXp(first, 30);
  first.update({ ...first.snapshot, progress: { ...first.snapshot.progress, soundEnabled: false } }, {
    progress: { kind: 'progress', patch: { soundEnabled: false } },
  });
  await eventually(() => JSON.parse(f.disk.get('kaiwa-progress:v1:alice')).snapshot.progress.soundEnabled === false);
  await first.sync();
  first.stop();
  const second = f.create();
  await second.start();
  assert.equal(second.snapshot.progress.xp, 30);
  assert.equal(second.snapshot.progress.soundEnabled, false);
  f.state.offline = false;
  await second.sync();
  assert.equal(f.state.remote.progress.xp, 30);
  assert.equal(f.state.remote.progress.soundEnabled, false);
  assert.deepEqual(JSON.parse(f.disk.get('kaiwa-progress:v1:alice')).pending, {});
});

test('lost server acknowledgement can be retried without doubling activity', async () => {
  const f = fixture();
  let loseResponse = true;
  const client = f.create({ write: async (op) => {
    await f.write(op);
    if (loseResponse) throw new Error('Response lost');
  } });
  await client.start();
  const row = { day: '2026-11-19', xp: 10, minutes: 3 };
  client.update({ ...client.snapshot, activity: [row] }, {
    'activity:2026-11-19': { kind: 'activity', row },
  });
  await client.sync();
  assert.equal(f.state.remote.activity[0].xp, 10);
  loseResponse = false;
  await client.sync();
  assert.deepEqual(f.state.remote.activity, [row]);
});

test('an edit while a slow write is in flight is not acknowledged as the old write', async () => {
  const f = fixture();
  const gate = deferred();
  let began = false;
  const client = f.create({ write: async (op) => {
    if (!began) { began = true; await gate.promise; }
    await f.write(op);
  } });
  await client.start();
  changeXp(client, 30);
  await eventually(() => began);
  changeXp(client, 40);
  gate.resolve();
  await client.sync();
  assert.equal(client.snapshot.progress.xp, 40);
  assert.equal(f.state.remote.progress.xp, 40);
});

test('a stale refresh cannot replace edits and those edits still reach the server', async () => {
  const f = fixture();
  const gate = deferred();
  let slow = false;
  let began = false;
  const client = f.create({ read: async () => {
    const result = await f.read();
    if (slow) { began = true; await gate.promise; }
    return result;
  } });
  await client.start();
  slow = true;
  const refresh = client.sync();
  await eventually(() => began);
  changeXp(client, 70);
  gate.resolve();
  await refresh;
  assert.equal(client.snapshot.progress.xp, 70);
  await eventually(() => f.state.remote.progress.xp === 70);
});

test('failed first load exposes an error instead of creating a zero snapshot', async () => {
  const f = fixture();
  f.state.offline = true;
  let last;
  const client = f.create({ onChange(value) { last = value; } });
  await client.start();
  assert.equal(client.snapshot, null);
  assert.ok(last.error);
  assert.equal(f.disk.size, 0);
  f.state.offline = false;
  await client.start();
  assert.equal(client.snapshot.progress.xp, 20);
});

test('storage failure blocks sending unpersisted changes and manual retry recovers', async () => {
  const f = fixture();
  let last;
  const client = f.create({ onChange(value) { last = value; } });
  await client.start();
  f.state.diskBroken = true;
  changeXp(client, 80);
  await eventually(() => last.storageError);
  assert.equal(f.writes.length, 0);
  f.state.diskBroken = false;
  await client.sync();
  assert.equal(f.state.remote.progress.xp, 80);
  assert.equal(last.storageError, false);
});

test('accounts have separate disk records and disposed sessions never notify the next account', async () => {
  const f = fixture();
  const alice = f.create();
  await alice.start();
  f.state.offline = true;
  changeXp(alice, 90);
  await alice.sync();
  alice.stop();
  const bob = f.create({ userId: 'bob' });
  await bob.start();
  assert.equal(bob.snapshot, null);
  assert.equal(f.disk.has('kaiwa-progress:v1:bob'), false);

  f.state.offline = false;
  const gate = deferred();
  let calls = 0;
  const late = f.create({ userId: 'carol', read: () => gate.promise, onChange() { calls++; } });
  const starting = late.start();
  await eventually(() => calls > 0);
  late.stop();
  const previous = calls;
  gate.resolve(initial());
  await starting;
  assert.equal(calls, previous);
  assert.equal(late.snapshot, null);
});

test('corrupt cache is not replaced silently with server defaults', async () => {
  const f = fixture();
  f.disk.set('kaiwa-progress:v1:alice', '{broken');
  let last;
  const client = f.create({ onChange(value) { last = value; } });
  await client.start();
  assert.equal(last.storageError, true);
  assert.equal(client.snapshot, null);
  assert.equal(f.disk.get('kaiwa-progress:v1:alice'), '{broken');
});

test('completed lessons remain completed and are counted only once after revisiting', () => {
  let result = recordLessonProgress(initial(), 'lesson-1', { progress: 1, isCompleted: true, score: 85 });
  result = recordLessonProgress(result.snapshot, 'lesson-1', { progress: 1, isCompleted: true });
  result = recordLessonProgress(result.snapshot, 'lesson-1', { progress: 0.2, isCompleted: false, score: null });
  assert.equal(result.snapshot.progress.lessonsDone, 1);
  assert.deepEqual(result.snapshot.lessonProgress['lesson-1'], {
    lesson_id: 'lesson-1', progress: 1, is_completed: true, score: 85,
  });
  assert.deepEqual(result.writes['lesson:lesson-1'].row, result.snapshot.lessonProgress['lesson-1']);
});

test('a partially sent batch resumes after restart with the original review date', async () => {
  const f = fixture();
  const first = f.create({ write: async (op) => {
    if (op.kind === 'review') throw new Error('Connection lost');
    await f.write(op);
  } });
  await first.start();
  const result = recordLessonProgress(first.snapshot, 'lesson-2', { progress: 1, isCompleted: true });
  first.update({ ...result.snapshot, reviewedCards: ['card-1'] }, {
    ...result.writes,
    'review:card-1:2026-11-18': { kind: 'review', cardId: 'card-1', day: '2026-11-18' },
  });
  await first.sync();
  first.stop();
  assert.equal(f.state.remote.progress.lessonsDone, 1);
  assert.equal(f.state.remote.lessonProgress['lesson-2'].is_completed, true);
  const sent = f.writes.length;
  const second = f.create();
  await second.start();
  assert.deepEqual(f.writes.slice(sent), [{ kind: 'review', cardId: 'card-1', day: '2026-11-18' }]);
  assert.deepEqual(second.snapshot.reviewedCards, ['card-1']);
});
