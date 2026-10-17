-- Phase 9: the crew's phone shows "From the ground" notes with the author's name.
--
-- A crew member may read only their own profiles row (RLS), so the phone cannot look up the
-- surgeon's display name from uplink_notes.author. Instead the name is copied onto the note when it
-- is written. The trigger always overwrites author_name, so a client cannot sign a note with a
-- made-up name.
--
-- security invoker on purpose: the lookup runs under the inserting surgeon's own RLS, which lets them
-- read only their own profile. A note signed with another user's id finds no name, and the RLS
-- check (author = auth.uid()) refuses it anyway.

alter table public.uplink_notes add column author_name text;

comment on column public.uplink_notes.author_name is
  'Display name of the author, copied from profiles on insert by a trigger. Never set by the client.';

create function private.stamp_note_author()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.author_name := (
    select p.display_name from public.profiles p where p.user_id = new.author
  );
  return new;
end;
$$;

revoke all on function private.stamp_note_author() from public, anon;

create trigger uplink_notes_stamp_author
  before insert on public.uplink_notes
  for each row execute function private.stamp_note_author();

-- Notes written before this migration: same name, filled in once by the owner.
update public.uplink_notes n
set author_name = p.display_name
from public.profiles p
where p.user_id = n.author and n.author_name is null;
