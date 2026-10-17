# Seed the two demo users

Somacast needs two demo accounts on the Supabase project `somacast`. Both are demo identities on the
reserved `.test` domain; no real person or real health data is involved.

| Email | Role | Crew | Display name |
|---|---|---|---|
| maya@somacast.test | `crew` | `C1` | Maya |
| daniel@somacast.test | `surgeon` | (none, sees all crews) | Daniel |

Run the migration first (`npx supabase db push`), so the `profiles` table exists.

## 1. Create the users in the dashboard

1. Open the Supabase dashboard, project **somacast**, then **Authentication → Users**.
2. Click **Add user → Create new user**.
3. Email `maya@somacast.test`, choose a password, and tick **Auto Confirm User** (the `.test` domain
   cannot receive a confirmation email).
4. Repeat for `daniel@somacast.test`.
5. Put both passwords in `scripts/.env` (copy `scripts/.env.example`). That file is git-ignored and is
   read only by `scripts/rls-check.mjs`. The app never stores them; you type them on the sign-in screen.

## 2. Give them roles

Open **SQL Editor** in the dashboard and run this once. It runs as the project owner, which is the
only way to write `profiles` (the app has no insert or update policy on it).

```sql
insert into public.profiles (user_id, role, crew_id, display_name)
select id, 'crew', 'C1', 'Maya'
from auth.users where email = 'maya@somacast.test'
on conflict (user_id) do update
  set role = excluded.role, crew_id = excluded.crew_id, display_name = excluded.display_name;

insert into public.profiles (user_id, role, crew_id, display_name)
select id, 'surgeon', null, 'Daniel'
from auth.users where email = 'daniel@somacast.test'
on conflict (user_id) do update
  set role = excluded.role, crew_id = excluded.crew_id, display_name = excluded.display_name;

-- Check: expect two rows.
select u.email, p.role, p.crew_id, p.display_name
from public.profiles p join auth.users u on u.id = p.user_id
order by u.email;
```

## 3. Optional: a C2 row for the RLS check

`scripts/rls-check.mjs` proves that Maya reads 0 rows of crew `C2`. That proof is stronger when a C2 row
actually exists. Insert one as the project owner (the owner bypasses RLS; Maya cannot do this):

```sql
insert into public.log_entries (key, crew_id, kind, ts, payload)
values ('C2:reading:rls-fixture', 'C2', 'reading', now(), '{"simulated": true, "fixture": "rls-check"}')
on conflict (key) do nothing;
```

## Resetting the demo ground

`log_entries` is append-only: no policy, privilege or trigger lets anyone update or delete a row, and
the app's **RESET DEMO** button only empties the phone's outbox. To start the emulator demo from 0 rows
again, the project owner can run this in the SQL Editor (a deliberate admin act, not something the app
can do):

```sql
truncate public.log_entries;
-- then re-run the optional C2 fixture above
```
