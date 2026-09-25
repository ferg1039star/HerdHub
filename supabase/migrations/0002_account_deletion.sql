-- Ranch Inventory v1 — in-app account deletion
-- Adds a security-definer RPC the signed-in user can call to delete their own
-- account. Deleting the auth.users row cascades to public.ranches (owner_user_id
-- FK) and from there to profiles, locations, animals, protocols, animal_events
-- and maintenance_items.
--
-- Storage photos are removed by the client (src/lib/api.ts `deleteAccount`)
-- through the Storage API before this RPC is called. The function deliberately
-- does NOT delete from storage.objects: Supabase blocks direct deletes on
-- storage tables (42501, "Direct deletion from storage tables is not allowed").
--
-- The function runs as its owner (postgres) via SECURITY DEFINER. postgres has
-- DELETE privilege on auth.users, so the account row is removed. (No owner
-- reassignment is needed — postgres is not a member of supabase_auth_admin.)

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
