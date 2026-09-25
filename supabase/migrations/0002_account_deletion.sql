-- Ranch Inventory v1 — in-app account deletion
-- Adds a security-definer RPC the signed-in user can call to delete their own
-- account. Deleting the auth.users row cascades to public.ranches (owner_user_id
-- FK) and from there to profiles, locations, animals, protocols, animal_events
-- and maintenance_items.
--
-- Storage photos are removed by the client (src/lib/api.ts `deleteAccount`)
-- through the storage API before this RPC is called.
--
-- auth.users is owned by the locked-down `supabase_auth_admin` role, and the
-- `postgres` role that runs migrations/SQL cannot delete from it (error 42501).
-- postgres IS a (non-inheriting) member of supabase_auth_admin, so we reassign
-- the function's owner to that role; the security-definer function then executes
-- with the privileges needed to delete the auth user.

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

alter function public.delete_account() owner to supabase_auth_admin;
