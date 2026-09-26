-- Ranch Inventory v1 — default location seed + migrate existing ranches
-- Run this in the Supabase SQL editor (cloud/local app will not apply it automatically).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_ranch_id uuid;
begin
  insert into public.ranches (owner_user_id, name)
  values (new.id, 'My Ranch')
  returning id into new_ranch_id;

  insert into public.profiles (id, ranch_id)
  values (new.id, new_ranch_id);

  insert into public.locations (ranch_id, name, sort_order)
  values
    (new_ranch_id, 'Back Pasture', 1),
    (new_ranch_id, 'Pen 1', 2),
    (new_ranch_id, 'Coop A', 3);

  return new;
end;
$$;

-- Migrate existing ranches: Back Pasture, Pen 1, Coop A; retire Front Trap & Unassigned.
do $$
declare
  r record;
  back_id uuid;
begin
  for r in select id from public.ranches loop
    select id into back_id
    from public.locations
    where ranch_id = r.id and name = 'Back Pasture'
    limit 1;

    if back_id is null then
      insert into public.locations (ranch_id, name, sort_order)
      values (r.id, 'Back Pasture', 1)
      returning id into back_id;
    else
      update public.locations set sort_order = 1 where id = back_id;
    end if;

    insert into public.locations (ranch_id, name, sort_order)
    values (r.id, 'Pen 1', 2)
    on conflict (ranch_id, name) do update set sort_order = 2;

    insert into public.locations (ranch_id, name, sort_order)
    values (r.id, 'Coop A', 3)
    on conflict (ranch_id, name) do update set sort_order = 3;

    update public.animals a
    set location_id = back_id
    from public.locations l
    where a.ranch_id = r.id
      and a.location_id = l.id
      and l.name in ('Front Trap', 'Unassigned');

    delete from public.locations
    where ranch_id = r.id and name in ('Front Trap', 'Unassigned');
  end loop;
end;
$$;
