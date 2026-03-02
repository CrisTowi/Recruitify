---
name: migrations
description: Check for pending Supabase migrations and guide the user through running them, either via the CLI or manually in the Supabase dashboard.
---

## Task

Read `supabase/pending_migrations.sql` from the project root.

### If the file is empty or contains only comments/whitespace

Tell the user: **"No pending migrations. The database is up to date."**

### If the file has SQL statements

1. Show the user the full content of `supabase/pending_migrations.sql`.

2. Check whether the Supabase CLI is authenticated by running:
   ```
   supabase projects list
   ```

   **If authenticated (exit code 0):**
   - Show the project ref (it's `efktjvbygrrfmqhtxjax`, extracted from `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`)
   - Show the CLI command to run the SQL directly:
     ```
     supabase db execute --project-ref efktjvbygrrfmqhtxjax --file supabase/pending_migrations.sql
     ```
   - Ask the user if they want you to run it.

   **If NOT authenticated (exit code non-zero):**
   - Tell the user the CLI is not logged in.
   - Give them the direct link to the Supabase SQL editor:
     **https://supabase.com/dashboard/project/efktjvbygrrfmqhtxjax/sql/new**
   - Instruct them to paste and run the SQL shown above.

3. Once the user confirms the migration has been run, **clear `supabase/pending_migrations.sql`** (leave the file but empty its content) so future `/migrations` calls correctly report no pending work.
