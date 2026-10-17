# Seed the demo users

Somacast needs four demo accounts on the Supabase project `somacast`. Both are demo identities on the
reserved `.test` domain; no real person or real health data is involved.

| Email | Role | Crew | Display name |
|---|---|---|---|
| maya@somacast.test | `crew` | `C1` | Maya |
| kenji@somacast.test | `crew` | `C2` | Kenji |
| daniel@somacast.test | `surgeon` | (none, sees all crews) | Daniel |
| probe@somacast.test | `crew` | `ZZ-TEST` | RLS probe |

On the phone each crew account lives in its own simulated scenario and opens on a demo day
(`apps/mobile/src/config/mission.ts`): Maya, normal, day 89; Kenji, blackout decline, day 75 (Storm).
After sign-in the black box records every day 0..that day, so the ground console gets the whole
mission at the next AOS.

`probe@somacast.test` belongs to the test crew `ZZ-TEST`. Only `scripts/rls-check.mjs` uses it, and every
write the check makes goes to `ZZ-TEST`, never to a real crew. The ground console hides crews starting
with `ZZ-`.

Run the migration first (`npx supabase db push`), so the `profiles` table exists.

## 1. Create the users in the dashboard

1. Open the Supabase dashboard, project **somacast**, then **Authentication → Users**.
2. Click **Add user → Create new user**.
3. Email `maya@somacast.test`, choose a password, and tick **Auto Confirm User** (the `.test` domain
   cannot receive a confirmation email).
4. Repeat for `kenji@somacast.test`, `daniel@somacast.test` and `probe@somacast.test`.
5. Put the four passwords in `scripts/.env` (copy `scripts/.env.example`). That file is git-ignored and is
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
select id, 'crew', 'C2', 'Kenji'
from auth.users where email = 'kenji@somacast.test'
on conflict (user_id) do update
  set role = excluded.role, crew_id = excluded.crew_id, display_name = excluded.display_name;

insert into public.profiles (user_id, role, crew_id, display_name)
select id, 'surgeon', null, 'Daniel'
from auth.users where email = 'daniel@somacast.test'
on conflict (user_id) do update
  set role = excluded.role, crew_id = excluded.crew_id, display_name = excluded.display_name;

insert into public.profiles (user_id, role, crew_id, display_name)
select id, 'crew', 'ZZ-TEST', 'RLS probe'
from auth.users where email = 'probe@somacast.test'
on conflict (user_id) do update
  set role = excluded.role, crew_id = excluded.crew_id, display_name = excluded.display_name;

-- Check: expect four rows.
select u.email, p.role, p.crew_id, p.display_name
from public.profiles p join auth.users u on u.id = p.user_id
order by u.email;
```

## 3. Clean up probes from before ZZ-TEST (one time)

Earlier versions of `rls-check` wrote an uplink note to crew `C1` and used a `C2` fixture row. Neither
is needed now. Run once as the project owner:

```sql
-- The old probe note that Maya's phone would show.
delete from public.uplink_notes
where crew_id <> 'ZZ-TEST' and text = 'RLS check probe (not a medical note)';

-- The old C2 fixture. log_entries is append-only, so the owner lifts the guard for this one
-- statement inside a transaction and puts it straight back.
begin;
alter table public.log_entries disable trigger log_entries_append_only;
delete from public.log_entries where key = 'C2:reading:rls-fixture';
alter table public.log_entries enable trigger log_entries_append_only;
commit;
```

## Resetting the demo ground

`log_entries` is append-only: no policy, privilege or trigger lets anyone update or delete a row, and
the app's **RESET DEMO** button only empties the phone's outbox. To start the emulator demo from 0 rows
again, the project owner can run this in the SQL Editor (a deliberate admin act, not something the app
can do):

```sql
truncate public.log_entries;
-- the next npm run rls-check stores the ZZ-TEST probe row again
```
