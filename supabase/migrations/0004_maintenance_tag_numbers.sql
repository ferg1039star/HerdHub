-- Ranch Inventory v1 — maintenance item tag numbers (unique per ranch)
-- Run this in the Supabase SQL editor (cloud/local app will not apply it automatically).

alter table public.maintenance_items
  add column if not exists tag_number text;

with numbered as (
  select
    id,
    lpad(
      row_number() over (partition by ranch_id order by created_at asc, id asc)::text,
      3,
      '0'
    ) as next_tag
  from public.maintenance_items
  where tag_number is null
)
update public.maintenance_items m
set tag_number = numbered.next_tag
from numbered
where m.id = numbered.id;

alter table public.maintenance_items
  alter column tag_number set not null;

create unique index if not exists maintenance_items_ranch_tag_idx
  on public.maintenance_items (ranch_id, tag_number);
