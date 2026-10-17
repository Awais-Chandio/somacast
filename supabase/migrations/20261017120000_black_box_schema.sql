-- Somacast ground database (Phase 7).
-- Three tables: who you are (profiles), the black-box log the phone uploads (log_entries),
-- and notes the flight surgeon sends back up (uplink_notes).
-- All data in log_entries is simulated (see docs/limitations). RLS is on for every table.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('crew', 'surgeon')),
  crew_id text null,
  display_name text
);

comment on table public.profiles is
  'One row per account. Seeded by the project owner; users can only read their own row.';

-- The black box. key = the phone''s idempotency key (crewId:kind:id), so a batch that is
-- sent twice is stored once. Append-only: no update/delete policies, privileges or triggers allow edits.
create table public.log_entries (
  key text primary key,
  crew_id text not null,
  kind text not null,
  ts timestamptz not null,
  payload jsonb not null,
  received_at timestamptz default now()
);

comment on table public.log_entries is
  'Black-box log uploaded by the phone at AOS. Append-only. Vitals are simulated.';

create index log_entries_crew_id_idx on public.log_entries (crew_id);

create table public.uplink_notes (
  id uuid primary key default gen_random_uuid(),
  crew_id text not null,
  author uuid references auth.users (id) default auth.uid(),
  text text not null,
  created_at timestamptz default now()
);

comment on table public.uplink_notes is
  'Notes from the flight surgeon to a crew. Decision support only; the surgeon decides.';

create index uplink_notes_crew_id_idx on public.uplink_notes (crew_id);

-- ---------------------------------------------------------------------------
-- Helpers for policies
-- ---------------------------------------------------------------------------
-- A policy on log_entries that reads profiles would run profiles' own RLS each time.
-- These functions run as their owner (security definer), so the lookup skips RLS and cannot recurse.
-- They live in a schema the API does not expose, so they cannot be called as RPCs.
-- search_path is empty, so every name is schema-qualified and cannot be hijacked.

create schema if not exists private;

create function private.my_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.user_id = auth.uid()
$$;

create function private.my_crew_id()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.crew_id from public.profiles p where p.user_id = auth.uid()
$$;

revoke all on schema private from public, anon;
revoke all on function private.my_role() from public, anon;
revoke all on function private.my_crew_id() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.my_role() to authenticated;
grant execute on function private.my_crew_id() to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
-- (select fn()) lets Postgres evaluate the helper once per statement instead of once per row.

alter table public.profiles enable row level security;
alter table public.log_entries enable row level security;
alter table public.uplink_notes enable row level security;

-- profiles: you see only your own row. No insert/update/delete from the app.
create policy "profiles: read own row"
  on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));

-- log_entries: crew write and read only their own crew's log.
create policy "log_entries: crew insert own crew"
  on public.log_entries for insert to authenticated
  with check (
    (select private.my_role()) = 'crew'
    and crew_id = (select private.my_crew_id())
  );

create policy "log_entries: crew read own crew"
  on public.log_entries for select to authenticated
  using (
    (select private.my_role()) = 'crew'
    and crew_id = (select private.my_crew_id())
  );

-- log_entries: the flight surgeon reads every crew's log (read only).
create policy "log_entries: surgeon read all"
  on public.log_entries for select to authenticated
  using ((select private.my_role()) = 'surgeon');

-- uplink_notes: crew read notes for their crew.
create policy "uplink_notes: crew read own crew"
  on public.uplink_notes for select to authenticated
  using (
    (select private.my_role()) = 'crew'
    and crew_id = (select private.my_crew_id())
  );

-- uplink_notes: the surgeon reads all and writes notes signed with their own id.
create policy "uplink_notes: surgeon read all"
  on public.uplink_notes for select to authenticated
  using ((select private.my_role()) = 'surgeon');

create policy "uplink_notes: surgeon insert as self"
  on public.uplink_notes for insert to authenticated
  with check (
    (select private.my_role()) = 'surgeon'
    and author = (select auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Privileges (defence in depth on top of RLS)
-- ---------------------------------------------------------------------------
-- Logged-out callers get nothing. Signed-in callers get only the verbs the policies above use.

revoke all on public.profiles, public.log_entries, public.uplink_notes from anon;
revoke all on public.profiles, public.log_entries, public.uplink_notes from authenticated;
grant select on public.profiles to authenticated;
grant select, insert on public.log_entries to authenticated;
grant select, insert on public.uplink_notes to authenticated;

-- ---------------------------------------------------------------------------
-- Append-only guard
-- ---------------------------------------------------------------------------
-- Even a role that bypasses RLS (service role, dashboard) cannot edit or delete a black-box row.
-- insert ... on conflict do nothing (the phone's upsert) does not fire this trigger.
-- The project owner can still TRUNCATE to reset a demo; that is a deliberate, visible admin act.

create function private.reject_log_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'log_entries is append-only (% blocked)', tg_op
    using errcode = 'insufficient_privilege';
end;
$$;

create trigger log_entries_append_only
  before update or delete on public.log_entries
  for each row execute function private.reject_log_change();

-- ---------------------------------------------------------------------------
-- Duplicate check used by the phone after a sync
-- ---------------------------------------------------------------------------
-- security invoker: runs with the caller's RLS, so crew count only their own crew.
-- key is the primary key, so distinct_keys = total by construction; the check proves it end to end.

create function public.log_counts(p_crew_id text)
returns table (total bigint, distinct_keys bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*), count(distinct l.key)
  from public.log_entries l
  where l.crew_id = p_crew_id
$$;

revoke all on function public.log_counts(text) from public, anon;
grant execute on function public.log_counts(text) to authenticated;
