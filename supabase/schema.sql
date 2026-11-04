-- =============================================================
-- Luz y burbujas Lulú · base de datos (Supabase / Postgres)
-- Supabase → SQL Editor → pega cada parte y toca Run.
-- Todo se puede volver a ejecutar sin duplicar nada.
-- Cada instrucción va en una sola línea y sin comillas anidadas:
-- así el teclado del celular no la altera al pegarla.
-- =============================================================

-- ---------- Parte 1: tablas ----------
-- catalog_items guarda todo el catálogo:
--   kind = 'molds' | 'plates' | 'colors' | 'essences' | 'collections' | 'settings'
--   data = el objeto completo en JSON (ver src/types.ts)
-- admins = correos que pueden editar (cambia el correo por el tuyo).
create table if not exists public.catalog_items (kind text not null, id text not null, data jsonb not null, sort integer not null default 0, updated_at timestamptz not null default now(), primary key (kind, id));
create table if not exists public.admins (email text primary key);
insert into public.admins (email) values ('tu-correo@ejemplo.com') on conflict do nothing;
alter table public.catalog_items enable row level security;
alter table public.admins enable row level security;

-- ---------- Parte 2: permisos del catálogo ----------
-- Cualquiera puede leer el catálogo; solo los correos de admins pueden escribir.
drop policy if exists "admin se ve a si mismo" on public.admins;
create policy "admin se ve a si mismo" on public.admins for select using (email = auth.email());
drop policy if exists "catalogo visible para todos" on public.catalog_items;
create policy "catalogo visible para todos" on public.catalog_items for select using (true);
drop policy if exists "solo admin edita" on public.catalog_items;
create policy "solo admin edita" on public.catalog_items for all using (exists (select 1 from public.admins a where a.email = auth.email())) with check (exists (select 1 from public.admins a where a.email = auth.email()));

-- ---------- Parte 3: espacio para fotos ----------
insert into storage.buckets (id, name, public) values ('catalogo', 'catalogo', true) on conflict (id) do nothing;
drop policy if exists "fotos visibles" on storage.objects;
create policy "fotos visibles" on storage.objects for select using (bucket_id = 'catalogo');
drop policy if exists "admin sube fotos" on storage.objects;
create policy "admin sube fotos" on storage.objects for insert with check (bucket_id = 'catalogo' and exists (select 1 from public.admins a where a.email = auth.email()));
drop policy if exists "admin borra fotos" on storage.objects;
create policy "admin borra fotos" on storage.objects for delete using (bucket_id = 'catalogo' and exists (select 1 from public.admins a where a.email = auth.email()));
