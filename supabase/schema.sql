-- =============================================================
-- Luz y burbujas Lulú · base de datos (Supabase / Postgres)
-- Pega este archivo completo en Supabase → SQL Editor → Run.
-- =============================================================

-- Todo el catálogo vive en una sola tabla flexible:
--   kind = 'molds' | 'plates' | 'colors' | 'essences' | 'collections' | 'settings'
--   data = el objeto completo en JSON (ver src/types.ts)
-- Así se pueden agregar campos nuevos sin migraciones.
create table if not exists public.catalog_items (
  kind       text        not null,
  id         text        not null,
  data       jsonb       not null,
  sort       integer     not null default 0,
  updated_at timestamptz not null default now(),
  primary key (kind, id)
);

-- Quién puede editar el catálogo (solo tú, por ahora).
create table if not exists public.admins (
  email text primary key
);

-- ⚠️ Cambia este correo por el tuyo (el mismo con el que crearás el usuario).
insert into public.admins (email) values ('tu-correo@ejemplo.com')
on conflict do nothing;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where email = auth.jwt() ->> 'email');
$$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists catalog_items_touch on public.catalog_items;
create trigger catalog_items_touch before update on public.catalog_items
for each row execute function public.touch_updated_at();

-- Seguridad: cualquiera puede LEER el catálogo; solo la admin puede escribir.
alter table public.catalog_items enable row level security;
alter table public.admins enable row level security;

drop policy if exists "catalogo visible para todos" on public.catalog_items;
create policy "catalogo visible para todos" on public.catalog_items
  for select using (true);

drop policy if exists "solo admin edita" on public.catalog_items;
create policy "solo admin edita" on public.catalog_items
  for all using (public.is_admin()) with check (public.is_admin());

-- Fotos: bucket público para leer, solo la admin sube o borra.
insert into storage.buckets (id, name, public)
values ('catalogo', 'catalogo', true)
on conflict (id) do nothing;

drop policy if exists "fotos visibles" on storage.objects;
create policy "fotos visibles" on storage.objects
  for select using (bucket_id = 'catalogo');

drop policy if exists "admin sube fotos" on storage.objects;
create policy "admin sube fotos" on storage.objects
  for insert with check (bucket_id = 'catalogo' and public.is_admin());

drop policy if exists "admin borra fotos" on storage.objects;
create policy "admin borra fotos" on storage.objects
  for delete using (bucket_id = 'catalogo' and public.is_admin());
