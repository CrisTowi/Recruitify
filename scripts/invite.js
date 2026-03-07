#!/usr/bin/env node
/**
 * Creates an invitation and generates a ready-to-use login link.
 * Usage: npm run invite -- email@example.com
 *
 * What it does:
 *   1. Adds the email to the invitations table
 *   2. Calls the Supabase Admin API to generate a magic login link
 *   3. Prints the link — copy and share it with the user however you like
 *
 * The link expires in 1 hour. If it expires, run the command again.
 *
 * Required in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional:
 *   APP_URL  — the URL users land on after clicking the link
 *              (defaults to http://localhost:3000)
 */

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
    if (key && process.env[key] === undefined) process.env[key] = value;
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

// ── HTTP helper ───────────────────────────────────────────────
function request(urlPath, body) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(urlPath, supabaseUrl);
    const payload = JSON.stringify(body);

    const req = https.request(
      {
        hostname: fullUrl.hostname,
        port: 443,
        path: fullUrl.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Prefer': 'return=minimal',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try { parsed = JSON.parse(data); } catch { parsed = data; }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  // Step 1: add to invitations table
  const invRes = await request('/rest/v1/invitations', { email });

  if (invRes.status === 201 || invRes.status === 200) {
    console.log(`  Added ${email} to invitations`);
  } else if (invRes.status === 409) {
    console.log(`  ${email} is already in the invitations list`);
  } else {
    const msg = invRes.body?.message ?? invRes.body?.error ?? JSON.stringify(invRes.body);
    console.error(`  Failed to save invitation (${invRes.status}): ${msg}`);
    process.exit(1);
  }

  // Step 2: generate a magic login link via Supabase Admin Auth API
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';

  const linkRes = await request('/auth/v1/admin/generate_link', {
    type: 'magiclink',
    email,
    options: { redirect_to: appUrl },
  });

  if (linkRes.status === 200 && linkRes.body?.action_link) {
    console.log('');
    console.log('  Login link (expires in 1 hour):');
    console.log('');
    console.log(' ', linkRes.body.action_link);
    console.log('');
    console.log(`  Share this link with ${email}.`);
    console.log('  They will be signed in immediately when they click it.');
  } else {
    // Admin API may be restricted on some Supabase plans — fall back gracefully
    const msg = linkRes.body?.message ?? linkRes.body?.error ?? `status ${linkRes.status}`;
    console.warn(`\n  Could not generate login link: ${msg}`);
    console.log(`  ${email} has been added to the invitations list.`);
    console.log(`  Ask them to visit the app and enter their email to receive a magic link.`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
