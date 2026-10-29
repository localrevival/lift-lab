import { create } from 'zustand';
import { syncPayload } from '../data/liftState';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { contentUpdatedAt, decideSync, payloadIsEmpty, type SyncAction } from './lastWriteWins';

const PASSCODE_KEY = 'lift-lab-passcode';
const META_KEY = 'lift-lab-sync';
const PUSH_DELAY_MS = 1500;

export type SyncPhase = 'locked' | 'open';
export type SyncStatus = 'idle' | 'syncing' | 'saved' | 'offline';
export type PasscodeResult = 'ok' | 'unauthorized' | 'unreachable';

interface SyncMeta {
  localUpdatedAt: number;
  acknowledgedAt: string | null;
  dirty: boolean;
}

interface SyncUi {
  phase: SyncPhase;
  status: SyncStatus;
  gateError: string | null;
}

interface RemoteOk {
  ok: true;
  data: unknown;
  updatedAt: string | null;
}

interface RemoteFail {
  ok: false;
  reason: 'unauthorized' | 'unreachable';
}

type Remote = RemoteOk | RemoteFail;

function savedPasscode(): string | null {
  try {
    const value = localStorage.getItem(PASSCODE_KEY);
    return value ? value : null;
  } catch {
    return null;
  }
}

function writePasscode(passcode: string) {
  localStorage.setItem(PASSCODE_KEY, passcode);
}

function writeMeta(meta: SyncMeta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch (error) {
    console.error('lift lab sync meta failed', error);
  }
}

function readMeta(): SyncMeta | null {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SyncMeta>;
    if (typeof parsed.localUpdatedAt !== 'number' || !Number.isFinite(parsed.localUpdatedAt)) return null;
    return {
      localUpdatedAt: parsed.localUpdatedAt,
      acknowledgedAt: typeof parsed.acknowledgedAt === 'string' ? parsed.acknowledgedAt : null,
      dirty: parsed.dirty === true,
    };
  } catch {
    return null;
  }
}

function ensureMeta(): SyncMeta {
  const existing = readMeta();
  if (existing) return existing;
  const payload = syncPayload(useWorkoutStore.getState());
  const meta: SyncMeta = {
    localUpdatedAt: contentUpdatedAt(payload),
    acknowledgedAt: null,
    dirty: !payloadIsEmpty(payload),
  };
  writeMeta(meta);
  return meta;
}

function markDirty() {
  const meta = ensureMeta();
  writeMeta({ ...meta, localUpdatedAt: Date.now(), dirty: true });
}

export const useSyncStore = create<SyncUi>(() => ({
  phase: savedPasscode() ? 'open' : 'locked',
  status: 'idle',
  gateError: null,
}));

let generation = 0;
let detach: (() => void) | null = null;
let applying = false;
let chain: Promise<void> = Promise.resolve();

function alive(token: number) {
  return token === generation;
}

export function stopSync() {
  generation += 1;
  detach?.();
  detach = null;
}

function decisionFor(remote: RemoteOk): SyncAction {
  const meta = ensureMeta();
  const local = syncPayload(useWorkoutStore.getState());
  return decideSync({
    serverUpdatedAt: remote.updatedAt,
    serverEmpty: payloadIsEmpty(remote.data),
    localUpdatedAt: meta.localUpdatedAt,
    localEmpty: payloadIsEmpty(local),
    dirty: meta.dirty,
    acknowledgedAt: meta.acknowledgedAt,
  });
}

function applyServer(data: unknown, updatedAt: string) {
  applying = true;
  try {
    useWorkoutStore.getState().replaceSynced(data);
  } finally {
    applying = false;
  }
  const time = Date.parse(updatedAt);
  writeMeta({
    localUpdatedAt: Number.isNaN(time) ? Date.now() : time,
    acknowledgedAt: updatedAt,
    dirty: false,
  });
}

async function request(method: 'GET' | 'PUT', passcode: string, data?: unknown): Promise<Remote> {
  try {
    const response = await fetch('/api/sync', {
      method,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'x-lift-passcode': passcode,
        ...(method === 'PUT' ? { 'Content-Type': 'application/json' } : {}),
      },
      body: method === 'PUT' ? JSON.stringify({ data }) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    if (response.status === 401) return { ok: false, reason: 'unauthorized' };
    if (!response.ok) return { ok: false, reason: 'unreachable' };
    const body = (await response.json()) as { data?: unknown; updated_at?: unknown };
    const updatedAt = typeof body.updated_at === 'string' && !Number.isNaN(Date.parse(body.updated_at)) ? body.updated_at : null;
    return { ok: true, data: body.data ?? null, updatedAt };
  } catch {
    return { ok: false, reason: 'unreachable' };
  }
}

function lock(token: number) {
  try {
    localStorage.removeItem(PASSCODE_KEY);
  } catch {
    // The gate still closes if storage is blocked.
  }
  if (!alive(token)) return;
  stopSync();
  useSyncStore.setState({ phase: 'locked', status: 'idle', gateError: 'Wrong passcode' });
}

async function runOnce(token: number) {
  const passcode = savedPasscode();
  if (!passcode) {
    lock(token);
    return;
  }
  if (!alive(token)) return;
  useSyncStore.setState({ status: 'syncing' });

  const remote = await request('GET', passcode);
  if (!alive(token)) return;
  if (!remote.ok) {
    if (remote.reason === 'unauthorized') lock(token);
    else useSyncStore.setState({ status: 'offline' });
    return;
  }

  let action = decisionFor(remote);
  if (action === 'apply-server') action = decisionFor(remote);
  if (!alive(token)) return;

  if (action === 'push-local') {
    const before = readMeta()?.localUpdatedAt ?? 0;
    const pushed = await request('PUT', passcode, syncPayload(useWorkoutStore.getState()));
    if (!alive(token)) return;
    if (!pushed.ok) {
      if (pushed.reason === 'unauthorized') lock(token);
      else useSyncStore.setState({ status: 'offline' });
      return;
    }
    const current = readMeta() ?? ensureMeta();
    writeMeta({
      localUpdatedAt: current.localUpdatedAt,
      acknowledgedAt: pushed.updatedAt ?? new Date().toISOString(),
      dirty: current.localUpdatedAt !== before,
    });
  } else if (action === 'apply-server' && remote.updatedAt) {
    applyServer(remote.data, remote.updatedAt);
  }

  if (alive(token)) useSyncStore.setState({ status: 'saved' });
}

function enqueue(token: number) {
  chain = chain.then(() => runOnce(token)).catch(() => {
    if (alive(token)) useSyncStore.setState({ status: 'offline' });
  });
}

export function startSync() {
  stopSync();
  const token = generation;
  ensureMeta();
  useSyncStore.setState({ phase: 'open', status: 'syncing', gateError: null });

  let timer: ReturnType<typeof setTimeout> | null = null;
  const unsub = useWorkoutStore.subscribe((state, previous) => {
    if (!alive(token) || applying) return;
    try {
      if (JSON.stringify(syncPayload(state)) === JSON.stringify(syncPayload(previous))) return;
      markDirty();
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        if (alive(token)) enqueue(token);
      }, PUSH_DELAY_MS);
    } catch (error) {
      console.error('lift lab sync schedule failed', error);
    }
  });

  const flush = () => {
    if (!alive(token)) return;
    if (timer) clearTimeout(timer);
    timer = null;
    enqueue(token);
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible') flush();
  };

  window.addEventListener('online', flush);
  window.addEventListener('focus', flush);
  document.addEventListener('visibilitychange', onVisible);
  detach = () => {
    unsub();
    if (timer) clearTimeout(timer);
    window.removeEventListener('online', flush);
    window.removeEventListener('focus', flush);
    document.removeEventListener('visibilitychange', onVisible);
  };

  enqueue(token);
}

/** Check the passcode with GET. A saved passcode is what lets the next launch skip this screen. */
export async function submitPasscode(passcode: string): Promise<PasscodeResult> {
  const remote = await request('GET', passcode);
  if (!remote.ok) return remote.reason;
  try {
    writePasscode(passcode);
  } catch {
    return 'unreachable';
  }
  useSyncStore.setState({ phase: 'open', gateError: null, status: 'syncing' });
  return 'ok';
}
