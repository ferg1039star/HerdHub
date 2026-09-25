-- Ranch Inventory v1 — Supabase schema + RLS
-- Source of truth with ranch-inventory-v1-cursor-spec.md
-- Run in the Supabase SQL editor (or supabase db push) before the app writes data.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.ranches (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null default 'My Ranch',
  location_text text,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  ranch_id uuid not null unique references public.ranches (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  ranch_id uuid not null references public.ranches (id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (ranch_id, name)
);

create table if not exists public.animals (
  id uuid primary key default gen_random_uuid(),
  ranch_id uuid not null references public.ranches (id) on delete cascade,
  tag_number text not null,
  species text not null,
  breed text,
  sex text check (sex in ('female', 'male', 'unknown') or sex is null),
  date_of_birth date,
  approx_age_days int check (approx_age_days is null or approx_age_days >= 0),
  dob_precision text not null default 'unknown'
    check (dob_precision in ('exact', 'approximate', 'unknown')),
  status text not null default 'active'
    check (status in ('active', 'sold', 'dead', 'culled', 'missing')),
  location_id uuid references public.locations (id) on delete set null,
  photo_url text,
  notes text,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (ranch_id, tag_number)
);

create table if not exists public.protocols (
  id uuid primary key default gen_random_uuid(),
  ranch_id uuid not null references public.ranches (id) on delete cascade,
  species text not null,
  name text not null,
  trigger_type text not null check (trigger_type in ('age', 'interval', 'both')),
  age_days int check (age_days is null or age_days >= 0),
  interval_days int check (interval_days is null or interval_days > 0),
  notes text,
  created_at timestamptz not null default now(),
  constraint protocols_age_required check (
    trigger_type not in ('age', 'both') or age_days is not null
  ),
  constraint protocols_interval_required check (
    trigger_type not in ('interval', 'both') or interval_days is not null
  )
);

create table if not exists public.animal_events (
  id uuid primary key default gen_random_uuid(),
  ranch_id uuid not null references public.ranches (id) on delete cascade,
  animal_id uuid not null references public.animals (id) on delete cascade,
  protocol_id uuid references public.protocols (id) on delete set null,
  type text not null check (type in ('vaccine', 'treatment', 'check', 'other')),
  event_date date not null,
  product text,
  withdrawal_until date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.maintenance_items (
  id uuid primary key default gen_random_uuid(),
  ranch_id uuid not null references public.ranches (id) on delete cascade,
  title text not null,
  completed_on date,
  due_on date,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists animals_ranch_status_idx on public.animals (ranch_id, status);
create index if not exists animals_ranch_species_idx on public.animals (ranch_id, species);
create index if not exists animals_ranch_location_idx on public.animals (ranch_id, location_id);
create index if not exists animal_events_animal_date_idx on public.animal_events (animal_id, event_date desc);
create index if not exists animal_events_protocol_idx on public.animal_events (protocol_id, event_date desc);
create index if not exists protocols_ranch_species_idx on public.protocols (ranch_id, species);
create index if not exists maintenance_ranch_due_idx on public.maintenance_items (ranch_id, due_on);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.current_ranch_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select ranch_id from public.profiles where id = auth.uid()
$$;

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
    (new_ranch_id, 'Front Trap', 1),
    (new_ranch_id, 'Back Pasture', 2),
    (new_ranch_id, 'Unassigned', 99);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.ranches enable row level security;
alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.animals enable row level security;
alter table public.protocols enable row level security;
alter table public.animal_events enable row level security;
alter table public.maintenance_items enable row level security;

create policy ranches_select_own on public.ranches
  for select using (owner_user_id = auth.uid());
create policy ranches_update_own on public.ranches
  for update using (owner_user_id = auth.uid());
create policy ranches_delete_own on public.ranches
  for delete using (owner_user_id = auth.uid());

create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid());

create policy locations_all_own on public.locations
  for all using (ranch_id = public.current_ranch_id())
  with check (ranch_id = public.current_ranch_id());

create policy animals_all_own on public.animals
  for all using (ranch_id = public.current_ranch_id())
  with check (ranch_id = public.current_ranch_id());

create policy protocols_all_own on public.protocols
  for all using (ranch_id = public.current_ranch_id())
  with check (ranch_id = public.current_ranch_id());

create policy animal_events_all_own on public.animal_events
  for all using (ranch_id = public.current_ranch_id())
  with check (ranch_id = public.current_ranch_id());

create policy maintenance_all_own on public.maintenance_items
  for all using (ranch_id = public.current_ranch_id())
  with check (ranch_id = public.current_ranch_id());

-- ---------------------------------------------------------------------------
-- Storage (optional animal photos)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('animal-photos', 'animal-photos', true)
on conflict (id) do nothing;

create policy animal_photos_select on storage.objects
  for select using (bucket_id = 'animal-photos');

create policy animal_photos_insert_own on storage.objects
  for insert with check (
    bucket_id = 'animal-photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = public.current_ranch_id()::text
  );

create policy animal_photos_update_own on storage.objects
  for update using (
    bucket_id = 'animal-photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = public.current_ranch_id()::text
  );

create policy animal_photos_delete_own on storage.objects
  for delete using (
    bucket_id = 'animal-photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = public.current_ranch_id()::text
  );
