// Full Supabase backup (read-only — no writes).
// Usage (PowerShell):
//   $env:SIPA_BACKUP_EMAIL = "vous@exemple.ch"
//   $env:SIPA_BACKUP_PASSWORD = "votre-mot-de-passe"
//   node tools/backup-supabase.mjs
// Reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from .env (never printed).
// Writes backups/sipa-full-backup-<stamp>.json (git-ignored).

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const env = {};
  for (const line of readFileSync(join(root, '.env'), 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnv();
const URL = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY;
const EMAIL = process.env.SIPA_BACKUP_EMAIL;
const PASSWORD = process.env.SIPA_BACKUP_PASSWORD;

if (!URL || !ANON) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}
if (!EMAIL || !PASSWORD) {
  console.error('Set SIPA_BACKUP_EMAIL and SIPA_BACKUP_PASSWORD env vars first.');
  process.exit(1);
}

const authRes = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
if (!authRes.ok) {
  console.error('Login failed:', authRes.status, (await authRes.text()).slice(0, 200));
  process.exit(1);
}
const { access_token } = await authRes.json();
const headers = {
  apikey: ANON,
  Authorization: `Bearer ${access_token}`,
};

async function dumpTable(table) {
  const rows = [];
  const page = 1000;
  let from = 0;
  for (;;) {
    const res = await fetch(
      `${URL}/rest/v1/${table}?select=*&order=created_at.asc&limit=${page}&offset=${from}`,
      { headers: { ...headers, Prefer: 'count=exact' } }
    );
    if (!res.ok) return { ok: false, status: res.status, error: (await res.text()).slice(0, 200), rows: [] };
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < page) break;
    from += page;
  }
  return { ok: true, rows };
}

async function listBucket(bucket, prefix = '') {
  const out = [];
  const res = await fetch(`${URL}/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix, limit: 1000 }),
  });
  if (!res.ok) return { ok: false, status: res.status };
  for (const item of await res.json()) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id == null) {
      const sub = await listBucket(bucket, path);
      out.push(...(sub.files || []));
    } else {
      out.push({ path, size: item.metadata?.size ?? null, updated_at: item.updated_at ?? null });
    }
  }
  return { ok: true, files: out };
}

const tables = ['properties', 'analysis', 'comments', 'favorites', 'user_permissions', 'profiles', 'audit_logs', 'invitation_tokens'];
const backup = { exported_at: new Date().toISOString(), tables: {}, storage: {} };

for (const t of tables) {
  const r = await dumpTable(t);
  backup.tables[t] = r.ok ? { count: r.rows.length, rows: r.rows } : { error: `${r.status} ${r.error || ''}`.trim() };
  console.log(`${t}: ${r.ok ? r.rows.length + ' rows' : 'ERROR ' + r.status}`);
}

const bucket = await listBucket('property-files');
backup.storage['property-files'] = bucket.ok ? { count: bucket.files.length, files: bucket.files } : { error: `status ${bucket.status}` };
console.log(`property-files: ${bucket.ok ? bucket.files.length + ' files (metadata only)' : 'ERROR ' + bucket.status}`);

mkdirSync(join(root, 'backups'), { recursive: true });
const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
const file = join(root, 'backups', `sipa-full-backup-${stamp}.json`);
writeFileSync(file, JSON.stringify(backup, null, 2));
console.log('Wrote', file);
