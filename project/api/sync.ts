import { createHash, timingSafeEqual } from 'node:crypto';
import postgres from 'postgres';

/**
 * Server-only sync. The database URL and passcode live in Vercel env,
 * never in the client bundle. One row in lift_lab.app_state.
 */
const ROW_ID = 'default';

interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface ApiResponse {
  setHeader(name: string, value: string): void;
  status(code: number): ApiResponse;
  json(payload: unknown): void;
}

export interface SyncDb {
  read(): Promise<{ data: unknown; updated_at: string | null } | null>;
  write(
    data: Record<string, unknown>,
    updatedAt: string,
  ): Promise<{ data: unknown; updated_at: string | null } | null>;
}

type Sql = ReturnType<typeof postgres>;

let client: Sql | undefined;

function header(req: ApiRequest, name: string): string {
  const value = req.headers[name];
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

/** Hash both sides so a length mismatch still compares in constant time. */
function passcodesMatch(given: string, expected: string): boolean {
  const left = createHash('sha256').update(expected, 'utf8').digest();
  const right = createHash('sha256').update(given, 'utf8').digest();
  return timingSafeEqual(left, right);
}

function databaseUrl(): string | null {
  const url = (process.env.LIFT_DATABASE_URL ?? '').trim();
  if (!url.startsWith('postgres://') && !url.startsWith('postgresql://')) return null;
  return url;
}

function getSql(url: string): Sql {
  if (!client) client = postgres(url, { prepare: false, max: 1 });
  return client;
}

function asTimestamp(value: unknown): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return value;
  return null;
}

function mapRow(
  row: { data?: unknown; updated_at?: unknown } | undefined,
): { data: unknown; updated_at: string | null } | null {
  if (!row) return null;
  return { data: row.data ?? null, updated_at: asTimestamp(row.updated_at) };
}

function liveDb(): SyncDb | null {
  const url = databaseUrl();
  if (!url) return null;
  const sql = getSql(url);
  return {
    async read() {
      const rows = await sql<{ data: unknown; updated_at: Date | string | null }[]>`
        select data, updated_at
        from lift_lab.app_state
        where id = ${ROW_ID}
      `;
      return mapRow(rows[0]);
    },
    async write(data, updatedAt) {
      const rows = await sql<{ data: unknown; updated_at: Date | string | null }[]>`
        insert into lift_lab.app_state (id, data, updated_at)
        values (${ROW_ID}, ${JSON.stringify(data)}::jsonb, ${updatedAt})
        on conflict (id) do update
        set data = excluded.data,
            updated_at = excluded.updated_at
        returning data, updated_at
      `;
      return mapRow(rows[0]);
    },
  };
}

function asJson(body: unknown): unknown {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }
  if (body instanceof Uint8Array) {
    try {
      return JSON.parse(new TextDecoder().decode(body));
    } catch {
      return null;
    }
  }
  return body ?? null;
}

function payloadFrom(body: unknown): Record<string, unknown> | null {
  const parsed = asJson(body);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const data = (parsed as Record<string, unknown>).data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  return data as Record<string, unknown>;
}

export async function handleSync(req: ApiRequest, res: ApiResponse, db?: SyncDb): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');

  const expected = process.env.LIFT_PASSCODE ?? '';
  const given = header(req, 'x-lift-passcode').slice(0, 1024);
  const matches = passcodesMatch(given, expected);
  if (!expected || !matches) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const store = db ?? liveDb();
  if (!store) {
    res.status(500).json({ error: 'not configured' });
    return;
  }

  try {
    if (req.method === 'GET') {
      const row = await store.read();
      res.status(200).json(row ?? { data: null, updated_at: null });
      return;
    }

    if (req.method === 'PUT') {
      const data = payloadFrom(req.body);
      if (!data) {
        res.status(400).json({ error: 'expected a data object' });
        return;
      }
      const updatedAt = new Date().toISOString();
      const row = await store.write(data, updatedAt);
      res.status(200).json({ data, updated_at: row?.updated_at ?? updatedAt });
      return;
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch {
    console.error(req.method === 'PUT' ? 'sync write failed' : 'sync read failed');
    res.status(502).json({ error: 'sync failed' });
  }
}

export default function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  return handleSync(req, res);
}
