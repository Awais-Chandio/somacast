-- public.rls_auto_enable() is created by Supabase (not by our schema migration). It is the
-- security definer function behind the event trigger "ensure_rls" (ddl_command_end), which turns
-- on RLS for every new table. It was executable by PUBLIC, anon and authenticated, so the
-- security advisor flags it as an exposed security definer function.
--
-- API roles never need to call it. The event trigger keeps working: Postgres checks EXECUTE on a
-- trigger function when the trigger is created, not each time it fires. postgres (owner) and
-- service_role keep their grants.

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
