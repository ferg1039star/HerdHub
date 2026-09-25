-- Ranch Inventory v1 — in-app account deletion
-- Adds a security-definer RPC the signed-in user can call to fully remove their
-- account: storage photos, all ranch data (via ON DELETE CASCADE from the auth
-- user), and the auth.users row itself. The web app cannot delete an auth user
-- or another schema's rows with the anon key, so this runs as the definer.

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  rid uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select ranch_id into rid from public.profiles where id = uid;

  -- Storage objects have no FK to the ranch, so remove them explicitly.
  if rid is not null then
    delete from storage.objects
    where bucket_id = 'animal-photos'
      and (storage.foldername(name))[1] = rid::text;
  end if;

  -- Deleting the auth user cascades to public.ranches (owner_user_id FK) and
  -- from there to profiles, locations, animals, protocols, animal_events and
  -- maintenance_items.
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
