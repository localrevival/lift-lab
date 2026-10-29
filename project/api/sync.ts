import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Server-only sync. The service role key and passcode live in Vercel env,
 * never in the client bundle. One row in public.app_state.
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

function supabaseEnv(): { url: string; key: string } | null {
  const url = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url.startsWith('https://') || !key) return null;
  return { url, key };
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

async function supabaseFetch(env: { url: string; key: string }, path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('apikey', env.key);
  headers.set('Authorization', `Bearer ${env.key}`);
  return fetch(`${env.url}${path}`, { ...init, headers });
}

function rowFrom(body: unknown): { data: unknown; updated_at: string | null } | null {
  const row = Array.isArray(body) ? body[0] : null;
  if (!row || typeof row !== 'object') return null;
  const record = row as { data?: unknown; updated_at?: unknown };
  return {
    data: record.data ?? null,
    updated_at: typeof record.updated_at === 'string' ? record.updated_at : null,
  };
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');

  const expected = process.env.LIFT_PASSCODE ?? '';
  const given = header(req, 'x-lift-passcode').slice(0, 1024);
  const matches = passcodesMatch(given, expected);
  if (!expected || !matches) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const env = supabaseEnv();
  if (!env) {
    res.status(500).json({ error: 'not configured' });
    return;
  }

  try {
    if (req.method === 'GET') {
      const response = await supabaseFetch(
        env,
        `/rest/v1/app_state?id=eq.${encodeURIComponent(ROW_ID)}&select=data,updated_at`,
        { headers: { Accept: 'application/json' } },
      );
      if (!response.ok) {
        console.error('supabase read failed', response.status);
        res.status(502).json({ error: 'sync failed' });
        return;
      }
      const row = rowFrom(await response.json());
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
      const response = await supabaseFetch(env, '/rest/v1/app_state?on_conflict=id', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify({ id: ROW_ID, data, updated_at: updatedAt }),
      });
      if (!response.ok) {
        console.error('supabase write failed', response.status);
        res.status(502).json({ error: 'sync failed' });
        return;
      }
      const row = rowFrom(await response.json());
      res.status(200).json({ data, updated_at: row?.updated_at ?? updatedAt });
      return;
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch {
    console.error('sync handler failed');
    res.status(502).json({ error: 'sync failed' });
  }
}
