-- Hanger initial schema (SPEC.md §2).
-- Every table belongs to one user and is protected by Row Level Security.

-- ─── Enums ───────────────────────────────────────────────────────────────────
create type public.item_category as enum (
  'top', 'bottom', 'dress', 'outerwear', 'shoes', 'bag', 'accessory'
);
create type public.season as enum ('spring', 'summer', 'autumn', 'winter');
create type public.processing_status as enum ('pending', 'done', 'failed');
create type public.item_status as enum ('active', 'archived');
create type public.wish_decision as enum ('bought', 'skipped');

-- ─── Items ───────────────────────────────────────────────────────────────────
create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  category public.item_category not null,
  name text check (char_length(name) <= 80),
  brand text check (char_length(brand) <= 60),
  size text check (char_length(size) <= 20),
  price_cents integer check (price_cents >= 0),
  currency char(3) not null default 'EUR',
  purchased_at date,
  seasons public.season[] not null default '{}',
  colors text[] not null default '{}' check (cardinality(colors) <= 3),
  colors_edited boolean not null default false,
  photo_path text not null,
  cutout_path text,
  processing_status public.processing_status not null default 'pending',
  status public.item_status not null default 'active',
  source_wish_id uuid
);
create index items_user_idx on public.items (user_id, status, created_at desc);

-- ─── Outfits ─────────────────────────────────────────────────────────────────
create table public.outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 60),
  tags text[] not null default '{}',
  preview_path text
);
create index outfits_user_idx on public.outfits (user_id, created_at desc);

create table public.outfit_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  outfit_id uuid not null references public.outfits (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  x real not null check (x between 0 and 1),
  y real not null check (y between 0 and 1),
  scale real not null default 1 check (scale between 0.2 and 3),
  rotation real not null default 0,
  z_index integer not null default 0
);
create index outfit_items_outfit_idx on public.outfit_items (outfit_id);
create index outfit_items_item_idx on public.outfit_items (item_id);

-- ─── Wishlist ────────────────────────────────────────────────────────────────
create table public.wishes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  category public.item_category not null,
  name text check (char_length(name) <= 80),
  brand text check (char_length(brand) <= 60),
  shop text check (char_length(shop) <= 60),
  url text check (url is null or url ~* '^https?://'),
  price_cents integer check (price_cents >= 0),
  currency char(3) not null default 'EUR',
  photo_path text,
  cutout_path text,
  colors text[] not null default '{}' check (cardinality(colors) <= 3),
  processing_status public.processing_status not null default 'pending',
  cooloff_days smallint not null default 14 check (cooloff_days in (7, 14, 30)),
  decide_at timestamptz not null,
  decision public.wish_decision,
  decided_at timestamptz,
  check ((decision is null) = (decided_at is null))
);
create index wishes_user_idx on public.wishes (user_id, decision, decide_at);

alter table public.items
  add constraint items_source_wish_fk
  foreign key (source_wish_id) references public.wishes (id) on delete set null;

-- decide_at = created_at + cooloff_days (SPEC §5 Cool-off)
create function public.set_wish_decide_at() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.cooloff_days is distinct from old.cooloff_days then
    new.decide_at := new.created_at + make_interval(days => new.cooloff_days);
  end if;
  return new;
end;
$$;
create trigger wishes_decide_at
  before insert or update on public.wishes
  for each row execute function public.set_wish_decide_at();

-- ─── Brand sizes ─────────────────────────────────────────────────────────────
create table public.brand_sizes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  brand text not null check (char_length(brand) between 1 and 60),
  category public.item_category,
  size text not null check (char_length(size) between 1 and 20)
);
create unique index brand_sizes_unique_category
  on public.brand_sizes (user_id, lower(brand), category) where category is not null;
create unique index brand_sizes_unique_any
  on public.brand_sizes (user_id, lower(brand)) where category is null;

-- ─── Wears ───────────────────────────────────────────────────────────────────
create table public.wears (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  item_id uuid not null references public.items (id) on delete cascade,
  worn_on date not null default current_date,
  outfit_id uuid references public.outfits (id) on delete set null,
  unique (item_id, worn_on)
);
create index wears_user_date_idx on public.wears (user_id, worn_on desc);

-- ─── Row Level Security: four policies per table ─────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['items', 'outfits', 'outfit_items', 'wishes', 'brand_sizes', 'wears']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "%1$s_select_own" on public.%1$I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format(
      'create policy "%1$s_insert_own" on public.%1$I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format(
      'create policy "%1$s_update_own" on public.%1$I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format(
      'create policy "%1$s_delete_own" on public.%1$I for delete to authenticated using (user_id = (select auth.uid()))', t);
  end loop;
end;
$$;

-- An outfit may only reference the caller's own items and outfits.
create function public.outfit_item_belongs_to_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.items where id = new.item_id and user_id = new.user_id)
     or not exists (select 1 from public.outfits where id = new.outfit_id and user_id = new.user_id) then
    raise exception 'outfit item must reference your own outfit and item';
  end if;
  return new;
end;
$$;
create trigger outfit_items_owner
  before insert or update on public.outfit_items
  for each row execute function public.outfit_item_belongs_to_user();

create function public.wear_belongs_to_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.items where id = new.item_id and user_id = new.user_id) then
    raise exception 'wear must reference your own item';
  end if;
  return new;
end;
$$;
create trigger wears_owner
  before insert or update on public.wears
  for each row execute function public.wear_belongs_to_user();

-- ─── Storage: private buckets, files under "{user_id}/" ──────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('item-photos', 'item-photos', false, 10485760, array['image/jpeg', 'image/png']),
  ('outfit-images', 'outfit-images', false, 10485760, array['image/png', 'image/jpeg'])
on conflict (id) do nothing;

create policy "own_files_select" on storage.objects for select to authenticated
  using (bucket_id in ('item-photos', 'outfit-images')
         and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own_files_insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('item-photos', 'outfit-images')
              and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own_files_update" on storage.objects for update to authenticated
  using (bucket_id in ('item-photos', 'outfit-images')
         and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own_files_delete" on storage.objects for delete to authenticated
  using (bucket_id in ('item-photos', 'outfit-images')
         and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ─── "Delete all my data" (SPEC §6) ──────────────────────────────────────────
-- Rows cascade from items/outfits/wishes; storage files are removed by the app first.
create function public.delete_my_data() returns void
language sql security invoker as $$
  delete from public.wears where user_id = auth.uid();
  delete from public.outfit_items where user_id = auth.uid();
  delete from public.outfits where user_id = auth.uid();
  delete from public.items where user_id = auth.uid();
  delete from public.wishes where user_id = auth.uid();
  delete from public.brand_sizes where user_id = auth.uid();
$$;
