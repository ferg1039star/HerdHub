-- Ranch Inventory v1 — maintenance location, created_on, performed-work log
-- Run this in the Supabase SQL editor (cloud/local app will not apply it automatically).

alter table public.maintenance_items
  add column if not exists location_id uuid references public.locations (id) on delete set null;

alter table public.maintenance_items
  add column if not exists created_on date;

update public.maintenance_items
set created_on = created_at::date
where created_on is null;

alter table public.maintenance_items
  alter column created_on set default current_date;

alter table public.maintenance_items
  alter column created_on set not null;

create table if not exists public.maintenance_log (
  id uuid primary key default gen_random_uuid(),
  ranch_id uuid not null references public.ranches (id) on delete cascade,
  maintenance_id uuid not null references public.maintenance_items (id) on delete cascade,
  performed_on date not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists maintenance_log_ranch_performed_idx
  on public.maintenance_log (ranch_id, performed_on desc);

create index if not exists maintenance_log_maintenance_idx
  on public.maintenance_log (maintenance_id, performed_on desc);

insert into public.maintenance_log (ranch_id, maintenance_id, performed_on)
select ranch_id, id, completed_on
from public.maintenance_items
where completed_on is not null
  and not exists (
    select 1 from public.maintenance_log ml
    where ml.maintenance_id = maintenance_items.id
      and ml.performed_on = maintenance_items.completed_on
  );

do $$
declare
  r record;
  loc_id uuid;
begin
  for r in select id from public.ranches loop
    select id into loc_id
    from public.locations
    where ranch_id = r.id and name = 'Back Pasture'
    limit 1;

    if loc_id is null then
      select id into loc_id
      from public.locations
      where ranch_id = r.id
      order by sort_order asc, name asc
      limit 1;
    end if;

    update public.maintenance_items
    set location_id = loc_id
    where ranch_id = r.id and location_id is null;
  end loop;
end;
$$;

alter table public.maintenance_log enable row level security;

create policy maintenance_log_all_own on public.maintenance_log
  for all using (ranch_id = public.current_ranch_id())
  with check (ranch_id = public.current_ranch_id());
