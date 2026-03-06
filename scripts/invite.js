#!/usr/bin/env node
// Usage: npm run invite -- email@example.com

const fs = require('fs');
const path = require('path');
const https = require('https');

// ── Parse .env.local ──────────────────────────────────────────
function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

// ── Validate args ─────────────────────────────────────────────
const email = (process.argv[2] ?? '').trim().toLowerCase();

if (!email || !email.includes('@')) {
  console.error('Usage: npm run invite -- email@example.com');
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Missing env vars. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local'
  );
  process.exit(1);
}

// ── Insert invitation via Supabase REST API ───────────────────
const url = new URL('/rest/v1/invitations', supabaseUrl);

const body = JSON.stringify({ email });

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Prefer': 'return=minimal',
  },
};

const req = https.request(url, options, (res) => {
  let data = '';
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => {
    if (res.statusCode === 201 || res.statusCode === 200) {
      console.log(`Invited: ${email}`);
    } else if (res.statusCode === 409) {
      console.log(`Already invited: ${email}`);
    } else {
      let msg = data;
      try {
        const parsed = JSON.parse(data);
        msg = parsed.message ?? parsed.error ?? data;
      } catch {}
      console.error(`Error (${res.statusCode}): ${msg}`);
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.error('Request failed:', err.message);
  process.exit(1);
});

req.write(body);
req.end();
