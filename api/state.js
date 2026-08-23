const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABLE = 'app_state';
const BACKUPS = 'app_state_backups';

function json(status, body) {
  return { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) };
}

async function sb(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = text;
  }

  if (!res.ok) {
    throw new Error(typeof data === 'string' ? data : JSON.stringify(data));
  }

  return data;
}

module.exports = async function handler(req, res) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({
      error: 'Cloud database is not configured yet.'
    });
  }

  try {
    if (req.method === 'GET') {
      const rows = await sb(
        `${TABLE}?select=key,payload,updated_at&key=eq.main&limit=1`,
        { method: 'GET' }
      );

      if (!rows || !rows.length) {
        return res.status(200).json({
          payload: null,
          updatedAt: null
        });
      }

      return res.status(200).json({
        payload: rows[0].payload,
        updatedAt: rows[0].updated_at
      });
    }

    if (req.method === 'PUT') {
      const incoming =
        typeof req.body === 'string'
          ? JSON.parse(req.body)
          : (req.body || {});

      const payload = incoming.payload;
      const expected = incoming.expectedUpdatedAt || null;

      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({
          error: 'Invalid payload.'
        });
      }

      const currentRows = await sb(
        `${TABLE}?select=key,payload,updated_at&key=eq.main&limit=1`,
        { method: 'GET' }
      );

      const current =
        currentRows && currentRows.length
          ? currentRows[0]
          : null;

      if (
        current &&
        expected &&
        current.updated_at !== expected
      ) {
        return res.status(409).json({
          conflict: true,
          updatedAt: current.updated_at
        });
      }

      if (current) {
        await sb(BACKUPS, {
          method: 'POST',
          body: JSON.stringify({
            state_key: 'main',
            payload: current.payload,
            source_updated_at: current.updated_at,
            reason: incoming.reason || 'update'
          })
        });
      }

      const updatedAt = new Date().toISOString();

      await sb(`${TABLE}?on_conflict=key`, {
        method: 'POST',
        headers: {
          Prefer: 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify({
          key: 'main',
          payload,
          updated_at: updatedAt
        })
      });

      return res.status(200).json({
        ok: true,
        updatedAt
      });
    }

    return res.status(405).json({
      error: 'Method not allowed.'
    });

  } catch (err) {
    console.error('state api error', err);

    return res.status(500).json({
      error: 'Cloud storage operation failed.'
    });
  }
};
