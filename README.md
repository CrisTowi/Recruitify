# Recruitify

A personal job search tracker with a Kanban board interface. Track every application, interview stage, timeline event, contact, and offer — all in one place.

**Features**

- Kanban board — drag cards across columns (Wishlist → Applied → Interviewing → Offer → Rejected → Ghosted)
- Timeline — per-company log of notes, contacts, appointments, and status changes
- Interview roadmap — ordered stages with completion tracking and per-stage notes
- Offer comparison — log compensation details and compare offers side-by-side
- Interest levels — mark companies as Excited / Interested / Meh / Not interested
- Prep notes — save links, resources, and tips per company
- Google Calendar sync — import interview appointments automatically
- Two storage backends — SQLite (local file, zero infrastructure) or Supabase (hosted, multi-device)

---

## Choose your setup

| | [Option A — Run locally](#option-a--run-locally-sqlite) | [Option B — Self-host on Vercel](#option-b--self-host-on-vercel--supabase) | [Option C — Request access](#option-c--request-access-to-the-hosted-app) |
|---|---|---|---|
| **Storage** | Local SQLite file | Your Supabase project | Managed (Supabase) |
| **Auth** | None (single-user) | Optional magic-link | Invitation-only magic-link |
| **Infrastructure** | Your machine only | Vercel + Supabase (free tiers) | None — just request access |
| **Setup time** | ~2 minutes | ~15 minutes | Instant after approval |
| **Best for** | Personal laptop use | Self-hosting, teams | Trying the app without setup |

---

## Option A — Run locally (SQLite)

The fastest way to get started. No account, no database, no internet connection required.

### 1. Clone and install

```bash
git clone https://github.com/CrisTowi/recruitify.git
cd recruitify
npm install
```

### 2. Create `.env.local`

```env
STORAGE_MODE=sqlite
```

That's it. By default the database is created as `recruitify.db` in the project root. To use a different path:

```env
STORAGE_MODE=sqlite
SQLITE_PATH=/Users/you/data/recruitify.db
```

### 3. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Your data lives entirely in the `.db` file — no external services needed.

### (Optional) Load demo data

To populate the board with 15 realistic companies, interview stages, timelines, and 3 sample offers:

```bash
npm run seed-demo
npm run dev
```

### (Optional) Build for production

If you want to run it as a persistent background server on your machine:

```bash
npm run build
npm start
```

> **Note:** `better-sqlite3` uses native Node modules. It works on any standard Node.js server (Linux, macOS, Windows) but is not compatible with Vercel Edge or Cloudflare Workers runtimes — use Option B for those platforms.

---

## Option B — Self-host on Vercel + Supabase

Deploy your own instance to Vercel backed by your own Supabase database. Free tiers on both platforms are sufficient for personal use.

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be ready, then open the **SQL Editor**

### 2. Run the database schema

Run each file below in the SQL Editor **in order**. Copy the contents of each file and click **Run**.

| Order | File | What it does |
|---|---|---|
| 1 | `supabase/migrations/20260301000000_initial_schema.sql` | Base tables (companies, roadmap, timeline, tokens) |
| 2 | `supabase/migrations/20260306000000_invitations.sql` | Invitations table + per-user RLS *(skip if you want no auth)* |
| 3 | `supabase/migrations/20260306000001_company_prep_notes.sql` | Prep notes column |
| 4 | `supabase/migrations/20260306000002_stage_notes.sql` | Per-stage notes column |
| 5 | `supabase/migrations/20260306000003_offers.sql` | Offer details table |

> **Skip migration 2** if you want a simpler single-user setup with no login screen. In that case also omit `SUPABASE_AUTH` and `SUPABASE_SERVICE_ROLE_KEY` below.

### 3. Get your Supabase credentials

In your Supabase project, go to **Settings → API**:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon / public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` *(only needed if using auth)*

The service role key looks like a long JWT starting with `eyJ...`. Keep it secret — never expose it to the browser or commit it to git.

### 4. Fork and deploy to Vercel

1. Fork this repository on GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your fork
3. During setup, add these **Environment Variables**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Include these only if you want invitation-gated magic-link login:
SUPABASE_AUTH=true
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

4. Click **Deploy**. Vercel will build and publish your app automatically.

### 5. Add your first user (if using auth)

After deploying, add yourself as an invited user. You can do this two ways:

**Option 1 — SQL Editor:**
```sql
INSERT INTO invitations (email) VALUES ('you@example.com');
```

**Option 2 — CLI script** (from your local clone):
```bash
npm run invite -- you@example.com
```

Then visit your deployed app URL, enter your email, and click the magic link you receive.

### 6. Invite additional users

Each person who needs access requires an entry in the `invitations` table:

```bash
npm run invite -- friend@example.com
```

### Without auth (simpler single-user mode)

If you skipped migration 2 and omitted `SUPABASE_AUTH`, the app runs without a login screen. All data is stored under the shared anon key — suitable for a private deployment only you can access (e.g. behind a Vercel password or private URL).

---

## Option C — Request access to the hosted app

The hosted version uses invitation-only magic-link authentication. To get access:

1. **Open an issue** on this repository titled `"Access request: your@email.com"`, or
2. **Email the maintainer** directly (contact details in the GitHub profile)

Once your email is added to the invitation list:

1. Go to the app URL shared with you
2. Enter your email on the login page and click **Send magic link**
3. Open your inbox and click the link in the email — no password needed
4. You're in. Your data is fully isolated from other users

---

## Environment Variables Reference

| Variable | Required for | Description |
|---|---|---|
| `STORAGE_MODE` | SQLite mode | Set to `sqlite` to use a local database file |
| `SQLITE_PATH` | SQLite mode | Custom path for the `.db` file (default: `./recruitify.db`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase mode | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase mode | Public anon key (safe to expose) |
| `SUPABASE_AUTH` | Auth mode | Set to `true` to enable magic-link login + invitation checks |
| `SUPABASE_SERVICE_ROLE_KEY` | Auth mode | Service role key for server-side invitation checks — **never expose to the browser** |
| `GOOGLE_CLIENT_ID` | Calendar sync | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Calendar sync | Google OAuth client secret |

---

## Google Calendar Sync (Optional)

To automatically import interview appointments from your Google Calendar:

1. Go to [Google Cloud Console](https://console.cloud.google.com) and create a project
2. Enable the **Google Calendar API**
3. Create **OAuth 2.0 credentials** (type: Web application)
4. Add your app URL + `/api/auth/google/callback` as an authorized redirect URI
5. Add to `.env.local`:

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

---

## Demo Data

Populate the board with 15 realistic companies across all statuses, interview roadmaps, timeline events, and sample offers for Netflix, Stripe, and Shopify:

**SQLite:**
```bash
npm run seed-demo
```

**Supabase:** Run `supabase/seed-demo.sql` in the SQL Editor.

---

## Development

```bash
npm install
npm run dev        # dev server at http://localhost:3000
npm run build      # production build
npm start          # start production server
npm run invite -- email@example.com   # add an invited user (Supabase auth only)
npm run seed-demo                      # populate demo data (SQLite only)
```

### Project Structure

```
src/
  app/
    api/
      auth/          # magic-link auth (callback, signout, check-invitation)
      companies/     # company CRUD + roadmap, timeline, offer routes
      compare/       # offer comparison endpoint
    compare/         # /compare page
    login/           # login page
  components/
    KanbanBoard/
    CompanyCard/
    CompanyDetailModal/
    AddCompanyModal/
    OfferModal/
  lib/
    db/              # DbAdapter interface + SQLite and Supabase implementations
  types/             # shared TypeScript types

supabase/
  migrations/        # incremental schema migrations (run in order for fresh setup)
  seed-demo.sql      # demo data for Supabase
  pending_migrations.sql  # tracks unapplied migrations for existing deployments

scripts/
  invite.js          # CLI to add invited users
  seed-demo-sqlite.js # demo data seeder for SQLite
```

---

## License

MIT — see [LICENSE](./LICENSE).
