# Recruitify

A personal job search tracker with a Kanban board interface. Track every application, interview stage, timeline event, and contact — all in one place.

## Features

- **Kanban board** — drag cards across columns (Wishlist, Applied, Interviewing, Offer, Rejected, Ghosted)
- **Timeline** — per-company log of notes, contacts, appointments, and status updates
- **Interview roadmap** — ordered stages with completion tracking
- **Interest levels** — mark companies as Excited / Interested / Meh / Not interested
- **Google Calendar sync** — import interview appointments from your calendar
- **Two storage backends** — SQLite (local, zero-config) or Supabase (hosted, multi-device)

---

## Deployment Modes

| Mode | Storage | Auth | Best for |
|---|---|---|---|
| [Local / SQLite](#mode-1-local--self-hosted-sqlite) | Local file | None | Personal laptop use |
| [Self-hosted Supabase](#mode-2-self-hosted-with-supabase) | Your Supabase project | Optional magic-link | Private server / team |
| [Hosted service](#mode-3-hosted-service-invitation-only) | Managed Supabase | Invitation-only | Using recruitify.app |

---

## Mode 1: Local / Self-hosted SQLite

The fastest way to get started. No account, no database setup.

### Prerequisites

- Node.js 18+
- npm / yarn / pnpm / bun

### Steps

```bash
git clone https://github.com/YOUR_USERNAME/recruitify.git
cd recruitify
npm install
```

Create `.env.local`:

```env
STORAGE_MODE=sqlite
# Optional: custom path for the database file (defaults to ./recruitify.db)
# SQLITE_PATH=/data/recruitify.db
```

Run:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Data is stored in `recruitify.db` in the project root.

### Production build (self-hosted)

```bash
npm run build
npm start
```

> **Note:** `better-sqlite3` requires a native build. On platforms that don't support native modules (e.g. Vercel Edge, Cloudflare Workers), use Supabase mode instead.

---

## Mode 2: Self-hosted with Supabase

Use your own Supabase project for persistence and optional authentication.

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project.

### 2. Run the schema

In the Supabase **SQL Editor**, paste and run:

- `supabase/schema.sql` — base schema
- `supabase/migrations/20260301000000_initial_schema.sql` — enums & timeline tables

If you want per-user data isolation with auth (recommended), also run:

- `supabase/migrations/20260306000000_invitations.sql` — invitation gate + user-scoped RLS

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Enable Supabase auth (magic-link login)
SUPABASE_AUTH=true

# Needed for invitation checks (Settings > API > service_role key)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Add invited users

In the Supabase SQL Editor:

```sql
INSERT INTO invitations (email) VALUES ('you@example.com');
```

### 5. Run

```bash
npm install
npm run dev
```

### Without auth (single-user Supabase)

Omit `SUPABASE_AUTH` and `SUPABASE_SERVICE_ROLE_KEY`. All data is shared under the anon key.

---

## Mode 3: Hosted Service (Invitation Only)

The hosted version at **recruitify.app** uses Supabase with invitation-gated magic-link auth. To get access, contact the maintainer for an invitation link.

Once invited:
1. Go to the app URL
2. Enter your email on the login page
3. Click the magic link in the email you receive
4. You're in — your data is isolated to your account

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase mode | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase mode | Public anon key |
| `SUPABASE_AUTH` | Optional | Set to `true` to enable magic-link login |
| `SUPABASE_SERVICE_ROLE_KEY` | Auth mode | Service role key for server-side invitation checks (never exposed to browser) |
| `STORAGE_MODE` | Optional | Set to `sqlite` to use local SQLite instead of Supabase |
| `SQLITE_PATH` | Optional | Custom path for the SQLite database file |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth client ID for calendar sync |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth client secret for calendar sync |

---

## Google Calendar Sync (Optional)

To import interview appointments from Google Calendar:

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable the **Google Calendar API**
3. Create OAuth 2.0 credentials (Web application)
4. Add `http://localhost:3000/api/calendar/google/callback` as an authorized redirect URI
5. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env.local`

---

## Demo Data

To populate the app with realistic demo data (useful for showing the app):

In the Supabase SQL Editor, run `supabase/seed-demo.sql`.

For SQLite mode, set `STORAGE_MODE=sqlite` and run:

```bash
node scripts/seed-demo-sqlite.js
```

---

## Development

```bash
npm install
npm run dev        # start dev server
npm run build      # production build
npm start          # start production server
```

### Project Structure

```
src/
  app/             # Next.js App Router pages and API routes
    api/
      auth/        # Magic-link auth (callback, signout, check-invitation)
      companies/   # Company CRUD API
      calendar/    # Google Calendar sync
    login/         # Login page
  components/      # React components
    KanbanBoard/
    CompanyCard/
    CompanyDetailModal/
    AddCompanyModal/
  lib/
    db/            # Storage adapters (SQLite + Supabase)
  types/           # Shared TypeScript types

supabase/
  schema.sql       # Full Supabase schema
  migrations/      # Incremental migrations
  seed-demo.sql    # Demo data seed
```

---

## Contributing

Contributions are welcome. Please open an issue before submitting a large PR.

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Commit your changes
4. Open a pull request

---

## License

MIT — see [LICENSE](./LICENSE).
