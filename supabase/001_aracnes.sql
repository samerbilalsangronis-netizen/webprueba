-- Ejecutar una vez en el SQL Editor del proyecto de Supabase de ARACNES.
-- Se puede volver a ejecutar para reponer estas políticas sin borrar datos.
begin;
create schema if not exists aracnes_private;
revoke all on schema aracnes_private from public, anon, authenticated;
create table if not exists aracnes_private.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table aracnes_private.admins enable row level security;
revoke all on aracnes_private.admins from public, anon, authenticated;

create or replace function public.is_aracnes_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from aracnes_private.admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_aracnes_admin() from public, anon;
grant execute on function public.is_aracnes_admin() to authenticated;

create table if not exists public.aracnes_products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  description text not null default '' check (char_length(description)<=2000),
  category text not null check (category in ('Mujer','Hombre','Accesorios')),
  price numeric(8,2) check (price>=0 and price<=999999.99),
  sizes text[] not null check (cardinality(sizes) between 1 and 30),
  colors text[] not null default '{}' check (cardinality(colors)<=20),
  image_paths text[] not null check (cardinality(image_paths) between 1 and 6),
  in_stock boolean not null default true,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists aracnes_products_status_created_idx on public.aracnes_products(status,created_at desc);
create or replace function aracnes_private.stamp_product()
returns trigger language plpgsql set search_path = '' as $$ begin
  new.updated_at = clock_timestamp();
  return new;
end; $$;
drop trigger if exists aracnes_product_stamp on public.aracnes_products;
create trigger aracnes_product_stamp before update on public.aracnes_products for each row execute function aracnes_private.stamp_product();
alter table public.aracnes_products enable row level security;
revoke all on public.aracnes_products from public, anon, authenticated;
grant select on public.aracnes_products to anon, authenticated;
grant insert,update on public.aracnes_products to authenticated;
-- No se concede DELETE: las prendas se archivan y se pueden recuperar.
drop policy if exists aracnes_public_read on public.aracnes_products;
create policy aracnes_public_read on public.aracnes_products for select to anon,authenticated using (status='published');
drop policy if exists aracnes_admin_read on public.aracnes_products;
create policy aracnes_admin_read on public.aracnes_products for select to authenticated using ((select public.is_aracnes_admin()));
drop policy if exists aracnes_admin_insert on public.aracnes_products;
create policy aracnes_admin_insert on public.aracnes_products for insert to authenticated with check ((select public.is_aracnes_admin()));
drop policy if exists aracnes_admin_update on public.aracnes_products;
create policy aracnes_admin_update on public.aracnes_products for update to authenticated using ((select public.is_aracnes_admin())) with check ((select public.is_aracnes_admin()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('aracnes-products','aracnes-products',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
-- Solo fotos de productos: las URL de este bucket son públicas, incluso en borradores.
drop policy if exists aracnes_photo_insert on storage.objects;
create policy aracnes_photo_insert on storage.objects for insert to authenticated with check (
  bucket_id='aracnes-products' and (select public.is_aracnes_admin()) and (storage.foldername(name))[1]=(select auth.uid()::text)
);
drop policy if exists aracnes_photo_admin_read on storage.objects;
create policy aracnes_photo_admin_read on storage.objects for select to authenticated using (bucket_id='aracnes-products' and (select public.is_aracnes_admin()));
drop policy if exists aracnes_photo_delete on storage.objects;
create policy aracnes_photo_delete on storage.objects for delete to authenticated using (bucket_id='aracnes-products' and (select public.is_aracnes_admin()));
commit;
